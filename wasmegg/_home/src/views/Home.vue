<template>
  <h1 class="mb-4 text-center text-h1 leading-6 font-medium text-gray-900">
    <span class="whitespace-nowrap">@mk2's public utilities</span>{{ ' ' }}
    <span class="whitespace-nowrap">for Egg, Inc.</span>
  </h1>

  <p>
    I am <span class="font-medium">mk2#4590</span> on the
    <base-link href="https://discord.gg/egginc">Egg, Inc. Discord server</base-link>. This is the
    index of my public tools for Egg, Inc.
  </p>

  <ul>
    <li>
      <base-router-link
        :to="{ name: 'donate' }"
        class="relative text-green-500 hover:text-green-600 visited:text-green-500 visited:hover:text-green-600"
        :class="{ 'bg-green-50': !donationPageVisited }"
      >
        Donate to help cover hosting costs
        <span v-if="!donationPageVisited" class="absolute top-0.5 -right-3 flex h-2 w-2">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
          ></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </base-router-link>
    </li>
    <li>
      <base-router-link :to="{ name: 'privacy' }">Privacy policy</base-router-link>
    </li>
    <li><base-link href="https://github.com/fanaticscripter/Egg">Source code</base-link></li>
  </ul>

  <whats-new class="my-4" />

  <h2>Tools hosted at independent domains</h2>
  <ul>
    <li><tool-description id="eicoop" /></li>
  </ul>

  <h2>Tools hosted at this domain</h2>
  <h3>Interactive apps</h3>
  <ul>
    <li><tool-description id="artifact-explorer" /></li>
    <li><tool-description id="artifact-sandbox" /></li>
    <li><tool-description id="rockets-tracker" /></li>
    <li><tool-description id="past-contracts" /></li>
    <li><tool-description id="loot-simulator" /></li>
    <li><tool-description id="enlightenment" /></li>
  </ul>

  <h3>Data sheets</h3>
  <ul>
    <li><tool-description id="artifact-list" /></li>
    <li><tool-description id="mission-list" /></li>
    <li><tool-description id="consumption-sheet" /></li>
    <li><tool-description id="loot-analysis" /></li>
    <li><tool-description id="events" /></li>
  </ul>

  <h3>Developer tools</h3>
  <ul>
    <li><tool-description id="researches" /></li>
  </ul>
  <p>
    Certain tools are not advertised here due to concerns. If you are interested, poke around the
    source repo to find them.
  </p>

  <h2>Self-hosted tools</h2>
  <ul>
    <li><tool-description id="EggContractor" /></li>
  </ul>

  <h2>Guides</h2>
  <ul>
    <li>
      <base-link href="https://howtofarm.netlify.app/">How to farm materials</base-link>
    </li>
  </ul>

  <h2>Supporters</h2>
  <p>
    Hosting costs come from donations of the awesome individuals listed below. Find out how you can
    support my tools by visiting the
    <base-router-link
      :to="{ name: 'donate' }"
      class="relative text-green-500 hover:text-green-600 visited:text-green-500 visited:hover:text-green-600"
      >Donate</base-router-link
    >
    page.
  </p>
  <donor-list />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { getDonationPageVisited } from 'lib';
import BaseLink from '@/components/BaseLink.vue';
import BaseRouterLink from '@/components/BaseRouterLink.vue';
import DonorList from '@/components/DonorList.vue';
import ToolDescription from '@/components/ToolDescription.vue';
import WhatsNew from '@/components/WhatsNew.vue';

export default defineComponent({
  components: {
    BaseLink,
    BaseRouterLink,
    DonorList,
    ToolDescription,
    WhatsNew,
  },
  setup() {
    const donationPageVisited = getDonationPageVisited();
    return {
      donationPageVisited,
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
