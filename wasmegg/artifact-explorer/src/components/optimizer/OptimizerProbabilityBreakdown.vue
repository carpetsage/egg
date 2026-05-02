<template>
  <details class="mt-3">
    <summary class="cursor-pointer text-gray-500 hover:text-gray-700 select-none">Probability breakdown</summary>

    <!-- Formula decomposition -->
    <div class="mt-2 text-xs bg-gray-50 rounded p-2 space-y-0.5">
      <div class="font-medium text-gray-700">
        P(legendary) = {{ (bestProbability * 100).toFixed(2) }}%
        <span class="text-gray-400 font-normal ml-1">= 1 − (1 − P(craft)) × (1 − P(drop))</span>
      </div>
      <div class="pl-3">
        <span class="text-green-700 font-medium">P(craft) = {{ (craftProbability * 100).toFixed(2) }}%</span>
        <span class="text-gray-400 ml-1">via 1 − (1 − p)^α</span>
      </div>
      <div class="pl-6 text-gray-500">
        α = {{ expectedCrafts.toFixed(2) }} craftable × {{ (pCraft * 100).toFixed(2) }}% per craft
      </div>
      <div class="pl-3">
        <span class="text-blue-700 font-medium">P(drop) = {{ (dropProbability * 100).toFixed(2) }}%</span>
        <span class="text-gray-400 ml-1">via 1 − e^(−λ)</span>
      </div>
      <div class="pl-6 text-gray-500">λ = {{ lambda.toFixed(3) }} expected direct legendary drops</div>
    </div>

    <!-- Craft chain -->
    <template v-if="craftChain.length > 0">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mt-3 mb-1">Craft chain</div>
      <div class="flex items-baseline gap-1 text-xs py-0.5 font-medium text-gray-700 pl-1">
        Target: α = {{ expectedCrafts.toFixed(2) }} craftable
      </div>
      <div
        v-for="row in craftChain"
        :key="'chain-' + row.nodeId"
        class="flex items-center gap-1.5 text-xs py-0.5"
        :style="{ paddingLeft: row.depth * 12 + 4 + 'px' }"
      >
        <img :src="row.iconUrl" class="h-4 w-4 flex-shrink-0" />
        <span class="text-gray-700 flex-shrink-0">{{ row.name }}</span>
        <span class="text-gray-400 text-xs flex-shrink-0">×{{ row.qtyPerParentCraft }}</span>
        <span class="ml-auto font-mono text-xs whitespace-nowrap flex-shrink-0">
          <template v-if="hasInventory && row.owned > 0">
            <span class="text-amber-600">{{ row.owned }} inv</span>
            <span class="text-gray-400"> + </span>
          </template>
          <span class="text-blue-600">{{ row.dropped.toFixed(1) }} drop</span>
          <template v-if="row.crafted > 0.005">
            <span class="text-gray-400"> + </span>
            <span class="text-purple-600">{{ row.crafted.toFixed(1) }} craft</span>
          </template>
          <span class="text-gray-400"> → </span>
          <span
            class="font-semibold"
            :class="row.owned + row.dropped + row.crafted >= row.consumed - 0.01 ? 'text-green-700' : 'text-amber-600'"
            >{{ row.consumed.toFixed(1) }} used</span
          >
        </span>
      </div>
    </template>

    <!-- Per-mission legendary contributions -->
    <template v-if="missionLegendarySources.length > 0">
      <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mt-3 mb-1">
        Direct legendary sources (λ = {{ lambda.toFixed(3) }})
      </div>
      <div
        v-for="(contrib, ci) in missionLegendarySources"
        :key="'contrib-' + ci"
        class="flex items-center gap-1.5 text-xs py-0.5"
      >
        <span class="w-2 h-2 rounded-full flex-shrink-0 bg-green-500"></span>
        <span class="text-gray-700 flex-1">
          {{ contrib.num_ships_launched }}×
          <mission-name :mission="contrib.ship" :target="contrib.targetAfxId" :no-link="true" class="inline-block" />
        </span>
        <span class="font-mono text-blue-700">+{{ contrib.legendaryDrops.toFixed(4) }}</span>
      </div>
    </template>
  </details>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import type { CraftChainRow, MissionLegendaryRow } from '@/lib';
import MissionName from '@/components/MissionName.vue';

export default defineComponent({
  components: { MissionName },
  props: {
    bestProbability: { type: Number, required: true },
    craftProbability: { type: Number, required: true },
    dropProbability: { type: Number, required: true },
    expectedCrafts: { type: Number, required: true },
    pCraft: { type: Number, required: true },
    lambda: { type: Number, required: true },
    craftChain: { type: Array as PropType<CraftChainRow[]>, required: true },
    missionLegendarySources: { type: Array as PropType<MissionLegendaryRow[]>, required: true },
    hasInventory: { type: Boolean, required: true },
  },
});
</script>
