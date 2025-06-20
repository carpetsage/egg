<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700"> What can I possibly get from this mission? </label>

    <base-select-filterable
      :items="validMissions"
      :get-item-id="mission => mission.missionTypeId"
      :get-item-display="mission => mission.name"
      :get-item-icon-path="mission => mission.shipIconPath"
      :item-from-id="id => missionIdToMission.get(id)!"
      :search-items="searchMissions"
      placeholder="Select mission (type to filter)"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    />

    <p class="text-xs text-gray-500">
      You may use this dropdown, or click on any mission name on the page, including, for instance, results in an
      artifact query.
    </p>
  </div>
</template>

<script setup lang="ts">
import { PropType, computed } from 'vue';

import { missionIdToMission, missions, searchMissions } from '@/lib/filter';
import { GenericBaseSelectFilterable } from 'ui/components/BaseSelectFilterable.vue';

const BaseSelectFilterable = GenericBaseSelectFilterable<(typeof missions)[number]>();
const validMissions = computed(() => missions.toReversed());

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
