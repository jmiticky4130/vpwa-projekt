import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue'), meta: { requiresAuth: true } },
      { path: 'login', component: () => import('pages/LoginPage.vue'), meta: { guestOnly: true } },
      { path: 'signup', component: () => import('pages/SignupPage.vue'), meta: { guestOnly: true } },
      {
        path: 'channels/:slug',
        name: 'channel',
        component: () => import('pages/ChannelPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },

  
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
