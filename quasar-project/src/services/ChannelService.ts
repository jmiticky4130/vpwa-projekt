import type { RawMessage, SerializedMessage } from "src/contracts";
import type { BootParams } from "./SocketManager";
import { SocketManager } from "./SocketManager";
import { useMessageStore } from "src/stores/message-store";

// creating instance of this class automatically connects to given socket.io namespace
// subscribe is called with boot params, so you can use it to dispatch actions for socket events
// you have access to socket.io socket using this.socket
class ChannelSocketManager extends SocketManager {
  // Ensure the namespace socket is connected before emitting any events
  private async ensureConnected(): Promise<void> {
    const s = this.socket
    if (s.connected) return
    await new Promise<void>((resolve) => {
      const onConnect = () => {
        s.off('connect', onConnect)
        resolve()
      }
      s.on('connect', onConnect)
      try { s.connect() } catch { /* noop */ }
    })
  }
  public subscribe(params: BootParams): void {
    const channel = this.namespace.split("/").pop() as string;
    const messageStore = useMessageStore();
    // Reference params to satisfy lint rules (kept for API compatibility)
    if (params && params.app) {
      // no-op
    }
    this.socket.on("message", (message: SerializedMessage) => {
      messageStore.addIncomingMessage(channel, message);
    });
  }

  public addMessage(message: RawMessage): Promise<SerializedMessage> {
    return (async () => {
      await this.ensureConnected()
      return this.emitAsync("addMessage", message)
    })()
  }

  public loadMessages(): Promise<SerializedMessage[]> {
    return (async () => {
      await this.ensureConnected()
      return this.emitAsync("loadMessages")
    })()
  }
}

class ChannelService {
  private channels: Map<string, ChannelSocketManager> = new Map();

  public join(name: string): ChannelSocketManager {
    if (this.channels.has(name)) {
      throw new Error(`User is already joined in channel "${name}"`);
    }

    // connect to given channel namespace
    const channel = new ChannelSocketManager(`/channels/${name}`);
    this.channels.set(name, channel);
    return channel;
  }

  public leave(name: string): boolean {
    const channel = this.channels.get(name);

    if (!channel) {
      return false;
    }

    // disconnect namespace and remove references to socket
    channel.destroy();
    return this.channels.delete(name);
  }

  public in(name: string): ChannelSocketManager | undefined {
    return this.channels.get(name);
  }
}

export default new ChannelService();