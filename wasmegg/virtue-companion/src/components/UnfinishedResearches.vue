<template>
  <div v-if="unfinishedResearches.length > 0">
    <p class="text-xs text-gray-600 mb-1">Unfinished research:</p>
    <table class="tabular-nums text-xs w-auto">
      <tbody>
        <tr v-for="research in unfinishedResearches" :key="research.id">
          <td class="text-blue-500 pr-2">{{ research.level }}/{{ research.maxLevel }}</td>
          <td class="text-gray-700" :class="research.epic ? 'text-purple-700' : null">
            {{ research.name }}
            <template v-if="research.epic"> (Epic)</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="text-xs text-green-600">All related researches complete</div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { ResearchInstance } from '@/lib/types';

export default defineComponent({
  props: {
    researches: {
      type: Array as PropType<ResearchInstance[]>,
      required: true,
    },
  },
  setup(props) {
    const { researches } = toRefs(props);
    const unfinishedResearches = computed(() => researches.value.filter(r => r.level < r.maxLevel));
    return {
      unfinishedResearches,
    };
  },
});
</script>
