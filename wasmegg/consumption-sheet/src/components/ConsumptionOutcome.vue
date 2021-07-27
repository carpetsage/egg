<template>
  <template v-if="isArtifact">
    <div
      class="flex items-center space-x-1 text-xs mb-0.5"
      :class="rarityFgClass(outcome.item.afx_rarity)"
    >
      <span>{{ outcome.item.rarity }}</span>
      <span v-if="!outcome.deterministic">
        <nondeterministic-icon class="inline" />
      </span>
    </div>

    <div v-if="outcome.gold === 0" class="text-xs text-lime-500">
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
        />
        {{ formatFloat(outcome.expected_gold, { digits: 1, trim: true })
        }}<template v-if="outcome.item.afx_rarity > 0">;</template>
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

  <div v-if="outcome.gold > 0" class="flex">
    <span class="inline-flex items-center space-x-1 text-xs text-gray-500">
      <img class="h-4 w-4 -ml-0.5" :src="iconURL('egginc-extras/icon_golden_egg.png', 64)" />
      {{ Math.floor(outcome.gold).toLocaleString('en-US') }}
    </span>
  </div>

  <div v-else>
    <div class="flex flex-wrap text-xs text-gray-500 leading-7 tabular-nums">
      <span
        v-for="(byproduct, index) in outcome.expected_byproducts"
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

        <!-- Expand/collapse button -->
        <span
          v-if="index === outcome.expected_byproducts.length - 1 && !outcome.deterministic"
          v-tippy="{ content: 'Expand/collapse sample runs' }"
          class="h-4 ml-1.5 select-none cursor-pointer hide-in-screenshot-mode"
          @click="showSamples = !showSamples"
        >
          <collapse-icon v-if="showSamples" />
          <expand-icon v-else />
        </span>
      </span>
    </div>

    <ul
      v-if="outcome.sample_byproducts !== null && showSamples"
      class="p-2 bg-gray-200 rounded-lg divide-y divide-gray-300"
    >
      <li
        v-for="(sample, index) in outcome.sample_byproducts"
        :key="index"
        class="flex flex-wrap text-xs text-gray-500 leading-7 tabular-nums"
      >
        <span
          v-for="byproduct in sample"
          :key="byproduct.id"
          class="inline-flex items-center mr-1.5"
        >
          <a :href="`#${byproduct.id}-sources`" class="h-6 w-6 -m-1 mr-0">
            <img
              v-tippy="{
                content: `${byproduct.name} (T${byproduct.tier_number})`,
              }"
              class="h-6 w-6"
              :src="iconURL(`egginc/${byproduct.icon_filename}`, 64)"
            />
          </a>
          <!-- Facilitate copying as text -->
          <span class="sr-only">{{ byproduct.name }}</span>
          <span class="w-9">&times;{{ byproduct.count }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref } from 'vue';

import { ei, iconURL, trimTrailingZeros } from 'lib';
import { ConsumptionOutcome } from '@/data.json';
import CollapseIcon from '@/components/CollapseIcon.vue';
import ExpandIcon from '@/components/ExpandIcon.vue';
import NondeterministicIcon from '@/components/NondeterministicIcon.vue';

import Rarity = ei.ArtifactSpec.Rarity;

export default defineComponent({
  components: {
    CollapseIcon,
    ExpandIcon,
    NondeterministicIcon,
  },
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

function formatFloat(x: number, opts?: { digits?: number; trim?: boolean }): string {
  const { digits = 0, trim = true } = opts ?? {};
  const s = x.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return digits > 0 && trim ? trimTrailingZeros(s) : s;
}
</script>
