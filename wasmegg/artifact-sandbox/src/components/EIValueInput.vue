<template>
  <base-e-i-value-input
    :id="id"
    :raw="raw"
    :value="value"
    :base-class="`bg-dark-20 block w-full sm:text-sm rounded-md ${baseClass}`"
    valid-class="focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    invalid-class="border-red-300 text-red-500 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500"
    @update:raw="$emit('update:raw', $event)"
    @update:value="$emit('update:value', $event)"
  />
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import BaseEIValueInput from 'ui/components/BaseEIValueInput.vue';

export default defineComponent({
  components: {
    BaseEIValueInput,
  },
  props: {
    id: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    raw: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    baseClass: {
      type: String,
      default: '',
    },
  },
  emits: {
    'update:raw': (_payload: string) => true,
    'update:value': (_payload: number) => true,
  },
});
</script>
