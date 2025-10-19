import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useUserStore } from 'src/stores/user-store';
import { useChannelStore } from 'src/stores/channel-store';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function ({ store /*, ssrContext */ }) {
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

  Router.beforeEach((to) => {
    // Use Pinia store for auth state (in-memory only)
    const userStore = useUserStore(store);
    const isAuthenticated = !!userStore.currentUser;

    if (to.meta.requiresAuth && !isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
    if (to.meta.guestOnly && isAuthenticated) {
      return { path: '/' };
    }

    // Channel membership enforcement: only members can access specific channels
    if (to.name === 'channel') {
      const channelStore = useChannelStore(store)
      const slug = String(to.params.slug || '').toLowerCase()
      const ch = channelStore.findByName(slug)
      // If channel exists, ensure current user is a member
      if (ch) {
        const uid = userStore.currentUser?.id
        const members = Array.isArray(ch.members) ? ch.members : []
        if (uid == null || !members.includes(uid)) {
          return { path: '/' }
        }
      }
    }
    return true;
  });

  return Router;
});
