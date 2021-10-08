<template>
  <div class="flex flex-wrap items-center text-xs text-gray-500 leading-9 tabular-nums">
    <span
      v-for="source in sources"
      :key="source.id"
      class="inline-flex items-center mr-1.5 whitespace-nowrap"
    >
      <span class="inline-block h-8 w-8 relative mr-0.5">
        <a :href="`#${source.id}`" class="h-8 w-8">
          <img
            v-tippy="{
              content: `${source.name} (T${source.tier_number})`,
            }"
            class="h-8 w-8 rounded-md"
            :class="rarityBgClass(source.afx_rarity)"
            :src="iconURL(`egginc/${source.icon_filename}`, 64)"
          />
        </a>
        <span
          v-if="!source.deterministic"
          class="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full ring-2 ring-white bg-green-400"
        ></span>
      </span>
      <span class="sr-only">{{ source.name }}</span>
      <span class="w-9">{{ formatFloat(source.expected_yield, { digits: 2 }) }}&times;</span>
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { ei, iconURL } from 'lib';
import { formatFloat } from '@/utils';
import { Source } from '@/data.json';

import Rarity = ei.ArtifactSpec.Rarity;

export default defineComponent({
  props: {
    sources: {
      type: Array as PropType<Source[]>,
      required: true,
    },
  },
  setup() {
    return {
      rarityBgClass,
      formatFloat,
      iconURL,
    };
  },
});

function rarityBgClass(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.COMMON:
      return 'bg-common';
    case Rarity.RARE:
      return 'bg-rare';
    case Rarity.EPIC:
      return 'bg-epic';
    case Rarity.LEGENDARY:
      return 'bg-legendary';
  }
}
</script>

<style scoped>
.bg-common {
  background-color: #b3b3b3; /* #404040 in app */
}

.bg-rare {
  background-color: #6fdbff; /* #a0ffff in app */
}

.bg-epic {
  background-color: #ff66ff; /* #ff33ff in app */
}

.bg-legendary {
  background-color: #ffdf33; /* #ffff33 in app */
}
</style>
