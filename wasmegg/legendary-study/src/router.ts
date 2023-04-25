import { createRouter, createWebHistory } from 'vue-router';

import Diff from '@/views/Diff.vue';
import Report from '@/views/Report.vue';

const router = createRouter({
  routes: [
    {
      name: 'home',
      path: '/legendary-study/',
      component: Report,
    },
    {
      name: 'report',
      path: '/legendary-study/report/:timestamp(\\d+)/',
      component: Report,
      props: true,
    },
    {
      name: 'diff',
      path: '/legendary-study/diff/:timestamp1(\\d+)/:timestamp2(\\d+)/',
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
