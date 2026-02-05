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

          <!-- Dual Artifacts Section -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-bold text-gray-400 uppercase tracking-widest px-1">
                Artifact Loadouts
              </label>
              <div class="flex items-center gap-2 text-sm">
                <span class="text-gray-500">Initial Active:</span>
                <label class="inline-flex items-center cursor-pointer">
                  <input
                    v-model="state.activeArtifactSet"
                    type="radio"
                    value="earnings"
                    class="form-radio h-4 w-4 text-blue-600"
                  />
                  <span class="ml-1 text-gray-700">Earnings</span>
                </label>
                <label class="inline-flex items-center cursor-pointer ml-3">
                  <input
                    v-model="state.activeArtifactSet"
                    type="radio"
                    value="elr"
                    class="form-radio h-4 w-4 text-green-600"
                  />
                  <span class="ml-1 text-gray-700">ELR</span>
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Earnings Artifacts -->
              <div :class="['p-3 rounded-lg border-2', state.activeArtifactSet === 'earnings' ? 'border-blue-400 bg-blue-50' : 'border-gray-200']">
                <label class="block text-sm font-medium text-blue-700 mb-2">
                  Earnings Set
                </label>
                <artifact-loadout v-model:loadout="state.earningsArtifacts" />
              </div>

              <!-- ELR Artifacts -->
              <div :class="['p-3 rounded-lg border-2', state.activeArtifactSet === 'elr' ? 'border-green-400 bg-green-50' : 'border-gray-200']">
                <label class="block text-sm font-medium text-green-700 mb-2">
                  ELR Set
                </label>
                <artifact-loadout v-model:loadout="state.elrArtifacts" />
              </div>
            </div>
          </div>

          <!-- Start Time -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Ascension Start Time
            </label>
            <div class="flex items-center gap-3">
              <input
                v-model="startTimeLocal"
                type="datetime-local"
                class="px-4 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                @click="setStartTimeToNow"
              >
                Now
              </button>
              <span class="text-sm text-gray-500">
                {{ formatRelativeTime(state.startTime) }}
              </span>
            </div>
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

          <!-- Virtue Eggs Progress Table -->
          <div>
            <label class="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
              Virtue Egg Progress
            </label>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="px-2 py-2 text-left font-medium text-gray-500">Egg</th>
                    <th class="px-2 py-2 text-right font-medium text-gray-500">Delivered</th>
                    <th class="px-2 py-2 text-right font-medium text-gray-500">Current TE</th>
                    <th class="px-2 py-2 text-right font-medium text-gray-500">Target TE</th>
                    <th class="px-2 py-2 text-right font-medium text-gray-500">Next Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="egg in virtueEggs" :key="egg.type" class="border-b border-gray-100">
                    <td class="px-2 py-2">
                      <div class="flex items-center gap-2">
                        <img :src="iconURL(egg.iconPath, 64)" class="h-6 w-6" />
                        <span class="font-medium">{{ egg.name }}</span>
                      </div>
                    </td>
                    <td class="px-2 py-2">
                      <input
                        :value="formatEIValue(state.virtueEggsLaid[egg.type])"
                        type="text"
                        class="w-24 px-2 py-1 text-sm font-mono border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        @input="parseVirtueEggs(egg.type, $event)"
                      />
                    </td>
                    <td class="px-2 py-2 text-right font-mono text-gray-600">
                      {{ currentTEPerEgg[egg.type] }}
                    </td>
                    <td class="px-2 py-2">
                      <input
                        v-model.number="state.targetGains[egg.type]"
                        type="number"
                        min="0"
                        class="w-16 px-2 py-1 text-sm font-mono border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td class="px-2 py-2 text-right font-mono text-gray-500 text-xs">
                      {{ formatNextThreshold(nextThresholdPerEgg[egg.type]) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-gray-300 bg-gray-50">
                    <td class="px-2 py-2 font-medium">Total</td>
                    <td class="px-2 py-2"></td>
                    <td class="px-2 py-2 text-right font-mono font-medium">{{ totalCurrentTE }}</td>
                    <td class="px-2 py-2 text-right font-mono font-medium">{{ totalTargetTE }}</td>
                    <td class="px-2 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Target Total TE -->
            <div class="mt-3 flex items-center gap-3">
              <label class="text-sm font-medium text-gray-700">Target Total TE:</label>
              <input
                v-model.number="state.targetTotalTE"
                type="number"
                min="0"
                class="w-20 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span class="text-sm text-gray-500">
                ({{ state.truthEggs }} base + {{ totalTargetTE }} from gains = {{ state.truthEggs + totalTargetTE }} total)
              </span>
            </div>
          </div>
        </div>

        <!-- Placeholder for manual entry when no data loaded -->
        <div v-else>
          <ul class="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Earnings artifacts (equipped loadout)</li>
            <li>ELR artifacts (equipped loadout)</li>
            <li>Starting shifts (how many shifts already used)</li>
            <li>Starting SE (Soul Eggs)</li>
            <li>Starting TE (Truth Eggs)</li>
            <li>Starting date/time</li>
            <li>Virtue eggs laid (C, I, K, H, R counts)</li>
            <li>Target TE gains per egg</li>
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
import { defineComponent, ref, reactive, watch, computed } from 'vue';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';
import { iconURL, formatEIValue, parseValueWithUnit } from 'lib';
import type { InitialData, ArtifactLoadout, VirtueEgg } from '@/types';
import { createEmptyArtifactLoadout } from '@/types';
import { countTEFromDelivered, nextTEThreshold } from '@/lib/duration_calculations';
import ArtifactLoadoutComponent from '@/components/ArtifactLoadout.vue';
import OfflineEarningStats from '@/components/OfflineEarningStats.vue';

const VIRTUE_EGGS = [
  { type: 'curiosity' as const, name: 'Curiosity', iconPath: 'egginc/egg_curiosity.png' },
  { type: 'integrity' as const, name: 'Integrity', iconPath: 'egginc/egg_integrity.png' },
  { type: 'kindness' as const, name: 'Kindness', iconPath: 'egginc/egg_kindness.png' },
  { type: 'humility' as const, name: 'Humility', iconPath: 'egginc/egg_humility.png' },
  { type: 'resilience' as const, name: 'Resilience', iconPath: 'egginc/egg_resilience.png' },
];

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
  emits: ['update:initialState'],
  setup(props, { emit }) {
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
      } as Record<VirtueEgg, number>,
      // Original single artifact loadout (for backwards compatibility)
      artifacts: createEmptyArtifactLoadout() as ArtifactLoadout,
      // NEW: Dual artifact support
      earningsArtifacts: createEmptyArtifactLoadout() as ArtifactLoadout,
      elrArtifacts: createEmptyArtifactLoadout() as ArtifactLoadout,
      activeArtifactSet: 'earnings' as 'earnings' | 'elr',
      // NEW: Target goals
      targetTotalTE: 0,
      targetGains: {
        curiosity: 0,
        integrity: 0,
        kindness: 0,
        humility: 0,
        resilience: 0,
      } as Record<VirtueEgg, number>,
      // NEW: Start time
      startTime: Date.now(),
    });

    // Computed: datetime-local format for the input
    const startTimeLocal = computed({
      get() {
        const date = new Date(state.startTime);
        // Format as YYYY-MM-DDTHH:MM for datetime-local input
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      },
      set(value: string) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          state.startTime = date.getTime();
        }
      },
    });

    // Helper to set start time to now
    const setStartTimeToNow = () => {
      state.startTime = Date.now();
    };

    // Format relative time
    const formatRelativeTime = (timestamp: number) => {
      const now = Date.now();
      const diff = timestamp - now;
      const absDiff = Math.abs(diff);

      if (absDiff < 60000) return 'now';

      const minutes = Math.floor(absDiff / 60000);
      const hours = Math.floor(absDiff / 3600000);
      const days = Math.floor(absDiff / 86400000);

      let text = '';
      if (days > 0) {
        text = `${days}d ${hours % 24}h`;
      } else if (hours > 0) {
        text = `${hours}h ${minutes % 60}m`;
      } else {
        text = `${minutes}m`;
      }

      return diff > 0 ? `in ${text}` : `${text} ago`;
    };

    // Computed: Current TE per egg
    const currentTEPerEgg = computed(() => {
      const result: Record<VirtueEgg, number> = {
        curiosity: 0,
        integrity: 0,
        kindness: 0,
        humility: 0,
        resilience: 0,
      };
      for (const egg of VIRTUE_EGGS) {
        result[egg.type] = countTEFromDelivered(state.virtueEggsLaid[egg.type]);
      }
      return result;
    });

    // Computed: Next threshold per egg
    const nextThresholdPerEgg = computed(() => {
      const result: Record<VirtueEgg, number> = {
        curiosity: 0,
        integrity: 0,
        kindness: 0,
        humility: 0,
        resilience: 0,
      };
      for (const egg of VIRTUE_EGGS) {
        result[egg.type] = nextTEThreshold(state.virtueEggsLaid[egg.type]);
      }
      return result;
    });

    // Computed: Total current TE from all eggs
    const totalCurrentTE = computed(() => {
      return Object.values(currentTEPerEgg.value).reduce((sum, te) => sum + te, 0);
    });

    // Computed: Total target TE from all eggs
    const totalTargetTE = computed(() => {
      return Object.values(state.targetGains).reduce((sum, te) => sum + te, 0);
    });

    // Format next threshold
    const formatNextThreshold = (value: number) => {
      if (!isFinite(value)) return 'Max';
      return formatEIValue(value);
    };

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
          state.artifacts = newData.artifacts ? [...newData.artifacts] : createEmptyArtifactLoadout();

          // Initialize dual artifacts from single artifact if not provided
          state.earningsArtifacts = newData.earningsArtifacts
            ? [...newData.earningsArtifacts]
            : (newData.artifacts ? [...newData.artifacts] : createEmptyArtifactLoadout());
          state.elrArtifacts = newData.elrArtifacts
            ? [...newData.elrArtifacts]
            : createEmptyArtifactLoadout();
          state.activeArtifactSet = newData.activeArtifactSet || 'earnings';

          // Initialize targets
          state.targetTotalTE = newData.targetTotalTE || 0;
          state.targetGains = newData.targetGains
            ? { ...newData.targetGains }
            : { curiosity: 0, integrity: 0, kindness: 0, humility: 0, resilience: 0 };

          // Initialize start time
          state.startTime = newData.startTime || Date.now();
        }
      },
      { immediate: true }
    );

    // Emit state changes to parent
    watch(
      state,
      (newState) => {
        emit('update:initialState', { ...newState });
      },
      { deep: true }
    );

    // Parse egg notation input for soul eggs
    const parseSoulEggs = (event: Event) => {
      const input = (event.target as HTMLInputElement).value;
      const parsed = parseValueWithUnit(input, false);
      if (parsed !== null && !isNaN(parsed)) {
        state.soulEggs = parsed;
      }
    };

    // Parse egg notation input for virtue eggs
    const parseVirtueEggs = (type: VirtueEgg, event: Event) => {
      const input = (event.target as HTMLInputElement).value;
      const parsed = parseValueWithUnit(input, false);
      if (parsed !== null && !isNaN(parsed)) {
        state.virtueEggsLaid[type] = parsed;
      }
    };

    return {
      expanded,
      state,
      startTimeLocal,
      setStartTimeToNow,
      formatRelativeTime,
      currentTEPerEgg,
      nextThresholdPerEgg,
      totalCurrentTE,
      totalTargetTE,
      formatNextThreshold,
      virtueEggs: VIRTUE_EGGS,
      iconURL,
      formatEIValue,
      parseSoulEggs,
      parseVirtueEggs,
    };
  },
});
</script>
