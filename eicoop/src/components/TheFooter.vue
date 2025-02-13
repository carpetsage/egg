<template>
  <footer class="py-4 text-center text-xs leading-relaxed">
    <div class="flex items-center justify-center space-x-1">
      <base-icon icon-rel-path="egginc/icon_chick.png" :size="64" class="ChickIcon h-4 w-4" />
      <button class="text-blue-400 hover:text-blue-500 transition-none" @click="openSidewideNav">
        More Egg, Inc. tools
      </button>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import BaseIcon from 'ui/components/BaseIcon.vue';
import useSitewideNavStore from '@/stores/sitewideNav';

export default defineComponent({
  components: {
    BaseIcon,
  },
  setup() {
    const navStore = useSitewideNavStore();
    const openSidewideNav = () => navStore.openNav();
    return {
      openSidewideNav,
    };
  },
});
</script>

<style lang="postcss" scoped>
.ChickIcon {
  filter: brightness(33%);
}
</style>
