<template>
  <base-integer-input
    :id="id"
    :model-value="modelValue"
    :max="max"
    :min="min"
    :base-class="`bg-dark-20 block sm:text-sm rounded-md ${baseClass}`"
    valid-class="focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    invalid-class="border-red-300 text-red-500 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import BaseIntegerInput from 'ui/components/BaseIntegerInput.vue';

export default defineComponent({
  components: {
    BaseIntegerInput,
  },
  props: {
    id: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    modelValue: {
      type: Number,
      required: true,
    },
    max: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    min: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    baseClass: {
      type: String,
      default: '',
    },
  },
  emits: {
    'update:modelValue': (_payload: number) => true,
  },
});
</script>
