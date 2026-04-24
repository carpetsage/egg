<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      What is the most efficient ship to get this item when on the Path of Virtue?</label
    >

    <base-select-filterable
      :items="legendaryArtifacts"
      :get-item-id="artifact => artifact.id"
      :get-item-display="artifact => artifact.display"
      :get-item-icon-path="artifact => 'egginc/' + artifact.icon_filename"
      :item-from-id="id => artifactIdToArtifact.get(id)!"
      :search-items="searchArtifacts"
      placeholder="Select artifact (type to filter)"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue';

import { artifactIdToArtifact, legendaryArtifacts, searchArtifacts } from '@/lib/filter';
import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';

const BaseSelectFilterable = GenericBaseSelectFilterable<(typeof legendaryArtifacts)[number]>();

defineProps({
  modelValue: {
    type: String as PropType<string | null>,
    default: null,
  },
});

defineEmits({
  'update:modelValue': (_payload: string | null) => true,
});
</script>
