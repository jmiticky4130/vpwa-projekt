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
  // State
  const user = ref<User | null>(null)
  const status = ref<AuthStatus>('success')
  const errors = ref<AuthError[]>([])

  // Getters
  const isAuthenticated = computed(() => user.value !== null)
  const loading = computed(() => status.value === 'pending')

  // Actions
  function AUTH_START(): void {
    status.value = 'pending'
    errors.value = []
  }

  function AUTH_SUCCESS(userData: User | null): void {
    status.value = 'success'
    if (userData) {
      // Append client-only defaults on successful auth fetch
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

    if (Array.isArray(err)) {
      // array of { message, field? }
      errors.value = err.filter(
        (e): e is AuthError =>
          typeof e === 'object' && e !== null && 'message' in e
      )
    } else if (err instanceof Error) {
      errors.value = [{ message: err.message }]
    } else {
      errors.value = [{ message: 'Unknown error' }]
    }
  }

  /** Connect to all channels the user is a member of */
  async function connectToMemberChannels(): Promise<void> {
    try {
      const { useChannelStore } = await import('./channel-store')
      const channelStore = useChannelStore()
      
      // Fetch latest channel list
      await channelStore.refresh()
      
      if (channelStore.error) {
        console.error('[auth] Channel store refresh failed:', channelStore.error)
      }

      // Get channels user is member of
      const memberChannels = channelStore.list()
      console.log(`[auth] Found ${memberChannels.length} member channels to connect`)
      
      // Join socket for each channel (silently, without loading messages into UI)
      for (const channel of memberChannels) {
        const key = channel.name.toLowerCase()
        
        let manager = ChannelService.in(key)
        if (!manager) {
          manager = ChannelService.join(key)
          console.log(`[auth] Auto-connected to channel: ${key}`)
        } else {
          console.log(`[auth] Already joined channel: ${key}`)
        }

        // Ensure socket is connected
        if (manager && !manager.socket.connected) {
           console.log(`[auth] Socket not connected for ${key}, connecting...`)
           manager.socket.connect()
        }
      }
    } catch (err: unknown) {
      console.warn('[auth] Failed to auto-connect to channels:', err)
    }
  }

  /** Verify auth token & fetch current user */
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

  /** Register a new user */
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

  /** Log in & save API token */
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

  /** Log out & clear token */
  async function logout(): Promise<void> {
    try {
      AUTH_START()
      await authService.logout()
      AUTH_SUCCESS(null)
      authManager.removeToken()
      
      // Clean up all message store sockets
      const { useMessageStore } = await import('./message-store')
      const ms = useMessageStore()
      
      console.log("[auth] Logging out, disconnecting all sockets");
      ChannelService.leaveAll()
      ChannelService.disconnectUserSocket()
      
      console.log("[auth] Resetting message store");
      ms.reset()
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
