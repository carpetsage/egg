<template>
  <the-nav-bar />
  <router-view />
  <the-coop-selector />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import TheNavBar from '@/components/TheNavBar.vue';
import TheCoopSelector from '@/components/TheCoopSelector.vue';

export default defineComponent({
  name: 'App',
  components: {
    TheNavBar,
    TheCoopSelector,
  },
});
</script>
