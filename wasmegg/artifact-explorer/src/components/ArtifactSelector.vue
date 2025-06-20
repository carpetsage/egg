<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700"> What does this artifact do and how do I get it? </label>

    <base-select-filterable
      :items="artifacts"
      :get-item-id="artifact => artifact.id"
      :get-item-display="artifact => artifact.display"
      :get-item-icon-path="artifact => 'egginc/' + artifact.icon_filename"
      :item-from-id="id => artifactIdToArtifact.get(id)!"
      :search-items="searchArtifacts"
      placeholder="Select artifact (type to filter)"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    />

    <p class="text-xs text-gray-500">
      You may use this dropdown or the visual artifacts picker below, or click on any artifact name on the page,
      including, for instance, results in a mission query.
    </p>
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue';

import { artifactIdToArtifact, artifacts, searchArtifacts } from '@/lib/filter';
import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';

const BaseSelectFilterable = GenericBaseSelectFilterable<(typeof artifacts)[number]>();

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
