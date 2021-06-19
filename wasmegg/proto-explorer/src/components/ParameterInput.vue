<template>
  <div>
    <label for="user_id" class="block text-sm font-medium text-gray-700">{{ label }}</label>
    <div class="mt-1">
      <input
        :id="name"
        type="text"
        :name="name"
        class="max-w-lg sm:max-w-xs shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
        :placeholder="placeholder"
        :value="modelValue"
        :required="required"
        @input="oninput"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  props: {
    name: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      required: true,
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  emits: {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    'update:modelValue': (payload: string) => true,
    /* eslint-enable @typescript-eslint/no-unused-vars */
  },
  setup(props, { emit }) {
    const oninput = (event: Event) => {
      emit('update:modelValue', (event.target as HTMLInputElement).value);
    };
    return {
      oninput,
    };
  },
});
</script>
