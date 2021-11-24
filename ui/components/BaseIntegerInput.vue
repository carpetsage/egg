<template>
  <slot :value="value" :input="input" :invalid="invalid" :update-input="updateInput">
    <base-input
      :id="id"
      v-model.trim="input"
      :name="id"
      type="number"
      :min="min"
      :max="max"
      :class="[baseClass, invalid ? invalidClass : validClass]"
    />
  </slot>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

import BaseInput from 'ui/components/BaseInput.vue';

export default defineComponent({
  components: {
    BaseInput,
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
      default:
        'shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md focus:outline-none',
    },
    validClass: {
      type: String,
      default: 'focus:ring-blue-500 focus:border-blue-500',
    },
    invalidClass: {
      type: String,
      default:
        'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500',
    },
  },
  emits: {
    'update:modelValue': (_payload: number) => true,
  },
  setup(props, { emit }) {
    const { modelValue, max, min } = toRefs(props);
    const value = ref(modelValue.value);
    const input = ref(modelValue.value.toString());
    // updateInput is solely meant for the scoped slot, since two-way binding of
    // input isn't allowed there. Accepts an Event on an input[type=number].
    const updateInput = (event: Event) => {
      input.value = (event.target as HTMLInputElement).value.trim();
    };
    const invalid = computed(() => {
      const s = input.value.trim();
      if (!s.match(/^-?\d+$/)) {
        return true;
      }
      const v = parseInt(input.value);
      if (max.value !== undefined && v > max.value) {
        return true;
      }
      if (min.value !== undefined && v < min.value) {
        return true;
      }
      return false;
    });
    watch(modelValue, () => {
      input.value = modelValue.value.toString();
    });
    watch(input, () => {
      if (invalid.value) {
        return;
      }
      value.value = parseInt(input.value);
      emit('update:modelValue', value.value);
    });
    return {
      value,
      input,
      updateInput,
      invalid,
    };
  },
});
</script>
