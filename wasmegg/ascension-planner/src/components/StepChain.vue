<template>
  <div class="space-y-2">
    <!-- Sequence input -->
    <div class="mb-4">
      <div class="flex gap-2 mb-2">
        <select
          class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="applyPreset($event)"
        >
          <option value="">Common sequences...</option>
          <option v-for="preset in presets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>
      </div>
      <input
        v-model="sequenceInput"
        type="text"
        class="w-full px-4 py-3 text-lg font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter sequence (e.g., CIK CKI RCH KRICH)"
        @input="parseSequenceInput"
      />
      <p class="mt-1 text-xs text-gray-500">
        C=Curiosity, I=Integrity, K=Kindness, H=Humility, R=Resilience. Spaces are ignored.
      </p>
    </div>

    <!-- Step 0: Initial State (not draggable) -->
    <initial-state-step :initial-data="initialData" />

    <!-- Step list -->
    <div
      v-for="(step, index) in steps"
      :key="step.id"
      draggable="true"
      class="cursor-move"
      :class="{ 'opacity-50': draggedIndex === index, 'border-t-2 border-blue-500': dropTargetIndex === index }"
      @dragstart="onDragStart(index, $event)"
      @dragover.prevent="onDragOver(index)"
      @dragleave="onDragLeave"
      @drop="onDrop(index)"
      @dragend="onDragEnd"
    >
      <step-card
        :step="step"
        :expanded="step.expanded"
        @toggle="toggleStep(step.id)"
      >
        <template #actions>
          <button
            class="p-1 text-gray-400 hover:text-red-500"
            title="Remove step"
            @click.stop="removeStep(step.id)"
          >
            <XIcon class="h-4 w-4" />
          </button>
        </template>

        <!-- Dynamic step content based on egg type -->
        <curiosity-step v-if="step.eggType === 'curiosity'" :step="step" :previous-steps="steps.slice(0, index)" :initial-data="initialData" :arrival-time="getArrivalTime(index)" :departure-time="getDepartureTime(index)" />
        <integrity-step v-else-if="step.eggType === 'integrity'" :step="step" :previous-steps="steps.slice(0, index)" :initial-data="initialData" :arrival-time="getArrivalTime(index)" :departure-time="getDepartureTime(index)" />
        <kindness-step v-else-if="step.eggType === 'kindness'" :step="step" :previous-steps="steps.slice(0, index)" :initial-data="initialData" :arrival-time="getArrivalTime(index)" :departure-time="getDepartureTime(index)" />
        <humility-step v-else-if="step.eggType === 'humility'" :step="step" :previous-steps="steps.slice(0, index)" :initial-data="initialData" :arrival-time="getArrivalTime(index)" :departure-time="getDepartureTime(index)" />
        <resilience-step v-else-if="step.eggType === 'resilience'" :step="step" :previous-steps="steps.slice(0, index)" :initial-data="initialData" :arrival-time="getArrivalTime(index)" :departure-time="getDepartureTime(index)" />
      </step-card>
    </div>

    <!-- Add step buttons -->
    <div class="flex flex-wrap gap-2 pt-4">
      <span class="text-sm text-gray-500 self-center mr-2">Add step:</span>
      <button
        v-for="egg in virtueEggs"
        :key="egg"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
        :class="eggButtonColors[egg]"
        @click="addStep(egg)"
      >
        <img :src="iconURL(eggIcons[egg], 64)" class="h-5 w-5" />
        {{ eggNames[egg] }} ({{ eggPurchases[egg] }})
      </button>
    </div>

    <!-- Import/Export -->
    <div class="flex gap-2 pt-4 border-t border-gray-200 mt-4">
      <button
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        @click="exportPlan"
      >
        Export Plan
      </button>
      <button
        class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        @click="importPlan"
      >
        Import Plan
      </button>
    </div>

    <!-- Completion Summary -->
    <completion-summary
      :steps="steps"
      :initial-data="initialData"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from 'vue';
