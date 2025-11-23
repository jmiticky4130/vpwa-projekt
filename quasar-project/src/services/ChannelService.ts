import type { RawMessage, SerializedMessage } from "src/contracts";
import type { BootParams } from "./SocketManager";
import { SocketManager } from "./SocketManager";
import { useMessageStore } from "src/stores/message-store";
import { api } from "src/boot/axios";
import { usePresenceStore } from "src/stores/presence-store";
import { useAuthStore } from "src/stores/auth-store";
import { useInviteStore } from "src/stores/invite-store";

// creating instance of this class automatically connects to given socket.io namespace
// subscribe is called with boot params, so you can use it to dispatch actions for socket events
// you have access to socket.io socket using this.socket
class UserSocketManager extends SocketManager {
  public subscribe(): void {
    const inviteStore = useInviteStore();
    
    this.socket.on("invite:new", () => {
      console.log(`[user-socket] Received new invite notification`)
      void inviteStore.refresh()
    });
  }
}

class ChannelSocketManager extends SocketManager {
  public subscribe(params: BootParams): void {
    const channel = this.namespace.split("/").pop() as string;
    const messageStore = useMessageStore();
    const presence = usePresenceStore();
    // const inviteStore = useInviteStore();
    // Reference params to satisfy lint rules (kept for API compatibility)
    if (params && params.app) {
      // no-op
    }
    // Auto-emit online when socket connects (if not in offline mode)
    this.socket.on("connect", () => {
      const auth = useAuthStore();
      const current = auth.user?.status ?? 'online'
      if (current !== 'offline') {
        console.log(`[channel-socket] ${this.namespace} connected; emitting setStatus('${current}')`)
        this.socket.emit('setStatus', current);
      }
    });

    // De-duplicate handlers in case of HMR or accidental multiple subscribe calls
    this.socket.off('message');
    this.socket.off('myStatus');
    this.socket.off('allStatuses');
    //this.socket.off('invite:new');

    this.socket.on("message", async (message: SerializedMessage) => {
      await messageStore.addIncomingMessage(channel, message);
    });

    this.socket.on("myStatus", (payload: { userId: number; status: 'online'|'dnd'|'offline' }) => {
      const auth = useAuthStore();
      if (auth.user && payload.userId === auth.user.id) {
        // Ignore self updates; UI derives own status from auth store
        return;
      }
      console.log(`[channel-socket] Received myStatus for user ${payload.userId}: ${payload.status} (ns ${this.namespace})`)
      presence.set(payload.userId, payload.status);
    });
  }

  public addMessage(message: RawMessage): Promise<SerializedMessage> {
    return this.emitAsync("addMessage", message);
  }
}

class ChannelService {
  private channels: Map<string, ChannelSocketManager> = new Map();

  public joined(): string[] {
    return Array.from(this.channels.keys());
  }

  public join(name: string): ChannelSocketManager {
    if (this.channels.has(name)) {
      throw new Error(`User is already joined in channel "${name}"`);
    }

    // connect to given channel namespace
    const channel = new ChannelSocketManager(`/channels/${name}`);
    this.channels.set(name, channel);
    console.log(`[ChannelService] Joined channel: ${name} ${channel.namespace}`);
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

  public leaveAll(): void {
    this.channels.forEach((_, name) => {
      this.leave(name);
    });
  }

  public in(name: string): ChannelSocketManager | undefined {
    return this.channels.get(name);
  }

  public async fetchMessages(channelName: string, skip = 0, limit = 20): Promise<{ messages: SerializedMessage[]; total: number }> {
    const response = await api.get<{ messages: SerializedMessage[]; total: number }>('/messages/get', {
      params: { channelName, skip, limit }
    });
    return response.data;
  }

  public connectUserSocket(userId: number): void {
    new UserSocketManager(`/users/${userId}`);
  }
}

export default new ChannelService();