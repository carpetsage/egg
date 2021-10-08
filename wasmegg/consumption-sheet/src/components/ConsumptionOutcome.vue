<template>
  <template v-if="isArtifact">
    <div
      class="flex items-center space-x-1 text-xs mb-0.5"
      :class="rarityFgClass(outcome.item.afx_rarity)"
    >
      <span>{{ outcome.item.rarity }}</span>
    </div>

    <div
      v-if="outcome.expected_gold === 0 || outcome.expected_byproducts !== null"
      class="text-xs text-lime-500"
    >
      <span
        v-tippy="{
          content:
            'expected gold yield from fully consuming the item (recursively, down to golden eggs)',
        }"
        class="text-lime-500"
      >
        f.c.
        <img
          class="h-3.5 w-3.5 inline relative -top-px -ml-0.5 -mr-1"
          :src="iconURL('egginc-extras/icon_golden_egg.png', 64)"
        />{{ ' ' }}
        <template v-if="outcome.expected_full_consumption_gold > 0">{{
          formatFloat(outcome.expected_full_consumption_gold, { digits: 1, trim: true })
        }}</template
        ><template v-else>?</template><template v-if="outcome.item.afx_rarity > 0">;</template>
      </span>
      <span
        v-if="outcome.demotion_gold !== null"
        v-tippy="{ content: 'gold yield from demoting to common' }"
        class="text-teal-500"
      >
        dm.
        <img
          class="h-3.5 w-3.5 inline relative -top-px -ml-0.5 -mr-1"
          :src="iconURL('egginc-extras/icon_golden_egg.png', 64)"
        />
        {{ formatFloat(outcome.demotion_gold, { digits: 0 }) }}
      </span>
    </div>
  </template>

  <div>
    <div class="flex flex-wrap text-xs text-gray-500 leading-7 tabular-nums">
      <span
        v-if="outcome.expected_gold > 0"
        class="inline-flex items-center mr-1.5 whitespace-nowrap"
      >
        <img
          class="h-6 w-6 -m-1 mr-0 p-1"
          :src="iconURL('egginc-extras/icon_golden_egg.png', 64)"
        />
        <span v-if="outcome.expected_byproducts !== null" class="w-9"
          >&times;{{ formatFloat(outcome.expected_gold, { digits: 2 }) }}</span
        >
        <span v-else class="-ml-1">{{ formatFloat(outcome.expected_gold, { digits: 2 }) }}</span>
      </span>

      <span
        v-for="byproduct in outcome.expected_byproducts"
        :key="byproduct.id"
        class="inline-flex items-center mr-1.5 whitespace-nowrap"
      >
        <a :href="`#${byproduct.id}-sources`" class="h-6 w-6 -m-1 mr-0">
          <img
            v-tippy="{ content: `${byproduct.name} (T${byproduct.tier_number})` }"
            class="h-6 w-6"
            :src="iconURL(`egginc/${byproduct.icon_filename}`, 64)"
          />
        </a>
        <!-- Facilitate copying as text -->
        <span class="sr-only">{{ byproduct.name }}</span>
        <span class="w-9">&times;{{ formatFloat(byproduct.expected_count, { digits: 2 }) }}</span>

      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';

import { ei, iconURL } from 'lib';
import { formatFloat } from '@/utils';
import { ConsumptionOutcome } from '@/data.json';

import Rarity = ei.ArtifactSpec.Rarity;

export default defineComponent({
  props: {
    outcome: {
      type: Object as PropType<ConsumptionOutcome>,
      required: true,
    },
    isArtifact: {
      type: Boolean,
      required: true,
    },
  },
  setup() {
    const showSamples = ref(false);
    return {
      showSamples,
      rarityFgClass,
      formatFloat,
      iconURL,
    };
  },
});

function rarityFgClass(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.COMMON:
      return 'text-gray-500';
    case Rarity.RARE:
      return 'text-blue-500';
    case Rarity.EPIC:
      return 'text-purple-500';
    case Rarity.LEGENDARY:
      return 'text-yellow-500';
  }
}
</script>
