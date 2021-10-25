<template>
  <footer class="py-4 text-center text-xs leading-relaxed">
    <div class="flex items-center justify-center space-x-1">
      <img :src="iconURL('egginc/icon_chick.png', 64)" class="ChickIcon h-4 w-4" />
      <button class="text-blue-400 hover:text-blue-500 transition-none" @click="openSidewideNav">
        More Egg, Inc. tools
      </button>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useStore } from 'vuex';

import { key } from '@/store';
import { iconURL } from '@/lib';

export default defineComponent({
  setup() {
    const store = useStore(key);
    const openSidewideNav = () => store.dispatch('sitewideNav/open');
    return {
      openSidewideNav,
      iconURL,
    };
  },
});
</script>

<style lang="postcss" scoped>
.ChickIcon {
  filter: brightness(33%);
}
</style>
