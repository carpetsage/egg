<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500 mb-4">
      Click + to buy one level, or Max to buy all remaining levels.
    </p>

    <!-- Research Tiers -->
    <div v-for="tier in tiers" :key="tier" class="border border-gray-200 rounded-lg overflow-hidden">
      <!-- Tier Header -->
      <div
        class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center"
      >
        <div
          class="flex items-center gap-2 flex-1 cursor-pointer"
          @click="toggleTier(tier)"
        >
          <span class="font-medium text-gray-900">Tier {{ tier }}</span>
          <span
            v-if="!tierSummaries[tier]?.isUnlocked"
            class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded"
          >
            Locked ({{ tierSummaries[tier]?.purchasesNeeded ?? '?' }} more)
          </span>
          <span
            v-else
            class="text-xs text-gray-500"
          >
            {{ tierSummaries[tier]?.purchasedLevels ?? 0 }} / {{ tierSummaries[tier]?.totalLevels ?? 0 }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Max Tier button -->
          <button
            v-if="tierSummaries[tier]?.isUnlocked && !isTierMaxed(tier)"
            class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            @click.stop="handleMaxTier(tier)"
          >
            Max Tier
          </button>
          <svg
            class="w-5 h-5 text-gray-400 transition-transform cursor-pointer"
            :class="{ 'rotate-180': expandedTiers.has(tier) }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            @click="toggleTier(tier)"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Tier Research List -->
      <div v-if="expandedTiers.has(tier)" class="divide-y divide-gray-100">
        <div
          v-for="research in getResearchesForTier(tier)"
          :key="research.id"
          class="px-4 py-2 flex items-center gap-3"
          :class="{ 'opacity-50': !tierSummaries[tier]?.isUnlocked }"
        >
          <!-- Research name and level -->
          <div class="flex-1 min-w-0 flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath(research.id), 64)" class="w-6 h-6 object-contain" :alt="research.name" />
            <div class="min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">{{ research.name }}</div>
              <div class="text-xs text-gray-500">
                Level {{ getCurrentLevel(research.id) }} / {{ research.levels }}
                <span class="mx-1 text-gray-300">|</span>
                <span class="text-gray-500">{{ research.description }}</span>
              </div>
            </div>
          </div>

          <!-- Next level price -->
          <div class="text-right w-24">
            <div v-if="getCurrentLevel(research.id) < research.levels" class="text-xs text-amber-600 font-mono">
              {{ formatNumber(getNextLevelPrice(research), 0) }}
              <div class="text-[10px] text-gray-400 mt-0.5">
                {{ getTimeToBuy(research) }}
              </div>
            </div>
            <div v-else class="text-xs text-green-600">
              Maxed
            </div>
          </div>

          <!-- Buy one level button -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="!canBuyResearch(research, tier)"
            title="Buy one level"
            @click="handleBuyResearch(research)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <!-- Max button for individual research -->
          <button
            class="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="!canBuyResearch(research, tier)"
            title="Buy all remaining levels"
            @click="handleMaxResearch(research)"
          >
            Max
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  getCommonResearches,
  getTiers,
  getResearchByTier,
  getTierSummary,
  getDiscountedVirtuePrice,
  type CommonResearch,
  type ResearchCostModifiers,
} from '@/calculations/commonResearch';
import { formatNumber, formatDuration } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { useCommonResearchStore } from '@/stores/commonResearch';
import { useInitialStateStore } from '@/stores/initialState';
import { useActionsStore } from '@/stores/actions';
import { computeDependencies } from '@/lib/actions/executor';
import { generateActionId } from '@/types';
import { useActionExecutor } from '@/composables/useActionExecutor';

const commonResearchStore = useCommonResearchStore();
const initialStateStore = useInitialStateStore();
const actionsStore = useActionsStore();
const { prepareExecution, completeExecution } = useActionExecutor();

// Track expanded tiers
const expandedTiers = ref(new Set<number>([1]));

function toggleTier(tier: number) {
  if (expandedTiers.value.has(tier)) {
    expandedTiers.value.delete(tier);
  } else {
    expandedTiers.value.add(tier);
  }
}

// Get all tiers
const tiers = computed(() => getTiers());

