<template>
  <div class="space-y-1 text-sm">
    <div class="text-lg font-semibold text-green-700">
      <span v-tippy="chanceTooltip" class="cursor-help border-b border-dotted border-green-400/60">
        Chance of a legendary
      </span>
      : {{ (solution.bestProbability * 100).toFixed(2) }}%<sup
        v-if="dropDataIsSparse"
        v-tippy="sparseTooltip"
        class="text-gray-500 cursor-help ml-0.5"
        >?</sup
      >
    </div>
    <div class="text-sm text-green-700 pl-3">
      <span v-tippy="craftTooltip" class="cursor-help border-b border-dotted border-green-400/60">…via crafting</span>
      : {{ (solution.craftProbability * 100).toFixed(2) }}%
    </div>
    <div class="text-sm text-green-700 pl-3">
      <span v-tippy="dropTooltip" class="cursor-help border-b border-dotted border-green-400/60"
        >…via direct drops</span
      >
      : {{ (solution.dropProbability * 100).toFixed(2) }}%<sup
        v-if="dropDataIsSparse"
        v-tippy="sparseTooltip"
        class="text-gray-500 cursor-help ml-0.5"
        >?</sup
      >
    </div>

    <div class="text-gray-600 pt-1">Fuel used: {{ formatEIValue(solution.fuelUsed, { trim: true }) }} Eggs</div>

    <ul>
      <li v-for="[egg, qty] of solution.fuelByEgg.entries()" :key="'egg-' + egg" class="text-gray-600">
        {{ formatEIValue(qty, { trim: true }) }}
        <base-icon :icon-rel-path="eggIconPath(egg)" :size="64" class="inline-block -ml-0.5 h-4 w-4"></base-icon>
      </li>
    </ul>
    <div class="text-gray-600">Total mission time: {{ formatDuration(solution.timeUnitsUsed, true) }}</div>
    <div class="text-gray-600">Expected crafts: {{ solution.expectedCrafts.toFixed(1) }}</div>

    <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mt-3">Launch plan</div>
    <optimizer-choice-list :choices="solution.choiceHistory" />

    <optimizer-expected-drops :drops="solution.expectedDrops" />

    <optimizer-probability-breakdown
      :best-probability="solution.bestProbability"
      :craft-probability="solution.craftProbability"
      :drop-probability="solution.dropProbability"
      :expected-crafts="solution.expectedCrafts"
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

import { eggIconPath, formatDuration, formatEIValue } from 'lib';
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
    const chanceTooltip =
      'The overall probability of ending up with at least one legendary of this artifact from this ship set — combining both crafting it and having it drop directly.';
    const craftTooltip =
      'The probability of crafting at least one legendary, from the ingredients gathered across these missions (plus anything already in your inventory).';
    const dropTooltip =
      'The probability of at least one legendary dropping directly from the missions themselves, without crafting.';
    return { eggIconPath, formatDuration, formatEIValue, sparseTooltip, chanceTooltip, craftTooltip, dropTooltip };
  },
});
</script>
