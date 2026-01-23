<template>
  <div class="space-y-4">
    <div class="text-sm text-gray-600">
      <p class="font-medium text-gray-900 mb-2">Rockets & Artifacts</p>
      <p>Configure rocket launches and artifact loadout for this Humility visit.</p>
      <p class="text-xs text-purple-600 mt-1">
        Note: Humility is the only egg where you can change your equipped artifacts.
      </p>
    </div>

    <!-- Rocket Scheduler -->
    <rocket-scheduler
      v-model="scheduledLaunches"
      :tank-state="tankState"
      :epic-research="epicResearch"
    />

    <!-- Epic Research Info (Mission-related) -->
    <div class="bg-gray-50 rounded-lg p-3">
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-xs text-gray-500">FTL Drive (Mission Duration)</p>
          <p class="font-medium text-gray-900">
            Level {{ epicResearch.afxMissionTime }}/60
            <span class="text-purple-600 text-xs ml-1">(-{{ epicResearch.afxMissionTime }}%)</span>
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Zero-g Quantum (Capacity)</p>
          <p class="font-medium text-gray-900">
            Level {{ epicResearch.afxMissionCapacity }}/10
            <span class="text-purple-600 text-xs ml-1">(+{{ epicResearch.afxMissionCapacity * 5 }}%)</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Artifact loadout UI -->
    <div>
      <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-3">Equipped Artifacts</h3>
      <artifact-loadout v-model:loadout="artifactLoadout" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';
import type { AscensionStep, InitialData, VirtueEgg, EpicResearchLevels, ScheduledLaunch, ArtifactLoadout as ArtifactLoadoutType } from '@/types';
import ArtifactLoadout from '@/components/ArtifactLoadout.vue';
import RocketScheduler from '@/components/rockets/RocketScheduler.vue';

// Default epic research values if not provided
const DEFAULT_EPIC_RESEARCH: EpicResearchLevels = {
  siloCapacity: 0,
  cheaperContractors: 0,
  bustUnions: 0,
  transportationLobbyist: 0,
  labUpgrade: 0,
  afxMissionTime: 0,
  afxMissionCapacity: 0,
};

export default defineComponent({
  components: {
    ArtifactLoadout,
    RocketScheduler,
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
  },
  setup(props) {
    // Get epic research from initial data or use defaults
    const epicResearch = computed<EpicResearchLevels>(() => ({
      ...DEFAULT_EPIC_RESEARCH,
      ...props.initialData?.epicResearch,
    }));

    // For now, use a placeholder tank state
    // TODO: This should come from fuel tank management in future
    const tankState = computed<Record<VirtueEgg, number>>(() => ({
      curiosity: props.initialData?.virtueEggsLaid?.curiosity || 0,
      integrity: props.initialData?.virtueEggsLaid?.integrity || 0,
      kindness: props.initialData?.virtueEggsLaid?.kindness || 0,
      humility: 0, // Humility comes from production, not tank
      resilience: props.initialData?.virtueEggsLaid?.resilience || 0,
    }));

    // Computed getter/setter for scheduled launches
    const scheduledLaunches = computed({
      get: () => props.step.scheduledLaunches || [],
      set: (value: ScheduledLaunch[]) => {
        props.step.scheduledLaunches = value;
      },
    });

    // Computed getter/setter for artifact loadout
    const artifactLoadout = computed({
      get: (): ArtifactLoadoutType => props.step.artifacts || [null, null, null, null],
      set: (value: ArtifactLoadoutType) => {
        props.step.artifacts = value;
      },
    });

    return {
      epicResearch,
      tankState,
      scheduledLaunches,
      artifactLoadout,
    };
  },
});
</script>
