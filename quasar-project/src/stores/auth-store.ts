import { defineStore } from 'pinia'
import { authService, authManager } from 'src/services'
import type { User, LoginCredentials, RegisterData, ApiToken } from 'src/contracts'

export type AuthStatus = 'pending' | 'success' | 'error'

export interface AuthError {
  message: string
  field?: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    status: 'success' as AuthStatus,
    errors: [] as AuthError[],
  }),

  getters: {
    /** True if user is logged in */
    isAuthenticated: (state): boolean => state.user !== null,
    /** True while request is in progress */
    loading: (state): boolean => state.status === 'pending',
  },

  actions: {
    AUTH_START(): void {
      this.status = 'pending'
      this.errors = []
    },

    AUTH_SUCCESS(user: User | null): void {
      this.status = 'success'
      if (user) {
        // Append client-only defaults on successful auth fetch
        this.user = {
          ...user,
          status: user.status ?? 'online',
          showOnlyDirectedMessages: user.showOnlyDirectedMessages ?? false,
          newchannels: Array.isArray(user.newchannels) ? user.newchannels : [],
        }
      } else {
        this.user = null
      }
    },

    AUTH_ERROR(errors: unknown): void {
      this.status = 'error'

      if (Array.isArray(errors)) {
        // array of { message, field? }
        this.errors = errors.filter(
          (e): e is AuthError =>
            typeof e === 'object' && e !== null && 'message' in e
        )
      } else if (errors instanceof Error) {
        this.errors = [{ message: errors.message }]
      } else {
        this.errors = [{ message: 'Unknown error' }]
      }
    },

    /** Verify auth token & fetch current user */
    async check(): Promise<boolean> {
      try {
        this.AUTH_START()
        // Avoid triggering global logout on 401 to prevent router loops
        const user = await authService.me(true)
        this.AUTH_SUCCESS(user)
        return user !== null
      } catch (err: unknown) {
        this.AUTH_ERROR(err)
        throw err
      }
    },

    /** Register a new user */
    async register(form: RegisterData): Promise<User> {
      try {
        this.AUTH_START()
        const user = await authService.register(form)
        this.AUTH_SUCCESS(null)
        return user
      } catch (err: unknown) {
        this.AUTH_ERROR(err)
        throw err
      }
    },

    /** Log in & save API token */
    async login(credentials: LoginCredentials): Promise<ApiToken> {
      try {
        this.AUTH_START()
        const apiToken = await authService.login(credentials)
        this.AUTH_SUCCESS(null)
        authManager.setToken(apiToken.token)
        return apiToken
      } catch (err: unknown) {
        this.AUTH_ERROR(err)
        throw err
      }
    },

    /** Log out & clear token */
    async logout(): Promise<void> {
      try {
        this.AUTH_START()
        await authService.logout()
        this.AUTH_SUCCESS(null)
        authManager.removeToken()
      } catch (err: unknown) {
        this.AUTH_ERROR(err)
        throw err
      }
    },
  },
})
