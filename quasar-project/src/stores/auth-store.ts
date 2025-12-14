import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService, authManager } from 'src/services'
import type { User, LoginCredentials, RegisterData, ApiToken } from 'src/contracts'
import ChannelService from 'src/services/ChannelService'

export type AuthStatus = 'pending' | 'success' | 'error'

export interface AuthError {
  message: string
  field?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const status = ref<AuthStatus>('success')
  const errors = ref<AuthError[]>([])

  const isAuthenticated = computed(() => user.value !== null)
  const loading = computed(() => status.value === 'pending')

  function AUTH_START(): void {
    status.value = 'pending'
    errors.value = []
  }

  function AUTH_SUCCESS(userData: User | null): void {
    status.value = 'success'
    if (userData) {
      user.value = {
        ...userData,
        status: userData.status ?? 'online',
        showOnlyDirectedMessages: userData.showOnlyDirectedMessages ?? false,
        newchannels: Array.isArray(userData.newchannels) ? userData.newchannels : [],
      }
    } else {
      user.value = null
    }
  }
  function AUTH_ERROR(err: unknown): void {
    status.value = 'error'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any

    if (Array.isArray(err)) {
      errors.value = err.filter(
        (e): e is AuthError =>
          typeof e === 'object' && e !== null && 'message' in e
      )
    } else if (anyErr?.response?.data?.error) {
      errors.value = [{ message: anyErr.response.data.error }]
    } else if (err instanceof Error) {
      errors.value = [{ message: err.message }]
    } else {
      errors.value = [{ message: 'Unknown error' }]
    }
  }

  async function connectToMemberChannels(): Promise<void> {
    try {
      const { useChannelStore } = await import('./channel-store')
      const channelStore = useChannelStore()
      
      // fetch latest channel list
      await channelStore.refresh()
      
      if (channelStore.error) {
        console.error('[auth] Channel store refresh failed:', channelStore.error)
      }

      // get channels user is member of
      const memberChannels = channelStore.list()
      console.log(`[auth] Found ${memberChannels.length} member channels to connect`)
      
      // join socket for each channel
      for (const channel of memberChannels) {
        const key = channel.name.toLowerCase()
        
        let manager = ChannelService.in(key)
        if (!manager) {
          manager = ChannelService.join(key)
          console.log(`[auth] Auto-connected to channel: ${key}`)
        } else {
          console.log(`[auth] Already joined channel: ${key}`)
        }

        // ensure socket is connected
        if (manager && !manager.socket.connected) {
           console.log(`[auth] Socket not connected for ${key}, connecting...`)
           manager.socket.connect()
        }
      }
    } catch (err: unknown) {
      console.warn('[auth] Failed to auto-connect to channels:', err)
    }
  }

  async function check(): Promise<boolean> {
    try {
      AUTH_START()
      const userData = await authService.me(true)
      AUTH_SUCCESS(userData)
      
      // Auto-connect to all member channels after user is authenticated
      if (userData !== null) {
        await connectToMemberChannels()
        // Connect to private user namespace for invites
        ChannelService.connectUserSocket(userData.id)
      }
      
      return userData !== null
    } catch (err: unknown) {
      AUTH_ERROR(err)
      throw err
    }
  }

  async function register(form: RegisterData): Promise<User> {
    try {
      AUTH_START()
      const userData = await authService.register(form)
      AUTH_SUCCESS(null)
      return userData
    } catch (err: unknown) {
      AUTH_ERROR(err)
      throw err
    }
  }

  async function login(credentials: LoginCredentials): Promise<ApiToken> {
    try {
      AUTH_START()
      const apiToken = await authService.login(credentials)
      AUTH_SUCCESS(null)
      authManager.setToken(apiToken.token)
      return apiToken
    } catch (err: unknown) {
      AUTH_ERROR(err)
      throw err
    }
  }

  async function logout(): Promise<void> {
    try {
      AUTH_START()
      await authService.logout()
      AUTH_SUCCESS(null)
      authManager.removeToken()
      
      // Clean up all message store sockets
      const { useMessageStore } = await import('./message-store')
      const { useChannelStore } = await import('./channel-store')
      const { useInviteStore } = await import('./invite-store')
      const { usePresenceStore } = await import('./presence-store')

      const ms = useMessageStore()
      const channelStore = useChannelStore()
      const inviteStore = useInviteStore()
      const presenceStore = usePresenceStore()

      console.log('[auth] Logging out, disconnecting all sockets and resetting stores');
      ChannelService.leaveAll()
      ChannelService.disconnectUserSocket()
      
      ms.reset()
      channelStore.reset()
      inviteStore.reset()
      presenceStore.reset()
      console.log('[auth] Stores reset: messages, channels, invites, presence')
    } catch (err: unknown) {
      AUTH_ERROR(err)
      throw err
    }
  }

  function setStatus(newStatus: "online" | "offline" | "dnd"): void {
    if (user.value) {
      const oldStatus = user.value.status;
      console.log('[auth] Setting status to', newStatus);
      user.value.status = newStatus;

      // Broadcast status change to all connected channels
      void (async () => {
        try {
          if (oldStatus === 'offline' && newStatus !== 'offline') {
             await connectToMemberChannels()
             const { useMessageStore } = await import('./message-store')
             const ms = useMessageStore()
             await ms.flushAllOfflineQueues()
             for (const ch of ms.joinedChannels) {
               await ms.revalidateChannel(ch)
             }
          }

          for (const ch of ChannelService.joined()) {
            const manager = ChannelService.in(ch)
            if (manager) {
              console.log(`[auth] Emitting setStatus('${newStatus}') to channel ${ch}`)
              manager.socket.emit('setStatus', newStatus)
            }
          }
        } catch (e) {
          console.warn('[auth] Failed to broadcast status change', e)
        }
      })()
    }
  }

  function setShowOnlyDirectedMessages(showOnly: boolean): void {
    if (user.value) {
      console.log('[auth] Setting showOnlyDirectedMessages to', showOnly);
      user.value.showOnlyDirectedMessages = showOnly;
    }
  }

  return {
    user,
    status,
    errors,
    isAuthenticated,
    loading,
    check,
    register,
    login,
    logout,
    connectToMemberChannels,
    setStatus,
    setShowOnlyDirectedMessages
  }
})
