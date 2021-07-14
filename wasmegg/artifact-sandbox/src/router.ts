import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

import Builds from '@/views/Builds.vue';

const routes: RouteRecordRaw[] = [
  {
    name: 'home',
    path: '/',
    component: Builds,
    props: true,
  },
  {
    name: 'builds',
    path: '/b/:serializedBuilds',
    component: Builds,
    props: true,
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/',
  },
];

const router = createRouter({
  routes,
  history: createWebHashHistory(),
});

export default router;
