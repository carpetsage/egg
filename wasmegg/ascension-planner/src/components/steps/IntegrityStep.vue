<template>
  <div class="space-y-4">
    <div class="text-sm text-gray-600">
      <p class="font-medium text-gray-900 mb-2">Habitats</p>
      <p>Click a slot to upgrade or add a habitat.</p>
    </div>

    <!-- Hab Slots Grid + Total -->
    <div class="flex gap-4 items-center">
      <!-- 2x2 Hab Grid -->
      <div class="grid grid-cols-2 gap-2 flex-shrink-0">
        <div
          v-for="(hab, index) in habs"
          :key="index"
          class="relative border-2 rounded-lg p-2 cursor-pointer transition-all hover:border-green-400 w-24"
          :class="hab ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'"
          @click="openSlotPicker(index)"
        >
          <div v-if="hab" class="text-center">
            <img :src="iconURL(hab.iconPath, 64)" class="h-10 w-10 mx-auto mb-1" />
            <p class="text-xs font-medium text-gray-900 truncate">{{ hab.name }}</p>
            <p class="text-xs text-gray-500">{{ formatEIValue(getModifiedHabCapacity(hab)) }}</p>
          </div>
          <div v-else class="text-center py-2">
            <div class="w-10 h-10 mx-auto mb-1 rounded-full bg-gray-200 flex items-center justify-center">
              <span class="text-xl text-gray-400">+</span>
            </div>
            <p class="text-xs text-gray-400">Empty</p>
          </div>
          <div class="absolute top-0.5 right-1 text-xs text-gray-400">#{{ index + 1 }}</div>
        </div>
      </div>

      <!-- Total Hab Space -->
      <div class="flex-1 bg-green-50 rounded-lg p-4 text-center relative overflow-hidden">
        <p class="text-sm text-gray-600 mb-1">Total Hab Space</p>
        <p class="text-3xl font-bold text-green-700">{{ formatEIValue(totalHabSpace) }}</p>
        <div v-if="(step.modifiers?.habCap ?? 1) > 1" class="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">
          <span class="opacity-70">Colleggtibles:</span>
          +{{ ((step.modifiers.habCap - 1) * 100).toFixed(0) }}%
        </div>
      </div>
    </div>

    <!-- Upgrade Log -->
    <div v-if="upgradeLog.length > 0" class="border border-gray-200 rounded-lg">
      <div class="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <p class="text-sm font-medium text-gray-700">Upgrade Log</p>
      </div>
      <div class="max-h-48 overflow-y-auto">
        <div
          v-for="(entry, index) in upgradeLog"
          :key="entry.id || index"
          class="px-3 py-2 text-sm border-b border-gray-100 last:border-b-0"
        >
          <div v-if="entry" class="flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-grow">
                <span class="font-medium text-gray-700">#{{ index + 1 }}</span>
                <span class="text-gray-600">
                  Slot {{ entry.slotIndex + 1 }}:
                  <span class="text-gray-500">{{ entry.fromHab?.name || 'Empty' }}</span>
                  →
                  <span class="text-green-600 font-medium">{{ entry.toHab.name }}</span>
                </span>
              </div>
              <button
                class="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="!canRemoveEntry(index)"
                title="Remove entry (only allowed if no newer updates for this slot)"
                @click="removeEntry(index)"
              >
                <XIcon class="h-4 w-4" />
              </button>
            </div>
            <div class="ml-6 text-xs text-gray-500">
              Cost: <span class="font-medium">{{ formatEIValue(safeEntryCost(entry)) }}</span> gems
              · Space: {{ formatEIValue(safeEntrySpaceBefore(entry)) }} → {{ formatEIValue(safeEntrySpaceAfter(entry)) }}
              <span class="text-green-600">(+{{ formatPercent(safeEntryPercentGain(entry)) }})</span>
            </div>
          </div>
        </div>
      </div>
      <div class="px-3 py-2 bg-gray-50 border-t border-gray-200 text-sm">
        <span class="text-gray-600">Total Cost:</span>
        <span class="font-medium text-gray-900 ml-1">{{ formatEIValue(totalCost) }} gems</span>
      </div>
    </div>

    <!-- Hab Picker Modal -->
    <div
      v-if="pickerSlotIndex !== null"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closePicker"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 class="font-medium text-gray-900">
            {{ habs[pickerSlotIndex] ? 'Upgrade' : 'Choose' }} Hab for Slot {{ pickerSlotIndex + 1 }}
          </h3>
          <button class="text-gray-400 hover:text-gray-600" @click="closePicker">
            <XIcon class="h-5 w-5" />
          </button>
        </div>
        <div class="p-4 overflow-y-auto max-h-[60vh]">
          <div class="space-y-2">
            <button
              v-for="habOption in availableHabsForSlot(pickerSlotIndex)"
              :key="habOption.id"
              class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-left"
              @click="selectHab(pickerSlotIndex, habOption)"
            >
              <img :src="iconURL(habOption.iconPath, 64)" class="h-10 w-10" />
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900">{{ habOption.name }}</p>
                <p class="text-sm text-gray-500">
                  Capacity: {{ formatEIValue(getModifiedHabCapacity(habOption)) }}
                </p>
              </div>
              <div class="text-right">
              <p class="text-sm font-medium text-gray-900">
                  {{ formatEIValue(getHabCost(habOption, pickerSlotIndex)) }}
                </p>
                <p class="text-xs text-gray-500">gems</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bonuses Section -->
    <div class="bg-gray-50 rounded-lg p-3 space-y-2">
      <p class="text-sm font-medium text-gray-700 mb-2">Bonuses (from player data)</p>

      <!-- Epic Research: Cheaper Contractors -->
      <div class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Cheaper Contractors</span>
          <span class="text-xs text-gray-400 ml-1">(Epic Research)</span>
        </div>
        <div class="text-right">
          <span class="font-medium text-gray-900">Level {{ cheaperContractorsLevel }}/10</span>
          <span v-if="habCostReduction > 0" class="text-green-600 ml-2">-{{ habCostReduction }}% hab cost</span>
        </div>
      </div>

      <!-- Colleggtible: Hab Cost -->
      <div v-if="habCostColleggtibleReduction > 0" class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Hab Cost</span>
          <span class="text-xs text-gray-400 ml-1">(Colleggtibles)</span>
        </div>
        <div class="text-right">
          <span class="text-green-600 font-medium">-{{ habCostColleggtibleReduction }}%</span>
        </div>
      </div>

      <!-- Colleggtible: Hab Capacity -->
      <div v-if="habCapColleggtibleBonus > 0" class="flex items-center justify-between text-sm">
        <div>
          <span class="text-gray-600">Hab Capacity</span>
          <span class="text-xs text-gray-400 ml-1">(Colleggtibles)</span>
        </div>
        <div class="text-right">
          <span class="text-green-600 font-medium">+{{ habCapColleggtibleBonus }}%</span>
        </div>
      </div>
    </div>

    <!-- Research Section -->
    <collapsible-section
      section-title="Relevant Research"
      :visible="isResearchVisible"
      @toggle="isResearchVisible = !isResearchVisible"
    >
      <div class="mt-2">
        <research-section
          :step="step"
          :previous-steps="previousSteps"
          :allowed-categories="['hab_capacity']"
          :read-only="true"
        />
      </div>
    </collapsible-section>

    <!-- Fuel Tank (available on all eggs) -->
    <!-- Hidden for now --><fuel-tank v-if="false" :step="step" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import { XIcon } from '@heroicons/vue/solid';
