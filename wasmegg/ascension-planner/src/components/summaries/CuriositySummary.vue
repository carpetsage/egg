<template>
  <div class="px-4 py-3 bg-amber-50 border-t border-amber-200">
    <div class="text-sm text-amber-800 font-medium mb-2">Curiosity Summary</div>
    <div v-if="summaryItems.length > 0" class="flex flex-col gap-1 text-xs text-amber-700">
      <div v-for="(item, index) in summaryItems" :key="index" class="font-medium">
        {{ item }}
      </div>
    </div>
    <div v-else class="text-xs text-amber-600 italic">
      No research purchased
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action, BuyResearchPayload } from '@/types';
import { getResearchById, getResearchByTier } from '@/calculations/commonResearch';

const props = defineProps<{
  headerAction: Action;
  actions: Action[];
}>();

const startState = computed(() => props.headerAction.endState);
const endState = computed(() => {
  if (props.actions.length > 0) {
    return props.actions[props.actions.length - 1].endState;
  }
  return props.headerAction.endState;
});

const summaryItems = computed(() => {
  const items: string[] = [];
  
  // 1. Identify modified researches and tiers involved in this block
  const modifiedResearchIds = new Set<string>();
  const modifiedTiers = new Set<number>();

  for (const action of props.actions) {
    if (action.type === 'buy_research') {
      const payload = action.payload as BuyResearchPayload;
      modifiedResearchIds.add(payload.researchId);
      
      const research = getResearchById(payload.researchId);
      if (research) {
        modifiedTiers.add(research.tier);
      }
    }
  }

  if (modifiedResearchIds.size === 0) return [];

  // 2. Identify fully maxed tiers (all items in tier meet max level in endState)
  // We only check tiers that we actually touched in this block.
  const maxedTiers: number[] = [];
  const handledResearchIds = new Set<string>();

  const sortedModifiedTiers = Array.from(modifiedTiers).sort((a, b) => a - b);
  const researchByTier = getResearchByTier();

  for (const tier of sortedModifiedTiers) {
    const tierResearches = researchByTier.get(tier) || [];
    // Check if EVERY research in this tier is maxed at the end state
    const isTierMaxed = tierResearches.every(r => {
      const level = endState.value.researchLevels[r.id] || 0;
      return level >= r.levels;
    });

    if (isTierMaxed) {
      maxedTiers.push(tier);
      // Mark all researches in this tier as handled so we don't list them individually
      tierResearches.forEach(r => handledResearchIds.add(r.id));
    }
  }

  // 3. Format maxed tiers (grouping contiguous ranges)
  if (maxedTiers.length > 0) {
    let rangeStart = maxedTiers[0];
    let prev = maxedTiers[0];

    // Loop through 1 to length; when i == length, curr is undefined, triggering the strictly "else" logic
    for (let i = 1; i <= maxedTiers.length; i++) {
      const curr = maxedTiers[i]; 
      if (curr === prev + 1) {
        prev = curr;
      } else {
        // End of range
        if (rangeStart === prev) {
          items.push(`Max Tier ${rangeStart}`);
        } else {
          items.push(`Max Tiers ${rangeStart}-${prev}`);
        }
        rangeStart = curr;
        prev = curr;
      }
    }
  }

  // 4. Process remaining modified researches (those not in a fully maxed tier)
  const remainingResearches = Array.from(modifiedResearchIds)
    .filter(id => !handledResearchIds.has(id))
    .map(id => getResearchById(id)!)
    .sort((a, b) => a.serial_id - b.serial_id); // Sort by order in game

  for (const r of remainingResearches) {
    const startLevel = startState.value.researchLevels[r.id] || 0;
    const finalLevel = endState.value.researchLevels[r.id] || 0;
    const isMaxed = finalLevel >= r.levels;

    if (isMaxed) {
      items.push(`Max ${r.name}`);
    } else {
      items.push(`${r.name} (${startLevel} -> ${finalLevel})`);
    }
  }

  return items;
});
</script>
