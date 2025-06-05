<template>
  <div class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden ultrawide:rounded-lg">
    <div class="px-4 py-4 sm:px-6 bg-gray-50 dark:bg-gray-700">
      <div class="relative -ml-4 -mt-2 sm:flex items-start justify-between">
        <div class="grow ml-4 mt-2">
          <h2 class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
            <base-icon
              :icon-rel-path="eggIconPath(egg, contract?.customEggId)"
              :size="64"
              class="inline-block align-middle relative -top-px -left-1 h-6 w-6"
            />
            <template v-if="contract">
              <span>{{ contract.name }}</span>
              (<span class="text-gray-900 dark:text-gray-100">{{ contractId }}</span
              >)
            </template>
            <template v-else>
              <span class="text-gray-900 dark:text-gray-100">{{ contractId }}</span>
            </template>
          </h2>
          <div class="flex items-center">
            <span class="flex items-center justify-center relative h-6 w-6 -left-1">
              <svg viewBox="0 0 640 512" class="h-3.5 relative top-px text-gray-400 dark:text-gray-300">
                <path
                  fill="currentColor"
                  d="M96 224c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm448 0c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm32 32h-64c-17.6 0-33.5 7.1-45.1 18.6 40.3 22.1 68.9 62 75.1 109.4h66c17.7 0 32-14.3 32-32v-32c0-35.3-28.7-64-64-64zm-256 0c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208 144s50.1 112 112 112zm76.8 32h-8.3c-20.8 10-43.9 16-68.5 16s-47.6-6-68.5-16h-8.3C179.6 288 128 339.6 128 403.2V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-28.8c0-63.6-51.6-115.2-115.2-115.2zm-223.7-13.4C161.5 263.1 145.6 256 128 256H64c-35.3 0-64 28.7-64 64v32c0 17.7 14.3 32 32 32h65.9c6.3-47.4 34.9-87.3 75.2-109.4z"
                />
              </svg>
            </span>
            <span
              class="pl-px text-sm text-gray-700 dark:text-gray-300 truncate"
              :style="{ maxWidth: 'min(20rem, 50vw)' }"
            >
              {{ coopCode }}
            </span>
            <template v-if="contract?.minutesPerToken">
              <base-icon icon-rel-path="egginc/b_icon_token.png" :size="64" class="block h-5 w-5 ml-1.5" />
              <span class="pl-px text-sm text-gray-700 dark:text-gray-300 truncate">
                {{ contract?.minutesPerToken }}m
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 space-y-4 animate-pulse">
      <div class="space-y-4">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded" :style="{ maxWidth: 'min(100%, 36rem)' }"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded" :style="{ maxWidth: 'min(83.33%, 30rem)' }"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded" :style="{ maxWidth: 'min(66.67%, 24rem)' }"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { eggIconPath, ei } from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';

export default defineComponent({
  components: {
    BaseIcon,
  },
  props: {
    contractId: {
      type: String,
      required: true,
    },
    coopCode: {
      type: String,
      required: true,
    },
    contract: {
      type: Object as PropType<ei.IContract | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const { contract } = toRefs(props);
    const egg = computed(() => {
      const egg = contract.value?.egg;
      return egg !== undefined && egg !== null ? egg : ei.Egg.UNKNOWN;
    });
    return {
      egg,
      eggIconPath,
    };
  },
});
</script>
