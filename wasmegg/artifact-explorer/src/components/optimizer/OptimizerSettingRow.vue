<template>
  <div class="py-1.5">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-sm text-gray-700 truncate">{{ label }}</span>
        <span
          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide flex-shrink-0"
          :class="badgeClass"
        >
          {{ badge }}
        </span>
      </div>
      <label
        v-if="hasSave"
        class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none flex-shrink-0"
      >
        <input
          type="checkbox"
          class="h-3.5 w-3.5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
          :checked="overridden"
          @change="$emit('update:overridden', ($event.target as HTMLInputElement).checked)"
        />
        override
      </label>
    </div>

    <div class="mt-1 flex items-center gap-2">
      <template v-if="editable">
        <div class="w-20">
          <base-integer-input
            base-class="block w-full sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 px-2 py-1 border-gray-300"
            :min="min"
            :max="max"
            :model-value="manualValue"
            @update:model-value="$emit('update:manual', $event)"
          />
        </div>
        <span v-if="maxLabel" class="text-xs text-gray-400">{{ maxLabel }}</span>
        <span v-if="hasSave && saveValue !== null" class="text-xs text-gray-400">save: {{ saveValue }}</span>
      </template>
      <template v-else>
        <span class="font-mono text-sm font-semibold text-gray-800">{{ saveValue }}</span>
        <span v-if="maxLabel" class="text-xs text-gray-400">{{ maxLabel }}</span>
      </template>
      <span v-if="capacity" class="ml-auto text-xs text-gray-500">{{ capacity }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import BaseIntegerInput from 'ui/components/BaseIntegerInput.vue';

export default defineComponent({
  components: { BaseIntegerInput },
  props: {
    label: { type: String, required: true },
    // Whether a value for this field is available from the loaded save.
    hasSave: { type: Boolean, required: true },
    // Whether the manual override flag is on (only meaningful when hasSave).
    overridden: { type: Boolean, default: false },
    // The value loaded from the save, shown when not overriding (null if none).
    saveValue: { type: Number as PropType<number | null>, default: null },
    // The manual value edited via the input.
    manualValue: { type: Number, required: true },
    min: { type: Number, default: 0 },
    max: { type: Number as PropType<number | undefined>, default: undefined },
    maxLabel: { type: String, default: '' },
    // Optional caption (e.g. fuel tank capacity) shown right-aligned.
    capacity: { type: String, default: '' },
  },
  emits: {
    'update:overridden': (_b: boolean) => true,
    'update:manual': (_n: number) => true,
  },
  setup(props) {
    const { hasSave, overridden } = toRefs(props);
    // No save data → edit inline; save data + override on → edit inline.
    const editable = computed(() => !hasSave.value || overridden.value);
    const badge = computed<'save' | 'override' | 'manual'>(() => {
      if (!hasSave.value) return 'manual';
      return overridden.value ? 'override' : 'save';
    });
    const badgeClass = computed(() => {
      switch (badge.value) {
        case 'save':
          return 'bg-green-100 text-green-700';
        case 'override':
          return 'bg-amber-100 text-amber-700';
        default:
          return 'bg-gray-100 text-gray-500';
      }
    });
    return { editable, badge, badgeClass };
  },
});
</script>
