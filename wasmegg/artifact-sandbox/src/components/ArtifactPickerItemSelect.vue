<template>
  <base-select-filterable
    :items="type === 'artifact' ? artifacts : stones"
    :get-item-id="item => item.id"
    :get-item-display="item => item.display"
    :get-item-icon-path="item => item.iconPath"
    :item-from-id="id => (type === 'artifact' ? artifactIdToArtifact : stoneIdToStone).get(id)!"
    :search-items="type === 'artifact' ? searchArtifacts : searchStones"
    :item-color-class="item => rarityFgClass(item.afxRarity)"
    :placeholder="type === 'artifact' ? '-- Select artifact (type to filter) --' : '-- Select stone --'"
    allow-clearing
    :model-value="modelValue || null"
    @update:model-value="$emit('update:modelValue', $event ?? '')"
  />
</template>

<script setup lang="ts">
import { PropType } from 'vue';

import { ei } from 'lib';
import Rarity = ei.ArtifactSpec.Rarity;
import { artifactIdToArtifact, artifacts, searchArtifacts, searchStones, stoneIdToStone, stones } from '@/lib';

import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';

const BaseSelectFilterable = GenericBaseSelectFilterable<(typeof artifacts)[number]>();

defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  type: {
    type: String as PropType<'artifact' | 'stone'>,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

defineEmits({
  'update:modelValue': (_itemId: string) => true,
});

function rarityFgClass(afxRarity: Rarity): string {
  switch (afxRarity) {
    case Rarity.COMMON:
      return '';
    case Rarity.RARE:
      return 'text-rare';
    case Rarity.EPIC:
      return 'text-epic';
    case Rarity.LEGENDARY:
      return 'text-legendary';
  }
}
</script>

<style lang="postcss" scoped>
:deep(.Select__input) {
  @apply bg-dark-20 border-gray-500;
}

:deep(.Select__dropdown) {
  @apply bg-dark-20 text-gray-50 border border-gray-500;
}

:deep(.Select__input::placeholder) {
  @apply text-gray-50;
}

:deep(.text-rare) {
  color: hsl(209, 100%, 70%);
}

:deep(.text-epic) {
  color: hsl(300, 100%, 70%);
}

:deep(.text-legendary) {
  color: hsl(37, 100%, 70%);
}
</style>
