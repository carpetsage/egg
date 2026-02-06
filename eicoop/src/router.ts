import { nextTick } from 'vue';
import { createRouter, createWebHistory, RouteLocationNormalized } from 'vue-router';

import { recordVisit } from 'lib';
import Home from '@/views/Home.vue';
import Coop from '@/views/Coop.vue';
import Dashboard from '@/views/Dashboard.vue';
import DevMode from '@/views/DevMode.vue';

declare module 'vue-router' {
  interface RouteMeta {
    title: string | ((route: RouteLocationNormalized) => string);
  }
}

const router = createRouter({
  routes: [
    {
      name: 'home',
      path: '/',
      component: Home,
      meta: {
        title: 'CoopTracker',
      },
    },
    {
      name: 'coop',
      path: '/:contractId/:coopCode/:grade?',
      component: Coop,
      props: true,
      meta: {
        title: route => {
          const contractId = route.params.contractId as string;
          const coopCode = route.params.coopCode as string;
          return `${coopCode}@${contractId} - CoopTracker`;
        },
      },
    },
    {
      name: 'dashboard-legacy',
      path: '/u/:userId/',
      component: Dashboard,
      props: true,
      meta: {
        title: 'Dashboard - CoopTracker',
      },
    },
    {
      name: 'dashboard',
      path: '/dashboard/:userId?',
      component: Dashboard,
      props: true,
      meta: {
        title: 'Dashboard - CoopTracker',
      },
    },
    {
      name: 'devmode',
      path: '/devmode/',
      component: DevMode,
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/',
    },
  ],
  history: createWebHistory(),
  scrollBehavior() {
    // always scroll to top
    return { top: 0 };
  },
});

router.afterEach((to, from, failure) => {
  if (!failure) {
    recordVisit();
    nextTick(() => {
      const title = to.meta?.title;
      document.title = title instanceof Function ? title(to) : title;
    });
  }
});

export default router;