import { XIcon } from '@heroicons/vue/solid';
import { iconURL } from 'lib';
import type { AscensionStep, VirtueEgg, InitialData, StepMetrics } from '@/types';
import {
  VIRTUE_EGG_ABBREV,
  VIRTUE_EGG_NAMES,
  generateStepId,
  calculateVisitNumbers,
  type Modifiers,
} from '@/types';
import { encodePlan, decodePlan } from '@/lib/serialization';
import { computeTimeline, type StepTimeline } from '@/lib/duration_calculations';
import { computeStepMetrics, determineFinalVisits } from '@/lib/step_metrics';

const ABBREV_TO_EGG: Record<string, VirtueEgg> = {
  C: 'curiosity',
  I: 'integrity',
  K: 'kindness',
  H: 'humility',
  R: 'resilience',
};
import StepCard from '@/components/StepCard.vue';
import InitialStateStep from '@/components/InitialStateStep.vue';
import CompletionSummary from '@/components/CompletionSummary.vue';
import CuriosityStep from '@/components/steps/CuriosityStep.vue';
import IntegrityStep from '@/components/steps/IntegrityStep.vue';
import KindnessStep from '@/components/steps/KindnessStep.vue';
import HumilityStep from '@/components/steps/HumilityStep.vue';
import ResilienceStep from '@/components/steps/ResilienceStep.vue';

const VIRTUE_EGGS: VirtueEgg[] = ['curiosity', 'integrity', 'kindness', 'humility', 'resilience'];

const EGG_BUTTON_COLORS: Record<VirtueEgg, string> = {
  curiosity: 'bg-blue-600 hover:bg-blue-700',
  integrity: 'bg-green-600 hover:bg-green-700',
  kindness: 'bg-pink-600 hover:bg-pink-700',
  humility: 'bg-purple-600 hover:bg-purple-700',
  resilience: 'bg-orange-600 hover:bg-orange-700',
};

const EGG_ICONS: Record<VirtueEgg, string> = {
  curiosity: 'egginc/egg_curiosity.png',
  integrity: 'egginc/egg_integrity.png',
  kindness: 'egginc/egg_kindness.png',
  humility: 'egginc/egg_humility.png',
  resilience: 'egginc/egg_resilience.png',
};

const EGG_PURCHASES: Record<VirtueEgg, string> = {
  curiosity: 'Research',
  integrity: 'Habs',
  kindness: 'Vehicles',
  humility: 'Artifacts',
  resilience: 'Silos',
};

const PRESETS = [
  { label: 'A1: CIK CRIRH', value: 'CIK CRIRH' },
  { label: 'A3-4 (CTE 170-190): CIK CKI RCH KRICH', value: 'CIK CKI RCH KRICH' },
  // Add more presets here as needed
];

// InitialData is imported from @/types

