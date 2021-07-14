<template>
  <input
    :id="id"
    v-model.trim="input"
    :name="id"
    type="text"
    :class="[baseClass, invalid ? invalidClass : validClass]"
  />
</template>

<script lang="ts">
import { parseValueWithUnit } from 'lib';
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

export default defineComponent({
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
    'update:raw': (payload: string) => true,
    'update:value': (payload: number) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit }) {
    const { raw } = toRefs(props);
    const input = ref(raw.value.trim());
    const parsed = computed(() => parseValueWithUnit(input.value, false));
    const invalid = computed(() => parsed.value === null);
    watch(raw, () => {
      input.value = raw.value.trim();
    });
    watch(input, () => {
      if (parsed.value === null) {
        return;
      }
      emit('update:raw', input.value);
      emit('update:value', parsed.value);
    });
    return {
      input,
      invalid,
    };
  },
});
</script>
