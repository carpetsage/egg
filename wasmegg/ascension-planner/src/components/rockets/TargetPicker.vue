<template>
  <div class="flex flex-wrap gap-1">
    <!-- No Target option -->
    <button
      class="w-7 h-7 rounded flex items-center justify-center transition-all"
      :class="
        !modelValue
          ? 'bg-purple-100 ring-2 ring-purple-500'
          : 'bg-gray-100 hover:bg-gray-200'
      "
      title="No target (random loot)"
      @click="$emit('update:modelValue', undefined)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Target icons -->
    <button
      v-for="target in targetList"
      :key="target.id"
      class="w-7 h-7 rounded flex items-center justify-center transition-all"
      :class="
        modelValue === target.id
          ? 'bg-purple-100 ring-2 ring-purple-500'
          : 'bg-gray-50 hover:bg-gray-100'
      "
      :title="target.name"
      @click="$emit('update:modelValue', target.id)"
    >
      <img
        :src="target.iconUrl"
        :alt="target.name"
        class="w-5 h-5"
      />
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { noFragTargets, getImageUrlFromId, getTargetName, ei } from 'lib';

export default defineComponent({
  props: {
    modelValue: {
      type: Number,
      default: undefined,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    // Filter out UNKNOWN from targets for the picker
    const targetList = noFragTargets
      .filter(id => id !== ei.ArtifactSpec.Name.UNKNOWN)
      .map(id => ({
        id,
        name: getTargetName(id),
        iconUrl: getImageUrlFromId(id, 64),
      }));

    return {
      targetList,
    };
  },
});
</script>