export default defineComponent({
  components: {
    XIcon,
    StepCard,
    InitialStateStep,
    CompletionSummary,
    CuriosityStep,
    IntegrityStep,
    KindnessStep,
    HumilityStep,
    ResilienceStep,
  },
  props: {
    initialData: {
      type: Object as () => InitialData | undefined,
      default: undefined,
    },
  },
  setup(props) {
    const steps = ref<AscensionStep[]>([]);
    const sequenceInput = ref('');
    let updatingFromSteps = false;

    // Drag and drop state
    const draggedIndex = ref<number | null>(null);
    const dropTargetIndex = ref<number | null>(null);

    // Convert steps to sequence string
    const stepsToSequence = (stepList: AscensionStep[]): string => {
      return stepList.map((s) => VIRTUE_EGG_ABBREV[s.eggType]).join('');
    };

    // Parse sequence string to steps
    const parseSequenceInput = () => {
      if (updatingFromSteps) return;

      const input = sequenceInput.value.toUpperCase().replace(/\s/g, '');
      const newSteps: AscensionStep[] = [];

      for (const char of input) {
        const eggType = ABBREV_TO_EGG[char];
        if (eggType) {
          newSteps.push({
            id: generateStepId(),
            eggType,
            visitNumber: 0,
            expanded: false,
            researchLog: [],
            vehicleLog: [],
            modifiers: props.initialData?.modifiers,
          });
        }
      }

      steps.value = newSteps;
    };

    // Recalculate visit numbers whenever steps change
    watch(
      steps,
      (newSteps) => {
        calculateVisitNumbers(newSteps);
        // Determine which steps are final visits (for duration calculations)
        if (props.initialData) {
          determineFinalVisits(newSteps, props.initialData);
        }
        // Update sequence input to match steps
        updatingFromSteps = true;
        sequenceInput.value = stepsToSequence(newSteps);
        updatingFromSteps = false;
      },
      { deep: true }
    );

    const addStep = (eggType: VirtueEgg) => {
      const newStep: AscensionStep = {
        id: generateStepId(),
        eggType,
        visitNumber: 0, // Will be calculated by watch
        expanded: true,
        researchLog: [],
        vehicleLog: [],
        artifacts: eggType === 'humility' ? [null, null, null, null] : undefined,
        modifiers: props.initialData?.modifiers,
      };
      steps.value.push(newStep);
    };

    const removeStep = (id: string) => {
      const index = steps.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        steps.value.splice(index, 1);
      }
    };

    const toggleStep = (id: string) => {
      const step = steps.value.find((s) => s.id === id);
      if (step) {
        step.expanded = !step.expanded;
      }
    };

    const exportPlan = () => {
      const encoded = encodePlan(steps.value);
      navigator.clipboard.writeText(encoded);
      alert('Plan copied to clipboard!');
    };

    const importPlan = () => {
      const encoded = prompt('Paste your exported plan:');
      if (encoded) {
        try {
          steps.value = decodePlan(encoded);
        } catch (e) {
          alert('Invalid plan data');
        }
      }
    };

    const applyPreset = (event: Event) => {
      const select = event.target as HTMLSelectElement;
      const value = select.value;
      if (value) {
        sequenceInput.value = value;
        parseSequenceInput();
        select.value = ''; // Reset dropdown
      }
    };

    // Drag and drop handlers
    const onDragStart = (index: number, event: DragEvent) => {
      draggedIndex.value = index;
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
    };

    const onDragOver = (index: number) => {
      if (draggedIndex.value !== null && draggedIndex.value !== index) {
        dropTargetIndex.value = index;
      }
    };

    const onDragLeave = () => {
      dropTargetIndex.value = null;
    };

    const onDrop = (index: number) => {
      if (draggedIndex.value !== null && draggedIndex.value !== index) {
        const draggedStep = steps.value[draggedIndex.value];
        steps.value.splice(draggedIndex.value, 1);
        steps.value.splice(index, 0, draggedStep);
      }
      dropTargetIndex.value = null;
    };

    const onDragEnd = () => {
      draggedIndex.value = null;
      dropTargetIndex.value = null;
    };

    // Compute timeline for all steps
    const timeline = computed<StepTimeline[]>(() => {
      if (!props.initialData || steps.value.length === 0) {
        return [];
      }
      // getMetrics function for computeTimeline
      const getMetrics = (step: AscensionStep, previousSteps: AscensionStep[]) =>
        computeStepMetrics(step, previousSteps, props.initialData!);
      return computeTimeline(steps.value, props.initialData, getMetrics);
    });

    // Helper to get arrival time for a step by index
    const getArrivalTime = (index: number): number | undefined => {
      return timeline.value[index]?.arrivalTimestamp;
    };

    // Helper to get departure time for a step by index
    const getDepartureTime = (index: number): number | undefined => {
      return timeline.value[index]?.departureTimestamp;
    };

    return {
      steps,
      sequenceInput,
      parseSequenceInput,
      presets: PRESETS,
      applyPreset,
      virtueEggs: VIRTUE_EGGS,
      eggAbbrev: VIRTUE_EGG_ABBREV,
      eggNames: VIRTUE_EGG_NAMES,
      eggButtonColors: EGG_BUTTON_COLORS,
      eggIcons: EGG_ICONS,
      eggPurchases: EGG_PURCHASES,
      iconURL,
      addStep,
      removeStep,
      toggleStep,
      exportPlan,
      importPlan,
      // Drag and drop
      draggedIndex,
      dropTargetIndex,
      onDragStart,
      onDragOver,
      onDragLeave,
      onDrop,
      onDragEnd,
      // Timeline
      timeline,
      getArrivalTime,
      getDepartureTime,
    };
  },
});
</script>
