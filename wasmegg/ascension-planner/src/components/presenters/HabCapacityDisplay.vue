<template>
  <div class="space-y-4">
    <!-- Final Result -->
    <div class="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-inner flex justify-between items-center">
      <div>
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Hab Capacity</div>
        <div class="text-3xl font-bold text-slate-800 tracking-tight">
          {{ formatFullNumber(output.totalFinalCapacity) }} <span class="text-sm font-medium text-slate-400">chickens</span>
        </div>
      </div>
      <div class="text-right">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Scale Power</div>
        <div class="text-lg font-mono-premium font-bold text-slate-900">
          {{ formatMultiplier(output.totalFinalCapacity / output.totalBaseCapacity) }}
        </div>
      </div>
    </div>

    <!-- Hab Cost Discounts -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Habitat Infrastructure Costs</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <img :src="iconURL(getColleggtibleIconPath('cheaper_contractors'), 64)" class="w-5 h-5 object-contain" alt="Cheaper Contractors" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Contractor Rates</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Epic Research</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold" :class="cheaperContractorsLevel > 0 ? 'text-slate-900' : 'text-slate-300'">
            {{ cheaperContractorsLevel > 0 ? `-${cheaperContractorsLevel * 5}%` : '—' }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <img :src="iconURL(getColleggtibleIconPath('flame-retardant'), 64)" class="w-5 h-5 object-contain" alt="Flame Retardant" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">Shielding Efficiency</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Colleggtible</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold" :class="flameRetardantMultiplier < 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ flameRetardantMultiplier < 1 ? formatPercent(flameRetardantMultiplier - 1, 0) : '—' }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center bg-slate-50/80">
          <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total Cost Multiplier</span>
          <span class="font-mono-premium text-sm font-bold" :class="totalCostMultiplier < 1 ? 'text-slate-900' : 'text-slate-400'">
            {{ totalCostMultiplier < 1 ? formatPercent(totalCostMultiplier - 1, 0) : '—' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Hab Slots -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Installed Habitats</h3>
        <span class="badge-premium badge-brand py-0 text-[9px]">{{ purchasedCount }}/4 Slots</span>
      </div>
      <div class="divide-y divide-slate-50">
        <div
          v-for="(hab, index) in output.habBreakdown"
          :key="index"
          class="px-5 py-4 flex justify-between items-center group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <span class="text-[10px] font-black text-slate-300 w-4">{{ index + 1 }}</span>
            <div v-if="hab.habId !== null" class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-105 transition-transform">
                <img
                  :src="iconURL(getHabById(hab.habId as HabId)?.iconPath ?? '', 128)"
                  class="w-full h-full object-contain p-1.5"
                  :alt="getHabById(hab.habId as HabId)?.name"
                />
              </div>
              <div>
                <div class="text-[11px] font-bold text-slate-700 leading-tight">{{ getHabById(hab.habId as HabId)?.name }}</div>
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Module</div>
              </div>
            </div>
            <span v-else class="text-[11px] font-bold text-slate-300 italic uppercase tracking-wider">Empty Bay</span>
          </div>
          <div class="text-right">
            <div v-if="hab.habId !== null" class="font-mono-premium text-sm font-bold text-slate-700">
              {{ formatNumber(hab.finalCapacity, 0) }}
            </div>
            <div v-if="hab.habId !== null" class="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
              Cost: {{ formatNumber(getHabPriceForSlot(index), 0) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Multiplier Breakdown -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Capacity Modifiers</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Physical Space</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatNumber(output.totalBaseCapacity, 0) }}</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Research</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ formatMultiplier(output.researchMultiplier) }}</span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hyperdimensional Flux</span>
          <span class="font-mono-premium text-sm font-bold text-slate-700" :class="output.portalResearchMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.portalResearchMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <div class="flex items-center gap-2">
            <img :src="iconURL(getColleggtibleIconPath('pegg'), 64)" class="w-4 h-4 object-contain" alt="P.E.G.G" />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colleggtible Bonus</span>
          </div>
          <span class="font-mono-premium text-sm font-bold" :class="output.peggMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.peggMultiplier) }}
          </span>
        </div>
        <div class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors">
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact Potency</span>
          <span class="font-mono-premium text-sm font-bold" :class="output.artifactMultiplier !== 1 ? 'text-slate-900' : 'text-slate-300'">
            {{ formatMultiplier(output.artifactMultiplier) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Artifact Breakdown -->
    <div v-if="output.artifactBreakdown.length > 0" class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Initial Loadout Effects</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div
          v-for="(effect, index) in output.artifactBreakdown"
          :key="index"
          class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-700">{{ effect.label }}</span>
            <span class="badge-premium py-0 text-[8px]" :class="effect.source === 'artifact' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'badge-slate'">
              {{ effect.source }}
            </span>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-700">{{ effect.effect }}</span>
        </div>
      </div>
    </div>

    <!-- Research -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Contributing Research</h3>
      </div>
      <div class="divide-y divide-slate-50 max-h-80 overflow-y-auto scrollbar-premium">
        <div
          v-for="research in output.researchBreakdown"
          :key="research.researchId"
          class="px-5 py-3 flex justify-between items-center group hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-110 transition-transform">
              <img :src="iconURL(getColleggtibleIconPath(research.researchId), 64)" class="w-5 h-5 object-contain" :alt="research.name" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700 leading-tight">{{ research.name }}</div>
              <div class="flex items-center gap-2">
                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {{ formatMultiplier(research.multiplier, true) }}
                </div>
                <span v-if="research.portalOnly" class="badge-premium py-0 text-[7px] bg-slate-100 text-slate-400">Portal Only</span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-mono-premium text-xs font-bold text-slate-700">{{ research.level }} <span class="text-slate-300 font-normal">/</span> {{ research.maxLevel }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Colleggtibles -->
    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
        <h3 class="text-xs font-bold text-slate-700 uppercase tracking-tight">Collection Bonus</h3>
      </div>
      <div class="px-5 py-4">
        <div class="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-sm">
              <img :src="iconURL(getColleggtibleIconPath('pegg'), 64)" class="w-5 h-5 object-contain" alt="P.E.G.G" />
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-700">P.E.G.G Collection</div>
              <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ formatTier(colleggtibleTier) }}</div>
            </div>
          </div>
          <span class="font-mono-premium text-sm font-bold text-slate-900">
            {{ formatColleggtibleBonus(output.peggMultiplier) }}
          </span>
        </div>
        <p class="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-3 px-1">Hab capacity bonus from collection achievements</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HabCapacityOutput } from '@/types';
