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

  <h2>Tools hosted at independent domains</h2>
  <ul>
    <li>
      <tool-link id="eicoop" />
      &mdash; Coop tracker and contract master list
    </li>
  </ul>

  <h2>Tools hosted at this domain</h2>
  <h3>Interactive apps</h3>
  <ul>
    <li>
      <tool-link id="artifact-explorer" />
      &mdash; Explorer for everything artifacts
    </li>
    <li>
      <tool-link id="artifact-sandbox" />
      &mdash; Experiment, optimize, and share your artifact builds all within this sandbox
    </li>
    <li>
      <tool-link id="rockets-tracker" />
      &mdash; Tracker for active rocket missions, historical mission statistics, progress on
      artifact collection, etc.
    </li>
    <li>
      <tool-link id="past-contracts" />
      &mdash; Past contracts and prophecy egg completion tracker
    </li>
    <li>
      <tool-link id="loot-simulator" />
      &mdash; Simulator for mission loot drops
    </li>
    <li>
      <tool-link id="enlightenment" />
      &mdash; Informational companion on your journey to the Enlightenment Diamond Trophy
    </li>
  </ul>

  <h3>Data sheets</h3>
  <ul>
    <li><tool-link id="artifact-list" /></li>
    <li><tool-link id="mission-list" /></li>
    <li><tool-link id="consumption-sheet" /> &mdash; Artifact consumption outcomes</li>
    <li>
      <tool-link id="loot-analysis" /> &mdash; Statistical analysis of mission rewards data through
      interactive plots
    </li>
    <li><tool-link id="events" /> &mdash; Filterable calendar of (not so) special events.</li>
  </ul>

  <h3>Developer tools</h3>
  <ul>
    <li>
      <tool-link id="researches" /> &mdash; Structured data of common and epic researches,
      customizable by SQL.
    </li>
  </ul>
  <p>
    Certain tools are not advertised here due to concerns. If you are interested, poke around the
    source repo to find them.
  </p>

  <h2>Self-hosted tools</h2>
  <ul>
    <li>
      <base-link href="https://github.com/fanaticscripter/EggContractor">EggContractor</base-link>
      &mdash; contract monitoring web app &amp; CLI client
    </li>
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
import ToolLink from '@/components/ToolLink.vue';
import DonorList from '@/components/DonorList.vue';

export default defineComponent({
  components: {
    BaseLink,
    BaseRouterLink,
    ToolLink,
    DonorList,
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
