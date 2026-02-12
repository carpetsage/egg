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
          {{ formatNumber(price, 0) }}
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
import { formatNumber } from '@/lib/format';
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
  maxTime?: string;
}>();

defineEmits<{
  (e: 'buy'): void;
  (e: 'max'): void;
  (e: 'buyToHere'): void;
}>();
</script>
