<template>
  <the-nav-bar />
  <div class="flex flex-col flex-1">
    <router-view />
  </div>
  <the-footer />
  <the-coop-selector />
  <the-notification-tray />
</template>

<script lang="ts">
import { computed, defineComponent, provide } from 'vue';

import { devmodeKey } from './symbols';
import TheNavBar from '@/components/TheNavBar.vue';
import TheFooter from '@/components/TheFooter.vue';
import TheCoopSelector from '@/components/TheCoopSelector.vue';
import TheNotificationTray from '@/components/TheNotificationTray.vue';
import useDevmodeStore from './stores/devmode';

export default defineComponent({
  name: 'App',
  components: {
    TheNavBar,
    TheFooter,
    TheCoopSelector,
    TheNotificationTray,
  },
  setup() {
    const devmodeStore = useDevmodeStore();
    const devmode = computed(() => devmodeStore.on);
    provide(devmodeKey, devmode);
  },
});
</script>
