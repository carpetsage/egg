<template>
  <div v-if="rows.length" class="mt-4 border border-gray-200 rounded-lg p-4">
    <details>
      <summary class="text-base font-semibold text-gray-700 mb-3">Inventory</summary>
      <ul class="space-y-1 text-sm">
        <li
          v-for="row in rows"
          :key="row.nodeId"
          class="flex items-center gap-1.5"
          :style="{ paddingLeft: row.depth * 16 + 'px' }"
        >
          <img :src="row.iconUrl" class="h-5 w-5 flex-shrink-0" />
          <span class="text-gray-700">{{ row.name }}</span>
          <span v-if="row.needed > 1" class="text-xs text-gray-400 ml-0.5">(×{{ row.needed }})</span>
          <span
            class="ml-auto font-mono text-xs"
            :class="row.have > 0 ? 'text-green-700 font-semibold' : 'text-gray-400'"
            >{{ row.have }}</span
          >
        </li>
      </ul>
    </details>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import type { InventoryRow } from '@/lib';

export default defineComponent({
  props: {
    rows: { type: Array as PropType<InventoryRow[]>, required: true },
  },
});
</script>
