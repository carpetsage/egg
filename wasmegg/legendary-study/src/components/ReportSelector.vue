<template>
  <div>
    <label :for="id" class="block text-sm font-medium text-gray-700">{{ label }}</label>
    <select
      :id="id"
      v-model="selected"
      :name="id"
      class="block mt-1 w-full sm:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
    >
      <option v-for="timestamp in timestamps" :key="timestamp" :value="timestamp">
        <template v-if="timestamp !== undefined">{{ formatDatetime(timestamp) }}</template>
        <template v-else>&ndash; select report &ndash;</template>
      </option>
    </select>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, watch } from 'vue';
import dayjs from 'dayjs';

import { reportTimestamps } from '@/reports';

export default defineComponent({
  props: {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    modelValue: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    optional: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    'update:modelValue': (selected: number | undefined) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit }) {
    const { modelValue, optional } = toRefs(props);
    const timestamps = optional.value ? [undefined, ...reportTimestamps] : reportTimestamps;
    const selected = ref(modelValue.value);
    watch(modelValue, () => {
      selected.value = modelValue.value;
    });
    watch(selected, () => {
      emit('update:modelValue', selected.value);
    });
    return {
      selected,
      timestamps,
      formatDatetime,
    };
  },
});

function formatDatetime(timestamp: number): string {
  return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm');
}
</script>
