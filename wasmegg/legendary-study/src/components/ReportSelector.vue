<template>
  <div>
    <label :for="id" class="block text-sm font-medium text-gray-700">{{ label }}</label>
    <select
      :id="id"
      v-model="selected"
      :name="id"
      class="block mt-1 w-full sm:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
    >
      <option v-for="date in dates" :key="date" :value="date">
        <template v-if="date !== undefined">{{ date }}</template>
        <template v-else>&ndash; select report &ndash;</template>
      </option>
    </select>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, toRefs, watch } from 'vue';
import dayjs from 'dayjs';

import { reportDates } from '@/reports';

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
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    optional: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    'update:modelValue': (selected: string | undefined) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit }) {
    const { modelValue, optional } = toRefs(props);
    const dates = optional ? [undefined, ...reportDates] : reportDates;
    const selected = ref(modelValue.value);
    watch(modelValue, () => {
      selected.value = modelValue.value;
    });
    watch(selected, () => {
      emit('update:modelValue', selected.value);
    });
    return {
      selected,
      dates
    };
  },
});

</script>
