<template>
  <div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-lg flex items-center justify-center" :class="eggTheme.bg">
           <svg class="w-4 h-4" :class="eggTheme.text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.675.337a4 4 0 01-2.574.338L6.5 15.1l-1.5-1.5 1.5-1.5 2.414.483a2 2 0 001.287-.169l.675-.337a8 8 0 015.147-.69l2.387.477a2 2 0 001.022.547l1.718.344a2 2 0 011.414 1.414l.344 1.718a2 2 0 01-.547 1.022l-1.5 1.5-1.5-1.5.483-2.414a2 2 0 00-.169-1.287l-.337-.675a8 8 0 00-.69-5.147l.477-2.387a2 2 0 00-.547-1.022l-1.718-.344a2 2 0 00-1.414-1.414l-1.718-.344a2 2 0 00-1.022.547l-1.5 1.5 1.5 1.5.483-2.414a2 2 0 011.287-.169l.675.337a8 8 0 01.69 5.147l-.477 2.387a2 2 0 01.547 1.022l1.718.344a2 2 0 011.414 1.414l.344 1.718a2 2 0 01-.547 1.022l-1.5 1.5z" />
           </svg>
        </div>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{{ title }}</span>
      </div>
      
      <div class="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase">
        <span>{{ formatDuration(duration) }}</span>
        <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
        <div class="flex items-center gap-1">
          <span>{{ formatNumber(cost, 1) }}</span>
          <img :src="iconURL('egginc/egg_soul.png', 32)" class="w-3 h-3 opacity-40" alt="SE" v-if="costType === 'SE'" />
        </div>
      </div>
    </div>

    <div v-if="summaryItems.length > 0" class="flex flex-wrap gap-2">
      <div v-for="(item, index) in summaryItems" :key="index" class="flex items-center">
        <template v-if="item.isPremium">
          <span class="badge-premium px-2 py-0.5 text-[9px] font-black uppercase tracking-tight" :class="eggTheme.badge">
            {{ item.text }}
          </span>
        </template>
        <template v-else>
          <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
            <span class="text-[9px] font-bold text-slate-600">{{ item.name }}</span>
            <span class="text-[9px] font-black text-indigo-500 tracking-tighter">{{ item.delta }}</span>
          </div>
        </template>
      </div>
    </div>
    <div v-else class="text-center py-2">
      <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">No purchases during this shift</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatNumber, formatDuration } from '@/lib/format';
import { iconURL } from 'lib';
import { getResearchById, getResearchByTier } from '@/calculations/commonResearch';
import { getVehicleType } from '@/lib/vehicles';
import { getHabById } from '@/lib/habs';
import type { VirtueEgg } from '@/types';

const props = defineProps<{
  title: string;
  egg: VirtueEgg;
  actions: any[];
  duration: number;
  cost: number;
  costType: 'SE' | 'Virtue';
}>();

