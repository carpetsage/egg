<template>
  <the-nav-bar active-entry-id="loot-simulator" />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
    Loot simulator
  </h1>

  <div class="max-w-5xl mx-auto px-4 xl:px-0">
    <div class="text-sm text-red-700">
      This tool has not been updated for game version 1.21 (when star levels were introduced, the
      number of mission slots was increased for standard permit players, and drop rates for certain
      items significantly changed) yet. As such, the simulated results tend to be thoroughly
      inaccurate. Therefore, this tool is disabled for now.
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import TheNavBar from 'ui/components/NavBar.vue';

export default defineComponent({
  components: {
    TheNavBar,
  },
});
</script>
