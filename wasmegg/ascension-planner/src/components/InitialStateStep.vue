<template>
  <div class="border border-gray-300 rounded-lg mb-2 overflow-hidden">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 bg-gray-100 cursor-pointer select-none"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-3">
        <span
          class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 text-white font-bold text-lg"
        >
          0
        </span>
        <div>
          <h3 class="font-semibold text-gray-900">Initial State</h3>
          <p class="text-sm text-gray-500">Starting conditions for your ascension</p>
        </div>
      </div>
      <component
        :is="expanded ? 'ChevronUpIcon' : 'ChevronDownIcon'"
        class="h-5 w-5 text-gray-400"
      />
    </div>

    <!-- Expandable content -->
    <div v-show="expanded" class="border-t border-gray-200 px-4 py-4 bg-white">
      <div class="space-y-5">
        <p class="text-sm text-gray-600">
          {{ initialData ? 'Loaded from your player data. Edit as needed.' : 'Configure your starting state before the first shift.' }}
        </p>

        <!-- Display loaded data if available -->
        <div v-if="initialData" class="space-y-6">
          <!-- Stats Summary -->
          <offline-earning-stats 
            :truth-eggs="state.truthEggs"
            :artifacts="state.artifacts"
            :modifiers="initialData.modifiers"
          />

          <!-- Artifacts Section -->
          <div>
            <label class="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
               Earnings Artifacts
            </label>
            <artifact-loadout v-model:loadout="state.artifacts" />
          </div>

          <!-- Soul Eggs -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              <img :src="iconURL('egginc/egg_soul.png', 64)" class="inline h-5 w-5 mr-1" />
              Soul Eggs
            </label>
            <input
              :value="formatEIValue(state.soulEggs)"
              type="text"
              class="w-full px-4 py-3 text-lg font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              @input="parseSoulEggs($event)"
            />
          </div>

          <!-- Truth Eggs and Shifts row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-5 w-5 mr-1" />
                Truth Eggs
              </label>
              <div class="flex gap-2">
                <input
                  v-model.number="state.truthEggs"
                  type="number"
                  class="w-full px-4 py-3 text-lg font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Base TE"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Shifts Completed</label>
              <input
                v-model.number="state.totalShifts"
                type="number"
                class="w-full px-4 py-3 text-lg font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Virtue eggs delivered -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Virtue Eggs Delivered</label>
            <div class="grid grid-cols-5 gap-3">
              <div v-for="egg in virtueEggs" :key="egg.type" class="text-center">
                <img :src="iconURL(egg.iconPath, 64)" class="h-8 w-8 mx-auto mb-2" />
                <input
                  :value="formatEIValue(state.virtueEggsLaid[egg.type])"
                  type="text"
                  class="w-full px-2 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                  @input="parseVirtueEggs(egg.type, $event)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Placeholder for manual entry when no data loaded -->
        <div v-else>
          <ul class="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Earnings artifacts (equipped loadout)</li>
            <li>Starting shifts (how many shifts already used)</li>
            <li>Starting SE (Soul Eggs)</li>
            <li>Starting TE (Truth Eggs)</li>
            <li>Starting date/time</li>
            <li>Virtue eggs laid (C, I, K, H, R counts)</li>
          </ul>
          <p class="text-xs text-gray-400 italic mt-4">
            Load player data to auto-fill, or inputs coming soon...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch } from 'vue';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';
import { iconURL, formatEIValue, parseValueWithUnit } from 'lib';
import type { InitialData, ArtifactLoadout } from '@/types';
import ArtifactLoadoutComponent from '@/components/ArtifactLoadout.vue';
import OfflineEarningStats from '@/components/OfflineEarningStats.vue';

const VIRTUE_EGGS = [
  { type: 'curiosity' as const, iconPath: 'egginc/egg_curiosity.png' },
  { type: 'integrity' as const, iconPath: 'egginc/egg_integrity.png' },
  { type: 'kindness' as const, iconPath: 'egginc/egg_kindness.png' },
  { type: 'humility' as const, iconPath: 'egginc/egg_humility.png' },
  { type: 'resilience' as const, iconPath: 'egginc/egg_resilience.png' },
];

type VirtueEggType = 'curiosity' | 'integrity' | 'kindness' | 'humility' | 'resilience';

export default defineComponent({
  components: {
    ChevronDownIcon,
    ChevronUpIcon,
    ArtifactLoadout: ArtifactLoadoutComponent,
    OfflineEarningStats,
  },
  props: {
    initialData: {
      type: Object as () => InitialData | undefined,
      default: undefined,
    },
  },
  setup(props) {
    const expanded = ref(true);

    // Editable state - initialize from props or defaults
    const state = reactive({
      soulEggs: 0,
      truthEggs: 0,
      clothedTruthEggs: 0,
      totalShifts: 0,
      totalResets: 0,
      virtueEggsLaid: {
        curiosity: 0,
        integrity: 0,
        kindness: 0,
        humility: 0,
        resilience: 0,
      } as Record<VirtueEggType, number>,
      artifacts: [null, null, null, null] as ArtifactLoadout,
    });

    // Update state when initialData changes
    watch(
      () => props.initialData,
      (newData) => {
        if (newData) {
          state.soulEggs = newData.soulEggs;
          state.truthEggs = newData.truthEggs;
          state.clothedTruthEggs = newData.clothedTruthEggs;
          state.totalShifts = newData.totalShifts;
          state.totalResets = newData.totalResets;
          state.virtueEggsLaid = { ...newData.virtueEggsLaid };
          state.artifacts = newData.artifacts ? [...newData.artifacts] : [null, null, null, null];
        }
      },
      { immediate: true }
    );

    // Parse egg notation input for soul eggs
    const parseSoulEggs = (event: Event) => {
      const input = (event.target as HTMLInputElement).value;
      const parsed = parseValueWithUnit(input, false); // unitRequired = false to allow plain numbers
      if (parsed !== null && !isNaN(parsed)) {
        state.soulEggs = parsed;
      }
    };

    // Parse egg notation input for virtue eggs
    const parseVirtueEggs = (type: VirtueEggType, event: Event) => {
      const input = (event.target as HTMLInputElement).value;
      const parsed = parseValueWithUnit(input, false); // unitRequired = false to allow plain numbers
      if (parsed !== null && !isNaN(parsed)) {
        state.virtueEggsLaid[type] = parsed;
      }
    };

    return {
      expanded,
      state,
      virtueEggs: VIRTUE_EGGS,
      iconURL,
      formatEIValue,
      parseSoulEggs,
      parseVirtueEggs,
    };
  },
});
</script>
