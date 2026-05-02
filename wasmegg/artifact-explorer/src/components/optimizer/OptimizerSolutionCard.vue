<template>
  <div class="space-y-1 text-sm">
    <div class="font-medium text-green-700">
      Legendary Probability: {{ (solution.best_probability * 100).toFixed(2) }}%<sup
        v-if="dropDataIsSparse"
        v-tippy="sparseTooltip"
        class="text-gray-500 cursor-help ml-0.5"
        >?</sup
      >
    </div>
    <div class="font-medium text-green-700">
      Legendary Craft Probability: {{ (solution.craft_probability * 100).toFixed(2) }}%
    </div>
    <div class="font-medium text-green-700">
      Legendary Drop Probability: {{ (solution.drop_probability * 100).toFixed(2) }}%<sup
        v-if="dropDataIsSparse"
        v-tippy="sparseTooltip"
        class="text-gray-500 cursor-help ml-0.5"
        >?</sup
      >
    </div>
    <div class="text-gray-600">Fuel: {{ (solution.fuel_used / 1_000_000_000_000).toFixed(2) }}T Eggs</div>

    <ul>
      <li v-for="[egg, qty] of solution.fuel_by_egg.entries()" :key="'egg-' + egg" class="text-gray-600">
        {{ (qty / 1_000_000_000_000).toFixed(2) }}T
        <base-icon :icon-rel-path="eggIconPath(egg)" :size="64" class="inline-block -ml-0.5 h-4 w-4"></base-icon>
      </li>
    </ul>
    <div class="text-gray-600">Time: {{ (solution.time_units_used / 86400).toFixed(1) }} days</div>
    <div class="text-gray-600">Expected crafts: {{ solution.expected_crafts.toFixed(1) }}</div>

    <optimizer-choice-list :choices="solution.choice_history" />

    <optimizer-expected-drops :drops="solution.expected_drops" />

    <optimizer-probability-breakdown
      :best-probability="solution.best_probability"
      :craft-probability="solution.craft_probability"
      :drop-probability="solution.drop_probability"
      :expected-crafts="solution.expected_crafts"
      :p-craft="pCraft"
      :lambda="lambda"
      :craft-chain="craftChain"
      :mission-legendary-sources="missionLegendarySources"
      :has-inventory="hasInventory"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { eggIconPath } from 'lib';
import type { CraftChainRow, MissionLegendaryRow, OptimizerSolution } from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';
import OptimizerChoiceList from './OptimizerChoiceList.vue';
import OptimizerExpectedDrops from './OptimizerExpectedDrops.vue';
import OptimizerProbabilityBreakdown from './OptimizerProbabilityBreakdown.vue';

export default defineComponent({
  components: { BaseIcon, OptimizerChoiceList, OptimizerExpectedDrops, OptimizerProbabilityBreakdown },
  props: {
    solution: { type: Object as PropType<OptimizerSolution>, required: true },
    pCraft: { type: Number, required: true },
    lambda: { type: Number, required: true },
    craftChain: { type: Array as PropType<CraftChainRow[]>, required: true },
    missionLegendarySources: { type: Array as PropType<MissionLegendaryRow[]>, required: true },
    hasInventory: { type: Boolean, required: true },
    dropDataIsSparse: { type: Boolean, default: false },
  },
  setup() {
    const sparseTooltip =
      'Drop data is sparse: no mission has accumulated 5+ legendary observations of this artifact. The displayed rate is dominated by single-observation noise and may overstate or understate the true rate by several multiples.';
    return { eggIconPath, sparseTooltip };
  },
});
</script>