import { iconURL, formatEIValue, habTypes, type Hab, commonResearches, getResearchLevelFromLog } from '@/lib';
import type { AscensionStep, InitialData } from '@/types';
import FuelTank from '@/components/FuelTank.vue';
import ResearchSection from '@/components/ResearchSection.vue';
import CollapsibleSection from '@/components/CollapsibleSection.vue';

interface UpgradeLogEntry {
  id: string;
  slotIndex: number;
  fromHab: Hab | null;
  toHab: Hab;
  cost: number;
  spaceBefore: number;
  spaceAfter: number;
}

export default defineComponent({
  components: {
    XIcon,
    FuelTank,
    ResearchSection,
    CollapsibleSection,
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
    // Start with one Coop in slot 0, rest empty
    const habs = ref<(Hab | null)[]>([habTypes[0], null, null, null]);
    const upgradeLog = ref<UpgradeLogEntry[]>([]);
    const pickerSlotIndex = ref<number | null>(null);
    const isResearchVisible = ref(false);

    // Epic research: Cheaper Contractors (-5% hab cost per level, max 10)
    const cheaperContractorsLevel = computed(() => props.initialData?.epicResearch?.cheaperContractors || 0);
    const habCostReduction = computed(() => cheaperContractorsLevel.value * 5); // percentage

    // Colleggtible modifier for hab cost
    const habCostColleggtible = computed(() => props.step.modifiers?.habCost ?? 1);
    const habCostColleggtibleReduction = computed(() => Math.round((1 - habCostColleggtible.value) * 100));

    // Colleggtible modifier for hab capacity
    const habCapColleggtible = computed(() => props.step.modifiers?.habCap ?? 1);
    const habCapColleggtibleBonus = computed(() => Math.round((habCapColleggtible.value - 1) * 100));

    // Calculate the total capacity multiplier from research and colleggtibles
    const habCapacityMultiplier = computed(() => {
      // Apply research multipliers
      // Filter common researches for 'hab_capacity'
      const habResearches = commonResearches.filter(r => r.categories && r.categories.includes('hab_capacity'));
      
      let researchMultiplier = 1;
      const fullResearchLog = [...(props.previousSteps || []).flatMap(s => s.researchLog || []), ...(props.step.researchLog || [])];
      
      for (const research of habResearches) {
        const level = getResearchLevelFromLog(fullResearchLog, research.id);
        if (level > 0) {
           const bonus = level * research.per_level;
           if (research.effect_type === 'multiplicative') {
             researchMultiplier *= (1 + bonus);
           }
        }
      }

      // Apply Colleggtible modifier if present
      const collModifier = props.step.modifiers?.habCap ?? 1;
      
      return researchMultiplier * collModifier;
    });

    const getModifiedHabCapacity = (hab: Hab | null): number => {
      if (!hab) return 0;
      return Math.floor(hab.baseHabSpace * habCapacityMultiplier.value);
    };

    // Calculate total hab space
    const totalHabSpace = computed(() => {
      const baseSpace = habs.value.reduce((sum, hab) => sum + (hab?.baseHabSpace || 0), 0);
      return Math.floor(baseSpace * habCapacityMultiplier.value);
    });

    // Calculate total cost from upgrade log
    const totalCost = computed(() => {
      // Explicit safety check
      return upgradeLog.value.reduce((sum, entry) => {
        if (!entry || typeof entry.cost !== 'number') return sum;
        return sum + entry.cost;
      }, 0);
    });

    // Get cost for a hab in a specific slot
    const getHabCost = (hab: Hab, slotIndex: number): number => {
      // Defensive check
      if (!hab || !hab.virtueCost) return 0;
      return hab.virtueCost[slotIndex] || 0;
    };

    // Get available habs for a slot (must be bigger than current)
    const availableHabsForSlot = (slotIndex: number): Hab[] => {
      const currentHab = habs.value[slotIndex];
      const currentId = currentHab?.id ?? -1;

      // Return all habs with ID greater than current
      return habTypes.filter(hab => hab.id > currentId);
    };

    const openSlotPicker = (index: number) => {
      pickerSlotIndex.value = index;
    };

    const closePicker = () => {
      pickerSlotIndex.value = null;
    };

    const selectHab = (slotIndex: number, hab: Hab) => {
      const spaceBefore = totalHabSpace.value;
      const fromHab = habs.value[slotIndex];
      const cost = getHabCost(hab, slotIndex);

      // Update the hab
      habs.value[slotIndex] = hab;

      const spaceAfter = totalHabSpace.value;

      // Log the upgrade
      const newEntry: UpgradeLogEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        slotIndex,
        fromHab,
        toHab: hab,
        cost,
        spaceBefore,
        spaceAfter,
      };
      
      upgradeLog.value.push(newEntry);

      closePicker();
    };

    // Check if an entry can be removed (must be the latest for its slot)
    const canRemoveEntry = (index: number): boolean => {
      const entry = upgradeLog.value[index];
      // Defensive check
      if (!entry) return false;
      
      // Check if there are any later entries for the same slot
      for (let i = index + 1; i < upgradeLog.value.length; i++) {
        const checkEntry = upgradeLog.value[i]; 
        if (checkEntry && checkEntry.slotIndex === entry.slotIndex) {
          return false;
        }
      }
      return true;
    };

    // Remove an entry and revert the change
    const removeEntry = (index: number) => {
      if (!canRemoveEntry(index)) return;

      const entry = upgradeLog.value[index];
      // Revert the hab slot
      habs.value[entry.slotIndex] = entry.fromHab;
      // Remove the log entry
      upgradeLog.value.splice(index, 1);
    };

    const formatPercent = (value: number): string => {
      if (!isFinite(value)) return '∞';
      return `${(value * 100).toFixed(0)}%`;
    };

    // Safe accessors for template to avoid "undefined" errors
    const safeEntryCost = (entry: UpgradeLogEntry | undefined): number => {
      if (!entry || typeof entry.cost !== 'number') return 0;
      return entry.cost;
    };

    const safeEntrySpaceBefore = (entry: UpgradeLogEntry | undefined): number => {
      return entry?.spaceBefore || 0;
    };

    const safeEntrySpaceAfter = (entry: UpgradeLogEntry | undefined): number => {
      return entry?.spaceAfter || 0;
    };

    const safeEntryPercentGain = (entry: UpgradeLogEntry | undefined): number => {
      if (!entry || !entry.spaceBefore) return 0;
      return (entry.spaceAfter / entry.spaceBefore) - 1;
    };

    return {
      habs,
      upgradeLog,
      pickerSlotIndex,
      totalHabSpace,
      totalCost,
      habTypes,
      getHabCost,
      availableHabsForSlot,
      openSlotPicker,
      closePicker,
      selectHab,
      iconURL,
      formatEIValue,
      formatPercent,
      canRemoveEntry,
      removeEntry,
      safeEntryCost,
      safeEntrySpaceBefore,
      safeEntrySpaceAfter,
      safeEntryPercentGain,
      isResearchVisible,
      getModifiedHabCapacity,
      // Epic research & colleggtibles
      cheaperContractorsLevel,
      habCostReduction,
      habCostColleggtibleReduction,
      habCapColleggtibleBonus,
    };
  },
});
</script>
