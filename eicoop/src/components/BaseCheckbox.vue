<template>
  <div class="flex items-center">
    <input
      :id="name"
      :name="name"
      type="checkbox"
      class="h-4 w-4 text-green-600 bg-white dark:bg-gray-800 dark:checked:bg-green-600 border-gray-300 dark:border-gray-500 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 duration-0!"
      :checked="modelValue"
      @change="onChange"
    />
    <label :for="name" class="ml-2 items-center text-sm text-gray-900">
      <slot></slot>
    </label>
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
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const onChange = (event: Event) => {
      emit('update:modelValue', (event.target! as HTMLInputElement).value);
    };
    return {
      onChange,
    };
  },
});
</script>
