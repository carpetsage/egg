<template>
  <span
    class="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
    :class="league === ContractLeague.Elite ? 'bg-purple-600' : 'bg-blue-600'"
  >
    {{ league === ContractLeague.Elite ? 'Elite' : 'Standard' }}
  </span>
</template>

<script lang="ts">
import { ContractLeague } from 'lib';
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  props: {
    league: {
      type: Number as PropType<ContractLeague>,
      required: true,
    },
  },
  setup() {
    return {
      ContractLeague,
    };
  },
});
</script>

<style scoped>
.bg-standard {
  background-color: #3b6cbf;
}
</style>
