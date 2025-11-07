import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

import { authManager } from 'src/services'
import { useAuthStore } from 'src/stores/auth-store'
import { useChannelStore } from 'src/stores/channel-store'

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to) => {
    // Use Pinia store for auth state (in-memory only)
    const auth = useAuthStore()
    const channelStore = useChannelStore()
    const hasToken = authManager.getToken() !== null
    let isAuthenticated = false
    if (to.meta.requiresAuth && !hasToken) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }

    if (hasToken) {
      try {
        isAuthenticated = await auth.check()
      } catch {
        isAuthenticated = false
      }
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }

    if (to.meta.guestOnly && isAuthenticated) {
      return { path: '/' };
    }

    // Channel membership enforcement: only members can access specific channels
    if (to.name === 'channel') {
      const slug = String(to.params.slug || '').toLowerCase()
      const uid = auth.user?.id ?? null
      if (uid == null) return { path: '/' }

      // Ensure channels are available for verification
      if (!channelStore.loading && channelStore.channels.length === 0) {
        try {
          await channelStore.refresh()
        } catch {
          // ignore errors here; the guard will redirect if membership cannot be confirmed
        }
      }

      let ch = channelStore.findByName(slug)
      // If not found, try one more refresh (in case of stale state)
      if (!ch && !channelStore.loading) {
        try {
          await channelStore.refresh();
          ch = channelStore.findByName(slug)
        } catch {
          // ignore errors here as well
        }
      }

      if (!ch) return { path: '/' }
      const members = Array.isArray(ch.members) ? ch.members : []
      if (!members.includes(uid)) return { path: '/' }
    }
    return true;
  });

  return Router;
});
