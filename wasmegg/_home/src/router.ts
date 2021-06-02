import { nextTick } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';

import Home from '@/views/Home.vue';
import Donate from '@/views/Donate.vue';
import PrivacyPolicy from '@/views/PrivacyPolicy.vue';

declare module 'vue-router' {
  interface RouteMeta {
    title: string;
  }
}

declare global {
  interface Window {
    goatcounter: {
      count: (options: { path: string; title: string; event: boolean }) => void;
    };
  }
}

const router = createRouter({
  routes: [
    {
      name: 'home',
      path: '/',
      component: Home,
      meta: {
        title: "@mk2's public utilities for Egg, Inc.",
      },
    },
    {
      name: 'donate',
      path: '/donate',
      component: Donate,
      meta: {
        title: 'Donate',
      },
    },
    {
      name: 'privacy',
      path: '/privacy',
      component: PrivacyPolicy,
      meta: {
        title: 'Privacy policy',
      },
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/',
    },
  ],
  history: createWebHashHistory(),
});

router.afterEach((to, from, failure) => {
  if (!failure) {
    nextTick(() => {
      document.title = to.meta.title;
      if (to.name === 'donate') {
        setTimeout(() => {
          window.goatcounter?.count({
            path: 'https://wasmegg.netlify.app/#/donate',
            title: 'Visited donation page',
            event: true,
          });
        }, 0);
      }
    });
  }
});

export default router;
