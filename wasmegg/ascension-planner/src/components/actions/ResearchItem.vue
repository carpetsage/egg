<template>
  <div
    class="px-4 py-2 flex items-center gap-3 transition-opacity duration-200"
    :class="{ 'opacity-50': !canBuy && !isMaxed }"
  >
    <!-- Research name and level -->
    <div class="flex-1 min-w-0 flex items-center gap-2">
      <img :src="iconURL(getColleggtibleIconPath(research.id), 64)" class="w-6 h-6 object-contain" :alt="research.name" />
      <div class="min-w-0">
        <div class="text-sm font-medium text-gray-900 truncate">
          <span v-if="showTier" class="text-gray-400 font-mono text-[10px] mr-1">T{{ research.tier }}</span>
          {{ research.name }}
        </div>
        <div class="text-xs text-gray-500">
          <span v-if="targetLevel" class="font-medium text-blue-600">Level {{ targetLevel }}</span>
          <span v-else>Level {{ currentLevel }}</span>
          / {{ research.levels }}
          <span class="mx-1 text-gray-300">|</span>
          <span class="text-gray-500">{{ research.description }}</span>
        </div>
        <div v-if="recommendationNote" class="mt-1.5 p-1.5 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-800 leading-tight">
          <div class="flex items-start gap-1.5">
            <svg class="w-3 h-3 mt-0.5 mt-px shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <span>
              <span class="font-bold uppercase text-[9px] tracking-tight mr-1">Pair Suggestion:</span>
              {{ recommendationNote }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Extra Stats (ROI, ELR Impact, etc) -->
    <div v-if="extraStats" class="text-right whitespace-nowrap hidden sm:block">
      <div class="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">{{ extraLabel }}</div>
      <div class="text-xs font-mono text-gray-900">{{ extraStats }}</div>
    </div>

    <!-- Next level price -->
    <div class="text-right w-24">
      <template v-if="!isMaxed">
        <div class="text-xs text-amber-600 font-mono">
          <div class="flex items-center justify-end gap-1">
            {{ formatGemPrice(price) }}
            <img :src="iconURL('egginc/icon_virtue_gem.png', 64)" class="w-3 h-3 object-contain" alt="Gem" />
          </div>
          <div v-if="timeToBuy" class="text-[10px] text-gray-400 mt-0.5">
            {{ timeToBuy }}
          </div>
        </div>
      </template>
      <div v-else class="text-xs text-green-600 font-medium">
        Maxed
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1.5">
      <!-- Buy to Here (Cheapest view only) -->
      <button
        v-if="showBuyToHere && !isMaxed"
        class="px-2 py-1 text-[10px] font-bold uppercase bg-amber-100 hover:bg-amber-200 text-amber-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="!canBuyToHere"
        :title="`Buy all preceding and this research${buyToHereTime ? ' (Total: ' + buyToHereTime + ')' : ''}`"
        @click.stop="$emit('buyToHere')"
      >
        Buy to here
        <span v-if="buyToHereTime" class="ml-1 text-[9px] opacity-70">({{ buyToHereTime }})</span>
      </button>

      <!-- Buy one level button -->
      <button
        class="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="!canBuy || isMaxed || (targetLevel !== undefined && targetLevel !== currentLevel + 1)"
        title="Buy one level"
        @click.stop="$emit('buy')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <!-- Max button for individual research -->
      <!-- Max button for individual research -->
      <button
        v-if="showMax"
        class="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="!canBuy || isMaxed"
        :title="`Buy all remaining levels${maxTime ? ' (Total: ' + maxTime + ')' : ''}`"
        @click.stop="$emit('max')"
      >
        Max
        <span v-if="maxTime" class="ml-1 text-[9px] opacity-70">({{ maxTime }})</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CommonResearch } from '@/calculations/commonResearch';
import { formatNumber, formatGemPrice } from '@/lib/format';
import { getColleggtibleIconPath } from '@/lib/assets';
import { iconURL } from 'lib';

const props = defineProps<{
  research: CommonResearch;
  currentLevel: number;
  price: number;
  timeToBuy: string;
  canBuy: boolean;
  isMaxed: boolean;
  extraStats?: string;
  extraLabel?: string;
  showMax: boolean;
  showTier?: boolean;
  targetLevel?: number;
  showBuyToHere?: boolean;
  canBuyToHere?: boolean;
  buyToHereTime?: string;
  recommendationNote?: string;
  maxTime?: string;
}>();

defineEmits<{
  (e: 'buy'): void;
  (e: 'max'): void;
  (e: 'buyToHere'): void;
}>();
</script>
