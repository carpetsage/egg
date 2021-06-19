import { createRouter, createWebHistory, RouteLocationNormalized } from 'vue-router';

import AfxCompleteMission from '@/views/AfxCompleteMission.vue';
import AfxConfig from '@/views/AfxConfig.vue';
import AppHeader from '@/views/AppHeader.vue';
import ArbitraryPayload from '@/views/ArbitraryPayload.vue';
import CoopStatus from '@/views/CoopStatus.vue';
import FirstContact from '@/views/FirstContact.vue';
import GetConfig from '@/views/GetConfig.vue';
import GetPeriodicals from '@/views/GetPeriodicals.vue';

const header = {
  header: AppHeader,
};
const props = {
  default: (route: RouteLocationNormalized) => ({ route: route.name }),
  header: (route: RouteLocationNormalized) => ({ route: route.name }),
};

const router = createRouter({
  routes: [
    {
      name: 'arbitrary_payload',
      path: '/',
      components: {
        default: ArbitraryPayload,
        ...header,
      },
      props,
    },
    {
      name: 'first_contact',
      path: '/first_contact/',
      components: {
        default: FirstContact,
        ...header,
      },
      props,
    },
    {
      name: 'get_periodicals',
      path: '/get_periodicals/',
      components: {
        default: GetPeriodicals,
        ...header,
      },
      props,
    },
    {
      name: 'get_config',
      path: '/get_config/',
      components: {
        default: GetConfig,
        ...header,
      },
      props,
    },
    {
      name: 'coop_status',
      path: '/coop_status/',
      components: {
        default: CoopStatus,
        ...header,
      },
      props,
    },
    {
      name: 'afx/config',
      path: '/afx/config/',
      components: {
        default: AfxConfig,
        ...header,
      },
      props,
    },
    {
      name: 'afx/complete_mission',
      path: '/afx/complete_mission/',
      components: {
        default: AfxCompleteMission,
        ...header,
      },
      props,
    },
    // The /doc/ route should be configured to serve an external static HTML
    // file in the production server.
    {
      name: 'doc',
      path: '/doc/',
      redirect: '/',
    },
    {
      path: '/:catchAll(.*)',
      redirect: '/',
    },
  ],
  history: createWebHistory('/proto-explorer/'),
});

export default router;
