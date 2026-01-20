<template>
  <div>
    <table class="text-sm w-auto">
      <tbody class="divide-y divide-gray-100">
        <tr>
          <td class="py-1.5 pr-4 text-gray-600">Active IHR</td>
          <td class="py-1.5 text-right">
            <span class="font-medium text-green-600 tabular-nums">{{ fmtApprox(onlineIHR) }}</span>
            <span class="text-gray-500 ml-1">chickens/min</span>
          </td>
        </tr>
        <tr>
          <td class="py-1.5 pr-4 text-gray-600">Offline IHR</td>
          <td class="py-1.5 text-right">
            <span class="font-medium text-green-600 tabular-nums">{{ fmtApprox(offlineIHR) }}</span>
            <span class="text-gray-500 ml-1">chickens/min</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="internalHatcheryResearches.length > 0" class="pt-2 border-t border-gray-100">
      <div class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Unfinished Research</div>
      <unfinished-researches :researches="internalHatcheryResearches" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { fmtApprox } from 'lib';
import { ResearchInstance } from '@/lib/types';
import UnfinishedResearches from '@/components/UnfinishedResearches.vue';

export default defineComponent({
  name: 'InternalHatcheryInfo',
  components: {
    UnfinishedResearches,
  },
  props: {
    onlineIHR: { type: Number, required: true },
    onlineIHRPerHab: { type: Number, required: true },
    offlineIHR: { type: Number, required: true },
    internalHatcheryResearches: { type: Array as PropType<ResearchInstance[]>, required: true },
  },
  setup() {
    return { fmtApprox };
  },
});
</script>
