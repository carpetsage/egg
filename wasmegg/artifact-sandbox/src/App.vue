<template>
  <the-nav-bar active-entry-id="artifact-sandbox" :center-icons="true">
    <font-switcher />
  </the-nav-bar>

  <main class="flex-1 w-full mx-auto">
    <h1 class="mx-4 my-4 text-center text-lg leading-6 font-medium uppercase">Artifact sandbox</h1>
    <div class="mt-4">
      <router-view />
    </div>
  </main>
  <the-calculator-wrapper />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import TheNavBar from 'ui/components/NavBar.vue';
import FontSwitcher from '@/components/FontSwitcher.vue';
import TheCalculatorWrapper from 'ui/components/TheCalculatorWrapper.vue';

export default defineComponent({
  components: {
    TheNavBar,
    FontSwitcher,
    TheCalculatorWrapper,
  },
});
</script>
