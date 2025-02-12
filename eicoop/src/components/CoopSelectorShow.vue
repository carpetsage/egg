<template>
  <slot :show="show"></slot>
</template>

<script lang="ts">
import useCoopSelectorStore from '@/stores/coopSelector';
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const coopSelectorStore = useCoopSelectorStore();
    const show = () => coopSelectorStore.show();
    return {
      show,
    };
  },
});
</script>
