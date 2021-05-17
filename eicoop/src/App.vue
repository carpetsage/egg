<template>
  <the-nav-bar />
  <router-view />
  <the-coop-selector />
</template>

<script lang="ts">
import { computed, defineComponent, provide } from 'vue';
import { useStore } from 'vuex';

import { devmodeKey } from './symbols';
import { key } from '@/store';
import TheNavBar from '@/components/TheNavBar.vue';
import TheCoopSelector from '@/components/TheCoopSelector.vue';

export default defineComponent({
  name: 'App',
  components: {
    TheNavBar,
    TheCoopSelector,
  },
  setup() {
    const store = useStore(key);
    const devmode = computed(() => store.state.devmode.on);
    provide(devmodeKey, devmode);
  },
});
</script>
