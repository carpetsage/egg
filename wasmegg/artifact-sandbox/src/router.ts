import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

import Builds from '@/views/Builds.vue';

const routes: RouteRecordRaw[] = [
  {
    name: 'builds',
    path: '/b/:serializedBuilds?',
    component: Builds,
    props: true,
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/b/',
  },
];

const router = createRouter({
  routes,
  history: createWebHashHistory(),
});

export default router;
