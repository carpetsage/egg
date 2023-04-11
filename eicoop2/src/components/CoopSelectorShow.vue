<template>
  <slot :show="show"></slot>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useStore } from 'vuex';

import { key } from '@/store';

export default defineComponent({
  setup() {
    const store = useStore(key);
    const show = () => store.commit('coopSelector/show');
    return {
      show,
    };
  },
});
</script>
