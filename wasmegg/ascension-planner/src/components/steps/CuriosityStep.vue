<template>
  <div class="space-y-4">
    <!-- Step Header with Metrics -->
    <step-header
      :step="step"
      :previous-steps="previousSteps"
      :initial-data="initialData"
      :arrival-time="arrivalTime"
      :departure-time="departureTime"
    />

    <div class="text-sm text-gray-600">
      <p class="font-medium text-gray-900 mb-2">Research</p>
      <p>Configure research purchases for this Curiosity visit.</p>
    </div>

    <!-- Bonuses Section -->
    <div class="bg-gray-50 rounded-lg p-3 space-y-2">
      <p class="text-sm font-medium text-gray-700 mb-2">Bonuses (from player data)</p>

      <!-- Epic Research: Lab Upgrade -->
      <div class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Lab Upgrade</span>
          <span class="text-xs text-gray-400 ml-1">(Epic Research)</span>
        </div>
        <div class="text-right">
          <span class="font-medium text-gray-900">Level {{ labUpgradeLevel }}/10</span>
          <span v-if="researchCostReduction > 0" class="text-green-600 ml-2">-{{ researchCostReduction }}% research cost</span>
        </div>
      </div>

      <!-- Colleggtible: Research Cost -->
      <div v-if="researchCostColleggtibleReduction > 0" class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Research Cost</span>
          <span class="text-xs text-gray-400 ml-1">(Colleggtibles)</span>
        </div>
        <div class="text-right">
          <span class="text-green-600 font-medium">-{{ researchCostColleggtibleReduction }}%</span>
        </div>
      </div>
    </div>

    <!-- Fuel Tank (available on all eggs) -->
    <!-- Hidden for now --><fuel-tank v-if="false" :step="step" />

    <!-- Research selection UI -->
    <research-section :step="step" :previous-steps="previousSteps" :initial-data="initialData" />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';
import type { AscensionStep, InitialData } from '@/types';
import FuelTank from '@/components/FuelTank.vue';
import ResearchSection from '@/components/ResearchSection.vue';
import StepHeader from '@/components/StepHeader.vue';

export default defineComponent({
  components: {
    FuelTank,
    ResearchSection,
    StepHeader,
  },
  props: {
    step: {
      type: Object as PropType<AscensionStep>,
      required: true,
    },
    previousSteps: {
      type: Array as PropType<AscensionStep[]>,
      default: () => [],
    },
    initialData: {
      type: Object as PropType<InitialData>,
      default: undefined,
    },
    arrivalTime: {
      type: Number,
      default: undefined,
    },
    departureTime: {
      type: Number,
      default: undefined,
    },
  },
  setup(props) {
    // Epic research: Lab Upgrade (-5% research cost per level, max 10)
    const labUpgradeLevel = computed(() => props.initialData?.epicResearch?.labUpgrade || 0);
    const researchCostReduction = computed(() => labUpgradeLevel.value * 5);

    // Colleggtible modifier for research cost
    const researchCostColleggtible = computed(() => props.step.modifiers?.researchCost ?? 1);
    const researchCostColleggtibleReduction = computed(() => Math.round((1 - researchCostColleggtible.value) * 100));

    return {
      labUpgradeLevel,
      researchCostReduction,
      researchCostColleggtibleReduction,
    };
  },
});
</script>
