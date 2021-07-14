<template>
  <input
    :id="id"
    v-model.number="value"
    :name="id"
    type="number"
    :class="[baseClass, invalid ? invalidClass : validClass]"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

export default defineComponent({
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
    /* eslint-disable @typescript-eslint/no-unused-vars */
    'update:modelValue': (payload: number) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit }) {
    const { modelValue, max, min } = toRefs(props);
    const value = ref(modelValue.value);
    const invalid = computed(() => {
      const v = value.value;
      if (!Number.isInteger(v)) {
        return true;
      }
      if (max.value !== undefined && v > max.value) {
        return true;
      }
      if (min.value !== undefined && v < min.value) {
        return true;
      }
      return false;
    });
    watch(modelValue, () => {
      value.value = modelValue.value;
    });
    watch(value, () => {
      if (invalid.value) {
        return;
      }
      emit('update:modelValue', value.value);
    });
    return {
      value,
      invalid,
    };
  },
});
</script>
