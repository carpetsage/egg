import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

import TheBuilds from '@/views/TheBuilds.vue';

const routes: RouteRecordRaw[] = [
  {
    name: 'builds',
    path: '/b/:serializedBuilds?',
    component: TheBuilds,
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
