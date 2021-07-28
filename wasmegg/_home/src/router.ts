import { nextTick } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';

import { goatcounter } from 'lib';
import Home from '@/views/Home.vue';
import Contact from '@/views/Contact.vue';
import Donate from '@/views/Donate.vue';
import PrivacyPolicy from '@/views/PrivacyPolicy.vue';

declare module 'vue-router' {
  interface RouteMeta {
    title: string;
  }
}

// Always restore scroll position on home.
let homeScrollY = 0;

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
      name: 'contact',
      path: '/contact',
      component: Contact,
      meta: {
        title: 'Contact',
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
  scrollBehavior(to, from, savedPosition) {
    if (from.name === 'home') {
      homeScrollY = window.scrollY;
    }
    if (savedPosition) {
      return savedPosition;
    }
    if (to.name === 'home') {
      return { top: homeScrollY };
    }
    return { top: 0 };
  },
});

router.afterEach((to, from, failure) => {
  if (!failure) {
    nextTick(() => {
      document.title = to.meta.title;
      if (to.name === 'donate') {
        setTimeout(() => {
          goatcounter?.count({
            path: 'https://wasmegg.netlify.app/#/donate',
            title: 'Visited donation page',
            event: true,
          });
        }, 0);
      } else if (to.name === 'contact') {
        setTimeout(() => {
          goatcounter?.count({
            path: 'https://wasmegg.netlify.app/#/contact',
            title: 'Visited contact page',
            event: true,
          });
        }, 0);
      }
    });
  }
});

export default router;
