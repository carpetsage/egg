import { createRouter, createWebHistory } from 'vue-router';

import Diff from '@/views/Diff.vue';
import Report from '@/views/Report.vue';

const router = createRouter({
  routes: [
    {
      name: 'home',
      path: '/',
      component: Report,
    },
    {
      name: 'report',
      path: '/report/:timestamp(\\d+)/',
      component: Report,
      props: true,
    },
    {
      name: 'diff',
      path: '/diff/:timestamp1(\\d+)/:timestamp2(\\d+)/',
      component: Diff,
      props: true,
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/',
    },
  ],
  history: createWebHistory(),
});

export default router;
