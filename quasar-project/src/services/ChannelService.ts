import type { RawMessage, SerializedMessage } from "src/contracts";
import { SocketManager } from "./SocketManager";
import { useMessageStore } from "src/stores/message-store";
import { api } from "src/boot/axios";
import { usePresenceStore } from "src/stores/presence-store";
import { useAuthStore } from "src/stores/auth-store";
import { useInviteStore } from "src/stores/invite-store";
import { useChannelStore } from "src/stores/channel-store";
import { useTypingStore } from "src/stores/typing-store";
import { useNotify } from "src/util/notification";


// vacsina kodu v tomto subore je prevzata z cvicenia
class UserSocketManager extends SocketManager {
  public subscribe(): void {
    const inviteStore = useInviteStore();
    
    this.socket.on("invite:new", () => {
      console.log(`[user-socket] Received new invite notification`)
      void inviteStore.refresh()
    });

    this.socket.on("force_logout", async () => {
      console.log("[user-socket] Received force_logout");
      const authStore = useAuthStore();
      const { useNotify } = await import('src/util/notification');
      const { authManager } = await import('src/services');

      authManager.removeToken();
      authStore.user = null;
      
      const { useMessageStore } = await import('src/stores/message-store');
      useMessageStore().reset();

      const { default: ChannelServiceInstance } = await import('src/services/ChannelService');
      ChannelServiceInstance.disconnectUserSocket();
      ChannelServiceInstance.leaveAll();
      
      useNotify().notifyForceLogout();
      window.location.href = '/#/login';
      window.location.reload();
    });
  }
}

class ChannelSocketManager extends SocketManager {
  public subscribe(): void {
    const channel = this.namespace.split("/").pop() as string;
    const messageStore = useMessageStore();
    const presence = usePresenceStore();
    const channelStore = useChannelStore();
    const typingStore = useTypingStore();

    this.socket.on("connect", () => {
      const auth = useAuthStore();
      const current = auth.user?.status ?? 'online'
      if (current !== 'offline') {
        console.log(`[channel-socket] ${this.namespace} connected; emitting setStatus('${current}')`)
        this.socket.emit('setStatus', current);
      }
    });

    this.socket.off('message');
    this.socket.off('myStatus');
    this.socket.off('allStatuses');
    this.socket.off('channel:members_updated');
    this.socket.off('channel:kicked');
    this.socket.off('channel:revoked');
    this.socket.off('channel:updated');
    this.socket.off('user:typing:stop');
    this.socket.off('user:typing:content');

    this.socket.on("message", async (message: SerializedMessage) => {
      await messageStore.addIncomingMessage(channel, message);
    });

    this.socket.on("channel:members_updated", () => {
      console.log(`[channel-socket] Members updated for ${channel}`);
      channelStore.incrementMembersVersion(channel);
    });

    this.socket.on("channel:kicked", (payload: { userId: number }) => {
      const auth = useAuthStore();
      if (auth.user && auth.user.id === payload.userId) {
        console.log(`[channel-socket] I was kicked from ${channel}`);
        channelStore.removeChannelLocal(channel);
        useNotify().notifyKickedByAdmin(channel);
      }
    });

    this.socket.on("channel:revoked", (payload: { userId: number }) => {
      const auth = useAuthStore();
      if (auth.user && auth.user.id === payload.userId) {
        console.log(`[channel-socket] My access was revoked from ${channel}`);
        channelStore.removeChannelLocal(channel);
        useNotify().notifyRevokedAccess(channel);
      }
    });

    this.socket.on("channel:updated", (payload: { public: boolean }) => {
      console.log(`[channel-socket] Channel ${channel} updated:`, payload);
      const ch = channelStore.findByName(channel);
      if (ch) {
        ch.public = payload.public;
      }
    });

    this.socket.on("channel:deleted", () => {
      console.log(`[channel-socket] Channel ${channel} was deleted`);
      channelStore.removeChannelLocal(channel);
      useNotify().notifyChannelDeleted(channel, false);
    });

    this.socket.on("allStatuses", (statuses: Array<{ userId: number; status: 'online'|'dnd'|'offline' }>) => {
      console.log(`[channel-socket] Received allStatuses for ${statuses.length} users (ns ${this.namespace})`)
      statuses.forEach(s => presence.set(s.userId, s.status));
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

    this.socket.on("user:typing:stop", (payload: { userId: number }) => {
      typingStore.removeTyping(channel, payload.userId);
    });

    this.socket.on("user:typing:content", (payload: { userId: number; nickname: string; content: string }) => {
      typingStore.setTyping(channel, payload.userId, payload.nickname);
      typingStore.setTypingContent(channel, payload.userId, payload.content);
    });
  }

  public addMessage(message: RawMessage): Promise<SerializedMessage> {
    return this.emitAsync("addMessage", message);
  }

  public sendTypingStop(): void {
    this.socket.emit("typing:stop");
  }

  public sendTypingContent(content: string): void {
    this.socket.emit("typing:content", content);
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
    // Check if already connected to avoid duplicates
    const ns = `/users/${userId}`;
    if (this.userSocket) {
      this.userSocket.destroy();
      this.userSocket = null;
    }
    this.userSocket = new UserSocketManager(ns);
  }

  public disconnectUserSocket(): void {
    if (this.userSocket) {
      this.userSocket.destroy();
      this.userSocket = null;
    }
  }

  private userSocket: UserSocketManager | null = null;
}

export default new ChannelService();