import { getHabById, getDiscountedHabPrice, getHabCostMultiplier, countHabsOfType, type HabCostModifiers, type HabId } from '@/lib/habs';
import { formatNumber, formatFullNumber, formatMultiplier, formatPercent } from '@/lib/format';
import { formatTier, formatColleggtibleBonus } from '@/lib/colleggtibles';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';
import { computed } from 'vue';

const props = defineProps<{
  output: HabCapacityOutput;
  colleggtibleTier: number;
  cheaperContractorsLevel: number;
  flameRetardantMultiplier: number;
}>();

const purchasedCount = computed(() =>
  props.output.habBreakdown.filter(h => h.habId !== null).length
);

// Cost modifiers object
const costModifiers = computed<HabCostModifiers>(() => ({
  cheaperContractorsLevel: props.cheaperContractorsLevel,
  flameRetardantMultiplier: props.flameRetardantMultiplier,
}));

// Total cost multiplier for display
const totalCostMultiplier = computed(() => getHabCostMultiplier(costModifiers.value));

// Get current hab IDs array
const currentHabIds = computed(() =>
  props.output.habBreakdown.map(h => h.habId)
);

/**
 * Get the price that was paid for the hab in a specific slot.
 */
function getHabPriceForSlot(slotIndex: number): number {
  const habId = currentHabIds.value[slotIndex];
  if (habId === null) return 0;

  const hab = getHabById(habId as HabId);
  if (!hab) return 0;

  // Count how many of this hab type are in slots before this one
  const habsBeforeSlot = currentHabIds.value.slice(0, slotIndex);
  const purchaseIndex = countHabsOfType(habsBeforeSlot, habId);

  return getDiscountedHabPrice(hab, purchaseIndex, costModifiers.value);
}
</script>
