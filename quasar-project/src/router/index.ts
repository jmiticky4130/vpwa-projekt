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
// ------------------------------------------------------------

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

  // --- IMPORTANT: store the instance so getRouter() can return it ---
  routerInstance = Router;
  // -----------------------------------------------------------------

  Router.beforeEach(async (to) => {
    // General auth & guest route handling performed in boot/auth.ts.
    // Only channel membership validation remains here to avoid duplication.
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


// import { defineRouter } from '#q-app/wrappers';
// import {
//   createMemoryHistory,
//   createRouter,
//   createWebHashHistory,
//   createWebHistory,
//   type Router,
// } from 'vue-router';
// import routes from './routes';

// import { authManager } from 'src/services';
// import { useAuthStore } from 'src/stores/auth-store';
// import { useChannelStore } from 'src/stores/channel-store';

// // --- NEW: keep a reference to the current router instance ---
// let routerInstance: Router | null = null;

// export function getRouter(): Router {
//   if (!routerInstance) {
//     throw new Error('Router instance not initialized yet');
//   }
//   return routerInstance;
// }
// // ------------------------------------------------------------

// export default defineRouter(function () {
//   const createHistory = process.env.SERVER
//     ? createMemoryHistory
//     : process.env.VUE_ROUTER_MODE === 'history'
//       ? createWebHistory
//       : createWebHashHistory;

//   const Router = createRouter({
//     scrollBehavior: () => ({ left: 0, top: 0 }),
//     routes,
//     history: createHistory(process.env.VUE_ROUTER_BASE),
//   });

//   // --- IMPORTANT: store the instance so getRouter() can return it ---
//   routerInstance = Router;
//   // -----------------------------------------------------------------

//   Router.beforeEach(async (to) => {
//     const auth = useAuthStore();
//     const channelStore = useChannelStore();
//     const hasToken = authManager.getToken() !== null;
//     let isAuthenticated = false;

//     if (to.meta.requiresAuth && !hasToken) {
//       return { path: '/login', query: { redirect: to.fullPath } };
//     }

//     if (hasToken) {
//       if (auth.user) {
//         isAuthenticated = true;
//         console.log('Auth user already loaded in store.');
//       } else {
//         try {
//           console.log('Verifying auth token via router guard...');
//           isAuthenticated = await auth.check();
//         } catch {
//           isAuthenticated = false;
//         }
//       }
//     }

//     if (to.meta.requiresAuth && !isAuthenticated) {
//       return { path: '/login', query: { redirect: to.fullPath } };
//     }

//     if (to.meta.guestOnly && isAuthenticated) {
//       return { path: '/' };
//     }

//     if (to.name === 'channel') {
//       const slug = String(to.params.slug || '').toLowerCase();
//       const uid = auth.user?.id ?? null;
//       if (uid == null) return { path: '/' };

//       if (!channelStore.loading && channelStore.channels.length === 0) {
//         try {
//           await channelStore.refresh();
//         } catch {
//           // ignore
//         }
//       }

//       let ch = channelStore.findByName(slug);
//       if (!ch && !channelStore.loading) {
//         try {
//           await channelStore.refresh();
//           ch = channelStore.findByName(slug);
//         } catch {
//           // ignore
//         }
//       }

//       if (!ch) return { path: '/' };
//       const members = Array.isArray(ch.members) ? ch.members : [];
//       if (!members.includes(uid)) return { path: '/' };
//     }

//     return true;
//   });

//   return Router;
// });
