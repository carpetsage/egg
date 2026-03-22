<template>
  <the-nav-bar active-entry-id="rocket-planner" width-classes="max-w-7xl px-4 xl:px-0" />

  <h1 class="mx-4 mt-4 text-center text-lg leading-6 font-medium text-gray-900">Rocket Planner</h1>

  <div class="max-w-7xl w-full px-4 pb-4 xl:px-0 mx-auto">
    <router-view />
  </div>

  <config-modal />
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue';

import TheNavBar from 'ui/components/NavBar.vue';
import ConfigModal from '@/components/ConfigModal.vue';
import { config, persistConfig } from '@/store';

export default defineComponent({
  components: {
    TheNavBar,
    ConfigModal,
  },
  setup() {
    watch(
      config,
      () => {
        persistConfig();
      },
      { deep: true }
    );
  },
});
</script>