const eggThemes: Record<VirtueEgg, { bg: string; text: string; badge: string }> = {
  curiosity: { bg: 'bg-amber-50', text: 'text-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  integrity: { bg: 'bg-blue-50', text: 'text-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  humility: { bg: 'bg-purple-50', text: 'text-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-100' },
  resilience: { bg: 'bg-rose-50', text: 'text-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-100' },
  kindness: { bg: 'bg-emerald-50', text: 'text-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const eggTheme = computed(() => eggThemes[props.egg] || eggThemes.curiosity);

const summaryItems = computed(() => {
  const finalResearch: Record<string, number> = {};
  const modifiedResearchIds = new Set<string>();
  const modifiedTiers = new Set<number>();
  
  const finalVehicles: Record<number, { id: number, trainLength?: number }> = {};
  const finalHabs: Record<number, number> = {};
  let finalSiloCount = 0;

  for (const action of props.actions) {
    if (action.type === 'buy_research') {
      const { researchId, toLevel } = action.payload;
      finalResearch[researchId] = toLevel;
      modifiedResearchIds.add(researchId);
      const research = getResearchById(researchId);
      if (research) modifiedTiers.add(research.tier);
    } else if (action.type === 'buy_vehicle') {
      const { slotIndex, vehicleId, trainLength } = action.payload;
      finalVehicles[slotIndex] = { id: vehicleId, trainLength };
    } else if (action.type === 'buy_train_car') {
      const { slotIndex, toLength } = action.payload;
      if (finalVehicles[slotIndex]) {
        finalVehicles[slotIndex].trainLength = toLength;
      } else {
        finalVehicles[slotIndex] = { id: 11, trainLength: toLength }; // 11 is Hyperloop
      }
    } else if (action.type === 'buy_hab') {
      const { slotIndex, habId } = action.payload;
      finalHabs[slotIndex] = habId;
    } else if (action.type === 'buy_silo') {
      const { toCount } = action.payload;
      finalSiloCount = Math.max(finalSiloCount, toCount);
    }
  }

  const items: any[] = [];

  // --- Silos ---
  if (finalSiloCount > 0) {
    items.push({ isPremium: true, text: `${finalSiloCount} Silos` });
  }
  
  // --- Habs ---
  let hasCU = false;
  let highestHabId = -1;
  const habCounts: Record<number, number> = {};
  
  for (const habId of Object.values(finalHabs)) {
    if (habId === 18) hasCU = true;
    if (habId > highestHabId) highestHabId = habId;
    habCounts[habId] = (habCounts[habId] || 0) + 1;
  }
  
  if (hasCU) {
    items.push({ isPremium: true, text: `${habCounts[18]}x Chicken Universe` });
  } else if (highestHabId >= 0) {
    const habName = getHabById(highestHabId as any)?.name || 'Hab';
    items.push({ isPremium: false, name: `Hab Upgrade`, delta: `to ${habName}` });
  }

  // --- Vehicles ---
  const vehicleCounts: Record<string, number> = {};
  for (const v of Object.values(finalVehicles)) {
    const name = getVehicleType(v.id)?.name || 'Vehicle';
    let label = name;
    if (v.id === 11 && v.trainLength) {
      label = `${name} (${v.trainLength} cars)`;
    }
    vehicleCounts[label] = (vehicleCounts[label] || 0) + 1;
  }
  
  for (const [label, count] of Object.entries(vehicleCounts)) {
    if (count > 1) {
      items.push({ isPremium: false, name: label, delta: `${count}x` });
    } else {
      items.push({ isPremium: false, name: 'Vehicle', delta: label });
    }
  }

  // --- Research ---
  if (modifiedResearchIds.size > 0) {
    const maxedTiers: number[] = [];
    const handledResearchIds = new Set<string>();
    const researchByTierMap = getResearchByTier();

    const sortedModifiedTiers = Array.from(modifiedTiers).sort((a, b) => a - b);
    for (const tier of sortedModifiedTiers) {
      const tierResearches = researchByTierMap.get(tier) || [];
      const isTierMaxed = tierResearches.every(r => (finalResearch[r.id] || 0) >= r.levels);
      if (isTierMaxed) {
        maxedTiers.push(tier);
        tierResearches.forEach(r => handledResearchIds.add(r.id));
      }
    }

    if (maxedTiers.length > 0) {
      let start = maxedTiers[0];
      let prev = maxedTiers[0];
      for (let i = 1; i <= maxedTiers.length; i++) {
        const curr = maxedTiers[i];
        if (curr === prev + 1) {
          prev = curr;
        } else {
          items.push({
            isPremium: true,
            text: start === prev ? `Max Tier ${start}` : `Max Tiers ${start}-${prev}`
          });
          start = curr;
          prev = curr;
        }
      }
    }

    const remaining = Array.from(modifiedResearchIds)
      .filter(id => !handledResearchIds.has(id))
      .map(id => getResearchById(id)!)
      .sort((a, b) => a.serial_id - b.serial_id);

    for (const r of remaining) {
      const final = finalResearch[r.id] || 0;
      if (final >= r.levels) {
        items.push({ isPremium: false, name: `Max ${r.name}`, delta: '' });
      } else {
        items.push({ isPremium: false, name: r.name, delta: `0 -> ${final}` });
      }
    }
  }

  return items;
});
</script>

<style scoped>
.badge-premium {
  @apply border rounded-lg;
}
</style>