// Get research by tier
const researchByTier = computed(() => getResearchByTier());

function getResearchesForTier(tier: number): CommonResearch[] {
  return researchByTier.value.get(tier) || [];
}

// Cost modifiers
const costModifiers = computed<ResearchCostModifiers>(() => ({
  labUpgradeLevel: initialStateStore.epicResearchLevels['cheaper_research'] || 0,
  waterballoonMultiplier: initialStateStore.colleggtibleModifiers.researchCost,
  puzzleCubeMultiplier: initialStateStore.artifactModifiers.researchCost.totalMultiplier,
}));

// Tier summaries
const tierSummaries = computed(() => {
  const summaries: Record<number, ReturnType<typeof getTierSummary>> = {};
  for (const tier of tiers.value) {
    summaries[tier] = getTierSummary(tier, commonResearchStore.researchLevels, costModifiers.value);
  }
  return summaries;
});

function getCurrentLevel(researchId: string): number {
  return commonResearchStore.researchLevels[researchId] || 0;
}

function getNextLevelPrice(research: CommonResearch): number {
  const currentLevel = getCurrentLevel(research.id);
  if (currentLevel >= research.levels) return 0;
  return getDiscountedVirtuePrice(research, currentLevel, costModifiers.value);
}

function getTimeToBuy(research: CommonResearch): string {
  const price = getNextLevelPrice(research);
  if (price <= 0) return '';

  const snapshot = actionsStore.effectiveSnapshot;
  const offlineEarnings = snapshot.offlineEarnings;

  if (offlineEarnings <= 0) return '∞';

  const seconds = price / offlineEarnings;
  if (seconds < 1) return 'Instant';
  return formatDuration(seconds);
}

function canBuyResearch(research: CommonResearch, tier: number): boolean {
  const summary = tierSummaries.value[tier];
  if (!summary?.isUnlocked) return false;

  const currentLevel = getCurrentLevel(research.id);
  return currentLevel < research.levels;
}

function isTierMaxed(tier: number): boolean {
  const summary = tierSummaries.value[tier];
  if (!summary) return true;
  return summary.purchasedLevels >= summary.totalLevels;
}

/**
 * Buy a single level of research and create the action.
 * Returns true if successful, false if already maxed.
 */
function buyOneLevel(research: CommonResearch): boolean {
  const currentLevel = getCurrentLevel(research.id);
  if (currentLevel >= research.levels) return false;

  // Prepare execution (restores stores if editing past group)
  const beforeSnapshot = prepareExecution();

  // Calculate cost based on current state (after restore if editing)
  const effectiveLevel = beforeSnapshot.researchLevels[research.id] || 0;
  const cost = getDiscountedVirtuePrice(research, effectiveLevel, costModifiers.value);

  // Build payload
  const payload = {
    researchId: research.id,
    fromLevel: effectiveLevel,
    toLevel: effectiveLevel + 1,
  };

  // Compute dependencies (level N depends on the action that bought level N-1)
  const dependencies = computeDependencies('buy_research', payload, actionsStore.actionsBeforeInsertion);

  // Apply to store
  commonResearchStore.setResearchLevel(research.id, effectiveLevel + 1);

  // Complete execution (computes snapshot, inserts/pushes action, replays if needed)
  completeExecution({
    id: generateActionId(),
    timestamp: Date.now(),
    type: 'buy_research',
    payload,
    cost,
    dependsOn: dependencies,
  }, beforeSnapshot);

  return true;
}

function handleBuyResearch(research: CommonResearch) {
  buyOneLevel(research);
}

/**
 * Buy all remaining levels of a single research.
 */
function handleMaxResearch(research: CommonResearch) {
  const maxLevel = research.levels;
  while (getCurrentLevel(research.id) < maxLevel) {
    if (!buyOneLevel(research)) break;
  }
}

/**
 * Buy all remaining levels of all research in a tier.
 * Processes research in order, buying all levels of each before moving to the next.
 */
function handleMaxTier(tier: number) {
  const researches = getResearchesForTier(tier);
  for (const research of researches) {
    const maxLevel = research.levels;
    while (getCurrentLevel(research.id) < maxLevel) {
      if (!buyOneLevel(research)) break;
    }
  }
}
</script>
