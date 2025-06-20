<template>
  <div class="tabular-nums">
    <div v-for="(stone, index) in stones" :key="index">
      <div class="flex flex-wrap items-center text-sm">
        <img :src="iconURL(stone.iconPath, 64)" class="h-4 w-4 mr-1" />
        <span class="mr-1">T{{ stone.tierNumber }} {{ stoneName }}s:</span>
        <div class="relative mr-1">
          <span class="invisible">00</span>
          <span class="absolute top-0 right-0 text-blue-500">{{ configuredStoneCounts[index] }}</span>
        </div>
        <button
          class="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-default disabled:hover:text-gray-500"
          :disabled="disabled || !incrementEnabled(index)"
          @click="increment(index)"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <button
          class="mr-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-default disabled:hover:text-gray-500"
          :disabled="disabled || !decrementEnabled(index)"
          @click="decrement(index)"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
        <span v-if="ownedStoneCounts[index] > 0" class="whitespace-nowrap text-green-500"
          >({{ ownedStoneCounts[index] }} owned)</span
        >
        <span v-else class="whitespace-nowrap text-red-500">(not owned)</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

import { Stone, StoneCounts } from '@/lib';
import { iconURL } from 'lib';

const MIN_STONE_COUNT = 0;
const MAX_STONE_COUNT = 12;

export default defineComponent({
  props: {
    stones: {
      type: Array as PropType<Stone[]>,
      required: true,
    },
    stoneCounts: {
      type: Object as PropType<StoneCounts>,
      required: true,
    },
    ownedStoneCounts: {
      type: Object as PropType<StoneCounts>,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    'update:stoneCounts': (_payload: StoneCounts) => true,
  },
  setup(props, { emit }) {
    const { stones, stoneCounts } = toRefs(props);
    const stoneName = computed(() => stones.value[0].name.toLowerCase());
    const configuredStoneCounts = ref(stoneCounts.value);
    const incrementEnabled = (index: number) => {
      return configuredStoneCounts.value[index] < MAX_STONE_COUNT;
    };
    const decrementEnabled = (index: number) => {
      return configuredStoneCounts.value[index] > MIN_STONE_COUNT;
    };
    const increment = (index: number) => {
      if (incrementEnabled(index)) {
        configuredStoneCounts.value[index]++;
      }
    };
    const decrement = (index: number) => {
      if (decrementEnabled(index)) {
        configuredStoneCounts.value[index]--;
      }
    };
    watch(
      stoneCounts,
      () => {
        emit('update:stoneCounts', stoneCounts.value);
      },
      {
        deep: true,
      }
    );
    return {
      stoneName,
      configuredStoneCounts,
      incrementEnabled,
      decrementEnabled,
      increment,
      decrement,
      iconURL,
    };
  },
});
</script>
