import { boot } from 'quasar/wrappers'
import { authManager } from 'src/services'
import { useAuthStore } from 'src/stores/auth-store'
import { type RouteLocationNormalized, type RouteLocationRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
  }
}

const loginRoute = (from: RouteLocationNormalized): RouteLocationRaw => ({
  path: '/login',
  query: { redirect: from.fullPath },
})

export default boot(({ router }) => {
  // Access the Pinia store
  const auth = useAuthStore()

  // When token removed from localStorage, redirect to login
  authManager.onLogout(() => {
    void router.push(loginRoute(router.currentRoute.value))
  })

  // Router guard for protected routes
  router.beforeEach(async (to: RouteLocationNormalized) => {
    // Optimize: only check auth when needed
    const needsAuthCheck = !!to.meta.requiresAuth || !!to.meta.guestOnly
    if (!needsAuthCheck) return

    const hasToken = authManager.getToken() !== null
    let isAuthenticated = false

    // Fast-fail for protected routes with no token
    if (to.meta.requiresAuth && !hasToken) {
      return loginRoute(to)
    }

    // If we have a token, verify it
    if (hasToken) {
      if (auth.user) {
        isAuthenticated = true
        console.log('Auth user already loaded in store.')
      } else {
        try {
          console.log('Verifying auth token via router guard...')
          isAuthenticated = await auth.check()
        } catch {
          isAuthenticated = false
        }
      }
    }
    // route requires authentication
    if (to.meta.requiresAuth && !isAuthenticated) {
      return loginRoute(to)
    }

    // route is only for guests (redirect logged users to home)
    if (to.meta.guestOnly && isAuthenticated) {
      return { path: '/' }
    }
  })
})
