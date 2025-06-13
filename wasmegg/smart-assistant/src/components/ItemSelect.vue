<template>
  <div class="flex items-center gap-2">
    <base-select-filterable
      class="flex-grow"
      :items="items"
      :get-item-id="item => item.id"
      :get-item-display="item => item.display"
      :get-item-icon-path="item => item.iconPath"
      :item-from-id="id => itemIdToItem.get(id)!"
      :search-items="searchItems"
      :item-color-class="item => rarityFgClass(item.afxRarity)"
      placeholder="Select artifact (type to filter)"
      :model-value="modelValue.id"
      @update:model-value="
        $emit('update:modelValue', {
          ...modelValue,
          id: $event,
        })
      "
    />

    <div>
      <svg
        class="h-5 w-5 text-gray-400 hover:text-gray-500 cursor-pointer"
        viewBox="0 0 20 20"
        fill="currentColor"
        @click="deleteEntry"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue';

import { ei } from 'lib';
import Rarity = ei.ArtifactSpec.Rarity;
import { ItemSelectSpec, itemIdToItem, excludableItems as items, searchItems } from '@/lib/select';

import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';

const BaseSelectFilterable = GenericBaseSelectFilterable<(typeof items)[number]>();

defineProps({
  modelValue: {
    type: Object as PropType<ItemSelectSpec>,
    required: true,
  },
});

const emit = defineEmits({
  'update:modelValue': (_payload: ItemSelectSpec) => true,
  delete: () => true,
});

const deleteEntry = () => emit('delete');

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
:deep(.text-rare) {
  @apply text-blue-500;
}

:deep(.text-epic) {
  @apply text-purple-500;
}

:deep(.text-legendary) {
  @apply text-yellow-500;
}
</style>
