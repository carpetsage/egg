<template>
  <tbody>
    <tr>
      <td colspan="4" class="px-2 py-1 font-medium text-gray-900 bg-gray-200 rounded-sm">
        <div v-if="locked" class="flex justify-between items-center">
          <span>Tier {{ tierNumber }} (Locked)</span>
          <span class="text-sm text-gray-600">
            {{ levelsRemaining }} levels remaining
            <span class="text-xs whitespace-nowrap">
              <span
                class="text-gray-500 cursor-pointer hover:text-blue-600"
                @click.stop="setCashTarget?.(cheapestLevelsCost)"
                >({{ formatPrice(cheapestLevelsCost) }})</span
              >
              <span
                v-if="addCashTarget"
                class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                title="Add to target"
                @click.stop="addCashTarget(cheapestLevelsCost)"
                >+</span
              >
            </span>
          </span>
        </div>
        <div v-else>Tier {{ tierNumber }}</div>
      </td>
    </tr>
    <template v-for="(research, researchIndex) in items" :key="research.id">
      <tr
        class="cursor-pointer hover:bg-gray-50"
        :class="researchIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'"
        @click="$emit('toggle-research', research.id)"
      >
        <td class="px-2 py-0.5 pr-4">
          <span class="inline-flex items-center gap-1">
            <svg
              class="w-3 h-3 transition-transform text-gray-400"
              :class="{ 'rotate-90': expandedResearches[research.id] }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            {{ research.name }}
          </span>
        </td>
        <td
          class="px-2 py-0.5 text-right whitespace-nowrap"
          :class="research.level === research.maxLevel ? 'text-green-600' : 'text-gray-600'"
        >
          {{ research.level }}/{{ research.maxLevel }}
        </td>
        <td class="px-2 py-0.5 text-right whitespace-nowrap">
          <template v-if="research.level < research.maxLevel">
            <span
              class="text-gray-500 cursor-pointer hover:text-blue-600"
              @click.stop="setCashTarget?.(research.nextCost)"
            >
              {{ formatPrice(research.nextCost) }}
            </span>
            <span
              v-if="addCashTarget"
              class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
              title="Add to target"
              @click.stop="addCashTarget(research.nextCost)"
              >+</span
            >
          </template>
          <span v-else class="text-green-600">Done</span>
        </td>
        <td class="px-2 py-0.5 text-right whitespace-nowrap">
          <template v-if="research.level < research.maxLevel">
            <span
              class="text-gray-500 cursor-pointer hover:text-blue-600"
              @click.stop="setCashTarget?.(research.remainingCost)"
            >
              {{ formatPrice(research.remainingCost) }}
            </span>
            <span
              v-if="addCashTarget"
              class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
              title="Add to target"
              @click.stop="addCashTarget(research.remainingCost)"
              >+</span
            >
          </template>
          <span v-else class="text-green-600">-</span>
        </td>
      </tr>
      <tr
        v-if="expandedResearches[research.id]"
        :key="`${research.id}-description`"
        class="text-xs"
        :class="researchIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'"
      >
        <td colspan="4" class="px-2 py-1 pl-8 text-gray-600 italic">
          {{ research.description }}
        </td>
      </tr>
      <tr
        v-for="(cost, index) in research.tierCosts"
        v-show="
          expandedResearches[research.id] &&
          index >= research.level &&
          (showAllLevels[research.id] || index < research.level + 15)
        "
        :key="`${research.id}-tier-${index}`"
        class="text-xs"
        :class="[
          researchIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
          index === research.level ? 'text-blue-600 font-medium' : 'text-gray-500',
        ]"
      >
        <td class="px-2 py-0.5 pl-8">
          Level {{ index + 1 }}
          <span v-if="index === research.level" class="ml-1">←</span>
        </td>
        <td class="px-2 py-0.5 text-right"></td>
        <td class="px-2 py-0.5 text-right tabular-nums whitespace-nowrap">
          <span class="cursor-pointer hover:text-blue-600" @click.stop="setCashTarget?.(cost)">
            {{ formatPrice(cost) }}
          </span>
          <span
            v-if="addCashTarget"
            class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
            title="Add to target"
            @click.stop="addCashTarget(cost)"
            >+</span
          >
        </td>
        <td class="px-2 py-0.5 text-right tabular-nums whitespace-nowrap">
          <span
            class="cursor-pointer hover:text-blue-600"
            @click.stop="
              setCashTarget?.(research.tierCosts.slice(research.level, index + 1).reduce((a, b) => a + b, 0))
            "
          >
            {{ formatPrice(research.tierCosts.slice(research.level, index + 1).reduce((a, b) => a + b, 0)) }}
          </span>
          <span
            v-if="addCashTarget"
            class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
            title="Add to target"
            @click.stop="
              addCashTarget(research.tierCosts.slice(research.level, index + 1).reduce((a, b) => a + b, 0))
            "
            >+</span
          >
        </td>
      </tr>
      <tr
        v-if="
          expandedResearches[research.id] &&
          !showAllLevels[research.id] &&
          research.maxLevel - research.level > 15
        "
        :key="`${research.id}-show-all`"
        class="text-xs bg-gray-50 cursor-pointer hover:bg-gray-100"
        @click.stop="$emit('toggle-show-all', research.id)"
      >
        <td colspan="4" class="px-2 py-0.5 pl-8 text-blue-600">
          Show all {{ research.maxLevel - research.level - 15 }} remaining levels...
        </td>
      </tr>
    </template>
  </tbody>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

interface ResearchItem {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  tier: number;
  nextCost: number;
  next5Cost: number;
  remainingCost: number;
  tierCosts: number[];
}

export default defineComponent({
  name: 'ResearchTier',
  props: {
    tierNumber: {
      type: Number,
      required: true,
    },
    items: {
      type: Array as PropType<ResearchItem[]>,
      required: true,
    },
    locked: {
      type: Boolean,
      default: false,
    },
    levelsRemaining: {
      type: Number,
      default: 0,
    },
    cheapestLevelsCost: {
      type: Number,
      default: 0,
    },
    expandedResearches: {
      type: Object as PropType<Record<string, boolean>>,
      required: true,
    },
    showAllLevels: {
      type: Object as PropType<Record<string, boolean>>,
      required: true,
    },
    formatPrice: {
      type: Function as PropType<(price: number) => string>,
      required: true,
    },
    setCashTarget: {
      type: Function as PropType<(amount: number) => void>,
      required: false,
      default: undefined,
    },
    addCashTarget: {
      type: Function as PropType<(amount: number) => void>,
      required: false,
      default: undefined,
    },
  },
  emits: ['toggle-research', 'toggle-show-all'],
});
</script>
