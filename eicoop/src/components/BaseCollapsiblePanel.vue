<template>
  <div class="bg-green-50 dark:bg-green-800 px-4 sm:px-6 py-3 mb-4 ultrawide:rounded-md">
    <div class="flex items-center">
      <div>
        <p class="text-sm font-medium text-green-800 dark:text-green-200">
          <slot name="title">{{ title }}</slot>
        </p>
      </div>
      <div class="ml-auto pl-3">
        <div class="-mx-1.5 -my-1.5">
          <button
            type="button"
            class="inline-flex rounded-md p-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-800 dark:hover:bg-green-700 focus:outline-none"
            @click="toggle"
          >
            <!-- Heroicon name: solid/x -->
            <svg
              v-if="!collapse"
              class="h-4 w-4 text-green-500 dark:text-green-200"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
            <!-- Heroicon name: solid/arrows-expand -->
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-green-500 dark:text-green-200"
              viewBox="0 0 20 20"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 8V4m0 0h4M3 4l4 4m8 0V4m0 0h-4m4 0l-4 4m-8 4v4m0 0h4m-4 0l4-4m8 4l-4-4m4 4v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
    <base-slide-toggle>
      <div v-show="!collapse" class="text-sm">
        <slot></slot>
      </div>
    </base-slide-toggle>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import BaseSlideToggle from '@/components/BaseSlideToggle.vue';

export default defineComponent({
  components: {
    BaseSlideToggle,
  },
  props: {
    // title can also be defined in the #title slot
    title: {
      type: String,
      required: false,
    },
    collapse: {
      type: Boolean,
      required: true,
    },
    toggle: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
});
</script>
