import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type Router,
} from 'vue-router';
import routes from './routes';

import { useAuthStore } from 'src/stores/auth-store';
import { useChannelStore } from 'src/stores/channel-store';

let routerInstance: Router | null = null;

export function getRouter(): Router {
  if (!routerInstance) {
    throw new Error('Router instance not initialized yet');
  }
  return routerInstance;
}

export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  routerInstance = Router;

  Router.beforeEach(async (to) => {

    if (to.name === 'channel') {
      const auth = useAuthStore();
      const channelStore = useChannelStore();
      const slug = String(to.params.slug || '').toLowerCase();
      const uid = auth.user?.id ?? null;
      if (uid == null) return { path: '/' };

      if (!channelStore.loading && channelStore.channels.length === 0) {
        try {
          await channelStore.refresh();
        } catch {
          // ignore
        }
      }

      let ch = channelStore.findByName(slug);
      if (!ch && !channelStore.loading) {
        try {
          await channelStore.refresh();
          ch = channelStore.findByName(slug);
        } catch {
          // ignore
        }
      }

      if (!ch) return { path: '/' };
      const members = Array.isArray(ch.members) ? ch.members : [];
      if (!members.includes(uid)) return { path: '/' };
    }
    return true;
  });

  return Router;
});