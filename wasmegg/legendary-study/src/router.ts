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
      path: '/legendary-study/report/:date(\\d+)/',
      component: Report,
      props: true,
    },
    {
      name: 'diff',
      path: '/legendary-study/diff/:date1(\\d+)/:date2(\\d+)/',
      component: Diff,
      props: true,
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/legendary-study/',
    },
  ],
  history: createWebHistory(),
});

export default router;
