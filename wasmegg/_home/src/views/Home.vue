<template>
  <h1 class="mb-4 text-center text-h1 leading-6 font-medium text-gray-900">
    <span class="whitespace-nowrap">@CarpetSage's fork of @mk2's public utilities</span>{{ ' ' }}
    <span class="whitespace-nowrap">for Egg, Inc.</span>
  </h1>

  <p>
    I am <span class="font-medium">CarpetSage#0010</span> on the
    <base-link href="https://discord.gg/egginc">Egg, Inc. Discord server</base-link>. This is the
    index of my fork of <span class="font-medium">mk2#4590's</span> public tools for Egg, Inc.
  </p>

  <whats-new class="my-4" />

  <h2>Tools Updated by Carpet</h2>
  <ul>
    <li><tool-description id="artifact-explorer" /></li>
    <li><tool-description id="artifact-sandbox" /></li>
    <li><tool-description id="rockets-tracker" /></li>
    <li><tool-description id="mission-list" /></li>
    <li><tool-description id="events" /></li>
    <li><tool-description id="eicoop" /></li>
  </ul>
  <h2>Misc Tool Created by Carpet</h2>
  <ul>
    <li><tool-description id="eggs-laid" /></li>
  </ul>

  <h2>Other Tools are hosted on <base-link href="https://wasmegg.netlify.app">mk2's site</base-link></h2>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

import {
  getDonationPageVisited,
  getLocalStorageNoPrefix,
  goatcounter,
  recordVisit,
  setLocalStorageNoPrefix,
} from 'lib';
import BaseLink from '@/components/BaseLink.vue';
import BaseRouterLink from '@/components/BaseRouterLink.vue';
import DonorList from '@/components/DonorList.vue';
import EasterEgg from '@/components/EasterEgg.vue';
import ToolDescription from '@/components/ToolDescription.vue';
import V120Badge from '@/components/V120Badge.vue';
import WhatsNew from '@/components/WhatsNew.vue';

const EASTER_EGG_DAY = 7;
const EASTER_EGG_SHOWN_AT_LOCALSTORAGE_KEY = 'easterEggShownAt';

export default defineComponent({
  components: {
    BaseLink,
    BaseRouterLink,
    DonorList,
    EasterEgg,
    ToolDescription,
    V120Badge,
    WhatsNew,
  },
  setup() {
    const donationPageVisited = getDonationPageVisited();

    const daysVisitedStreak = ref(0);
    const showEasterEgg = ref(false);
    const easterEggRefreshKey = ref(0);
    const { daysVisitedStreak: currentDaysVisitedStreak } = recordVisit();
    daysVisitedStreak.value = currentDaysVisitedStreak;
    const triggerEasterEgg = () => {
      showEasterEgg.value = true;
      easterEggRefreshKey.value = Date.now();
    };
    const triggerEasterEggAndDisableInTheFuture = () => {
      triggerEasterEgg();
      const easterEggShownForTheFirstTime =
        getLocalStorageNoPrefix(EASTER_EGG_SHOWN_AT_LOCALSTORAGE_KEY) === undefined;
      setLocalStorageNoPrefix(EASTER_EGG_SHOWN_AT_LOCALSTORAGE_KEY, Date.now());
      if (easterEggShownForTheFirstTime) {
        goatcounter?.count({
          path: 'https://wasmegg.netlify.app/#/',
          title: 'Easter egg (visit streak)',
          event: true,
        });
      }
    };

    if (
      currentDaysVisitedStreak === EASTER_EGG_DAY &&
      getLocalStorageNoPrefix(EASTER_EGG_SHOWN_AT_LOCALSTORAGE_KEY) === undefined
    ) {
      triggerEasterEggAndDisableInTheFuture();
    } else {
      showEasterEgg.value = false;
    }

    // Record visit on clicking a tool link, because some users may leave the
    // page open for a long time without a refresh.
    const onvisit = () => {
      const { daysVisitedStreak: currentDaysVisitedStreak } = recordVisit();
      daysVisitedStreak.value = currentDaysVisitedStreak;
      if (
        currentDaysVisitedStreak === EASTER_EGG_DAY &&
        getLocalStorageNoPrefix(EASTER_EGG_SHOWN_AT_LOCALSTORAGE_KEY) === undefined
      ) {
        // Do not call the DisableInTheFuture version here because the user may
        // miss it as the new tool is opened.
        triggerEasterEgg();
      } else {
        showEasterEgg.value = false;
      }
    };

    const onrick = () => {
      goatcounter?.count({
        path: 'ei.tcl.sh/tips',
        title: 'Rickrolled',
        event: true,
      });
    };

    return {
      donationPageVisited,
      daysVisitedStreak,
      EASTER_EGG_DAY,
      showEasterEgg,
      easterEggRefreshKey,
      triggerEasterEggAndDisableInTheFuture,
      onvisit,
      onrick,
    };
  },
});
</script>

<style lang="postcss" scoped>
h2 {
  @apply font-medium text-h2 my-2;
}

h3 {
  @apply font-medium text-h3 my-2;
}
</style>
