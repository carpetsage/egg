<template>
  <div class="space-y-6">
    <!-- Cost Discounts Section -->
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 class="font-medium text-gray-900">Research Cost Discounts</h3>
      </div>
      <div class="divide-y divide-gray-100">
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img
              :src="iconURL(getColleggtibleIconPath('cheaper_research'), 64)"
              class="w-6 h-6 object-contain"
              alt="Lab Upgrade"
            />
            <span class="text-gray-600">Lab Upgrade</span>
            <span class="text-xs text-gray-400 ml-1">(Epic Research)</span>
          </div>
          <span class="font-mono" :class="labUpgradeLevel > 0 ? 'text-purple-600' : 'text-gray-400'">
            {{ labUpgradeLevel > 0 ? `-${labUpgradeLevel * 5}%` : '—' }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img
              :src="iconURL(getColleggtibleIconPath('waterballoon'), 64)"
              class="w-6 h-6 object-contain"
              alt="Waterballoon"
            />
            <span class="text-gray-600">Waterballoon</span>
            <span class="text-xs text-gray-400 ml-1">(Colleggtible)</span>
          </div>
          <span class="font-mono" :class="waterballoonMultiplier < 1 ? 'text-blue-600' : 'text-gray-400'">
            {{ waterballoonMultiplier < 1 ? formatPercent(waterballoonMultiplier - 1, 0) : '—' }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <img :src="iconURL('egginc/afx_puzzle_cube_4.png', 64)" class="w-6 h-6 object-contain" alt="Puzzle Cube" />
            <span class="text-gray-600">Puzzle Cube</span>
            <span class="text-xs text-gray-400 ml-1">(Artifact)</span>
          </div>
          <span class="font-mono" :class="puzzleCubeMultiplier < 1 ? 'text-purple-600' : 'text-gray-400'">
            {{ puzzleCubeMultiplier < 1 ? formatPercent(puzzleCubeMultiplier - 1, 0) : '—' }}
          </span>
        </div>
        <div class="px-4 py-2 flex justify-between items-center bg-gray-50">
          <span class="font-medium text-gray-900">Total Discount</span>
          <span class="font-mono font-medium" :class="totalMultiplier < 1 ? 'text-green-600' : 'text-gray-400'">
            {{ totalMultiplier < 1 ? formatPercent(totalMultiplier - 1, 0) : '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Progress Summary -->
    <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
      <div class="flex justify-between items-center">
        <div>
          <div class="text-sm text-indigo-700 font-medium">Research Progress</div>
          <div class="text-2xl font-bold text-indigo-900">{{ totalPurchases }} / {{ totalLevels }} levels</div>
        </div>
        <div class="flex gap-2">
          <button class="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded" @click="resetAll">Reset All</button>
          <button class="px-3 py-1.5 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded" @click="maxAll">
            Max All
          </button>
        </div>
      </div>
    </div>

    <!-- Research Tiers -->
    <div v-for="tier in tiers" :key="tier" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <!-- Tier Header -->
      <div
        class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        @click="toggleTier(tier)"
      >
        <div class="flex items-center gap-3">
          <span class="text-lg font-semibold text-gray-900">Tier {{ tier }}</span>
          <span v-if="!tierSummaries[tier].isUnlocked" class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
            🔒 {{ tierSummaries[tier].purchasesNeeded }} more purchases needed
          </span>
          <span v-else class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
            {{ tierSummaries[tier].purchasedLevels }} / {{ tierSummaries[tier].totalLevels }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="tierSummaries[tier].costToMax > 0" class="text-sm text-gray-500">
            {{ formatGemPrice(tierSummaries[tier].costToMax) }} gems to max
          </span>
          <div class="flex gap-1">
            <button
              class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              :disabled="!tierSummaries[tier].isUnlocked"
              :class="{ 'opacity-50 cursor-not-allowed': !tierSummaries[tier].isUnlocked }"
              @click.stop="resetTier(tier)"
            >
              Reset
            </button>
            <button
              class="px-2 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded"
              :disabled="!tierSummaries[tier].isUnlocked"
              :class="{ 'opacity-50 cursor-not-allowed': !tierSummaries[tier].isUnlocked }"
              @click.stop="maxTier(tier)"
            >
              Max Tier
            </button>
          </div>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform"
            :class="{ 'rotate-180': expandedTiers.has(tier) }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Tier Research List (collapsible) -->
      <div v-if="expandedTiers.has(tier)" class="divide-y divide-gray-100">
        <div
          v-for="research in researchByTier.get(tier)"
          :key="research.id"
          class="px-4 py-3"
          :class="{ 'opacity-50': !tierSummaries[tier].isUnlocked }"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1 min-w-0 mr-4">
              <div class="flex items-center gap-3">
                <img
                  :src="iconURL(getColleggtibleIconPath(research.id), 64)"
                  class="w-8 h-8 object-contain"
                  :alt="research.name"
                />
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900 truncate">{{ research.name }}</span>
                    <span
                      v-if="getResearchLevel(research.id) >= research.levels"
                      class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded"
                    >
                      MAX
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-0.5">{{ research.description }}</div>
                </div>
              </div>
              <div v-if="getResearchLevel(research.id) < research.levels" class="text-xs text-amber-600 mt-1">
                Next level: {{ formatGemPrice(getNextLevelCost(research)) }} gems
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                :disabled="!tierSummaries[tier].isUnlocked || getResearchLevel(research.id) <= 0"
                @click="decrementResearch(research.id)"
              >
                -
              </button>
              <input
                type="number"
                :value="getResearchLevel(research.id)"
                :min="0"
                :max="research.levels"
                :disabled="!tierSummaries[tier].isUnlocked"
                class="w-16 text-center text-sm border border-gray-300 rounded px-1 py-1 disabled:bg-gray-100"
                @change="setResearchLevel(research.id, parseInt(($event.target as HTMLInputElement).value) || 0)"
              />
              <button
                class="w-7 h-7 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
                :disabled="!tierSummaries[tier].isUnlocked || getResearchLevel(research.id) >= research.levels"
                @click="incrementResearch(research.id)"
              >
                +
              </button>
              <span class="text-xs text-gray-400 w-12">/ {{ research.levels }}</span>
              <button
                class="px-2 py-1 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded disabled:opacity-30"
                :disabled="!tierSummaries[tier].isUnlocked || getResearchLevel(research.id) >= research.levels"
                @click="maxResearch(research.id)"
              >
                Max
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useInitialStateStore } from '@/stores/initialState';
import {
  getTiers,
  getResearchByTier,
  getCommonResearches,
  getTierSummary,
  getDiscountedVirtuePrice,
  getResearchById,
  type ResearchCostModifiers,
  type CommonResearch,
} from '@/calculations/commonResearch';
import { formatNumber, formatGemPrice, formatPercent } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';

const commonResearchStore = useCommonResearchStore();
const initialStateStore = useInitialStateStore();

const { researchLevels } = storeToRefs(commonResearchStore);
const { epicResearchLevels, colleggtibleModifiers, artifactModifiers } = storeToRefs(initialStateStore);

// Expanded tiers state
const expandedTiers = ref<Set<number>>(new Set([1])); // Start with tier 1 expanded

// Get all tiers
const tiers = computed(() => getTiers());

// Get research grouped by tier
const researchByTier = computed(() => getResearchByTier());

// Cost modifiers
const labUpgradeLevel = computed(() => epicResearchLevels.value['cheaper_research'] || 0);
const waterballoonMultiplier = computed(() => colleggtibleModifiers.value.researchCost);
const puzzleCubeMultiplier = computed(() => artifactModifiers.value.researchCost.totalMultiplier);

const costModifiers = computed<ResearchCostModifiers>(() => ({
  labUpgradeLevel: labUpgradeLevel.value,
  waterballoonMultiplier: waterballoonMultiplier.value,
  puzzleCubeMultiplier: puzzleCubeMultiplier.value,
}));

const totalMultiplier = computed(() => {
  const labMult = 1 - 0.05 * labUpgradeLevel.value;
  return labMult * waterballoonMultiplier.value * puzzleCubeMultiplier.value;
});

// Tier summaries
const tierSummaries = computed(() => {
  const summaries: Record<number, ReturnType<typeof getTierSummary>> = {};
  for (const tier of tiers.value) {
    summaries[tier] = getTierSummary(tier, researchLevels.value, costModifiers.value);
  }
  return summaries;
});

// Total progress
const totalPurchases = computed(() => commonResearchStore.totalPurchases);
const totalLevels = computed(() => {
  return getCommonResearches().reduce((sum, r) => sum + r.levels, 0);
});

// Get research level
function getResearchLevel(researchId: string): number {
  return researchLevels.value[researchId] || 0;
}

// Get next level cost
function getNextLevelCost(research: CommonResearch): number {
  const currentLevel = getResearchLevel(research.id);
  return getDiscountedVirtuePrice(research, currentLevel, costModifiers.value);
}

// Toggle tier expansion
function toggleTier(tier: number) {
  if (expandedTiers.value.has(tier)) {
    expandedTiers.value.delete(tier);
  } else {
    expandedTiers.value.add(tier);
  }
}

// Actions
function setResearchLevel(researchId: string, level: number) {
  commonResearchStore.setResearchLevel(researchId, level);
}

function incrementResearch(researchId: string) {
  commonResearchStore.incrementResearch(researchId);
}

function decrementResearch(researchId: string) {
  commonResearchStore.decrementResearch(researchId);
}

function maxResearch(researchId: string) {
  commonResearchStore.maxResearch(researchId);
}

function maxTier(tier: number) {
  commonResearchStore.maxTier(tier);
}

function resetTier(tier: number) {
  commonResearchStore.resetTier(tier);
}

function maxAll() {
  commonResearchStore.maxAll();
}

function resetAll() {
  commonResearchStore.resetAll();
}
</script>
