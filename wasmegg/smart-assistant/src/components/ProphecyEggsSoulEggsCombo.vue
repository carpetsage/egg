<template>
  <span v-if="showProphecyEggs" class="flex whitespace-nowrap mr-1">
    <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="inline h-5 w-5" />
    <span v-tippy="{ content: prophecyEggsTooltip }" class="text-sm text-yellow-500">{{ prophecyEggs }}</span>
  </span>
  <span v-if="showSoulEggs" class="flex whitespace-nowrap">
    <img :src="iconURL('egginc/egg_soul.png', 64)" class="inline h-5 w-5" />
    <span v-tippy="{ content: soulEggsTooltip }" class="text-sm text-purple-500">{{ formatEIValue(soulEggs) }}</span>
  </span>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { formatEIValue, iconURL } from 'lib';

export default defineComponent({
  props: {
    prophecyEggs: {
      type: Number,
      required: true,
    },
    showProphecyEggs: {
      type: Boolean,
      default: true,
    },
    prophecyEggsTooltip: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    soulEggs: {
      type: Number,
      required: true,
    },
    showSoulEggs: {
      type: Boolean,
      default: true,
    },
    soulEggsTooltip: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
  },
  setup() {
    return {
      formatEIValue,
      iconURL,
    };
  },
});
</script>
