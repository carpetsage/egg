<template>
  <div class="flex items-center justify-center gap-3">
    <template v-if="showNav">
      <button
        type="button"
        class="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="!canGoPrev"
        aria-label="Previous month"
        @click="$emit('prev')"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <div class="flex items-center gap-2 min-w-[13rem] justify-center">
        <select
          :value="month"
          class="text-sm font-medium text-gray-900 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-1"
          @change="$emit('set-month', parseInt(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="(name, idx) in monthNames" :key="idx" :value="idx">{{ name }}</option>
        </select>
        <select
          :value="year"
          class="text-sm font-medium text-gray-900 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-1"
          @change="$emit('set-year', parseInt(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <button
        type="button"
        class="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
        :disabled="!canGoNext"
        aria-label="Next month"
        @click="$emit('next')"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <button
        type="button"
        class="ml-2 inline-flex items-center px-2.5 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        @click="$emit('today')"
      >
        Today
      </button>
    </template>

    <div class="ml-2 inline-flex rounded-md shadow-sm">
      <button
        v-for="(opt, idx) in viewOptions"
        :key="opt.value"
        type="button"
        class="relative inline-flex items-center px-2.5 py-1 text-xs font-medium border focus:outline-none"
        :class="[
          viewCount === opt.value
            ? 'bg-green-600 text-white border-green-600 z-10'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
          idx === 0 ? 'rounded-l-md' : '',
          idx === viewOptions.length - 1 ? 'rounded-r-md' : '',
          idx > 0 ? '-ml-px' : '',
        ]"
        @click="$emit('set-view-count', opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <button
      type="button"
      class="ml-2 inline-flex items-center gap-1 px-2.5 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
      :title="newestFirst ? 'Showing newest first' : 'Showing oldest first'"
      @click="$emit('toggle-order')"
    >
      <svg class="h-3.5 w-2.5" viewBox="0 0 320 512" fill="currentColor">
        <path
          v-if="newestFirst"
          d="M279 224H41c-21.4 0-32.1-25.9-17-41L143 64c9.4-9.4 24.6-9.4 33.9 0l119 119c15.2 15.1 4.5 41-16.9 41"
        />
        <path
          v-else
          d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41"
        />
      </svg>
    </button>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default defineComponent({
  props: {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    minYear: { type: Number, required: true },
    maxYear: { type: Number, required: true },
    canGoPrev: { type: Boolean, default: true },
    canGoNext: { type: Boolean, default: true },
    viewCount: { type: Number, default: 2 },
    newestFirst: { type: Boolean, default: true },
    showNav: { type: Boolean, default: true },
  },
  emits: ['prev', 'next', 'today', 'set-month', 'set-year', 'set-view-count', 'toggle-order'],
  setup(props) {
    const availableYears = computed(() => {
      const years = [];
      for (let y = props.minYear; y <= props.maxYear; y++) {
        years.push(y);
      }
      return years;
    });
    const viewOptions = [
      { value: 1, label: '1M' },
      { value: 3, label: '3M' },
      { value: 6, label: '6M' },
      { value: 12, label: '1Y' },
      { value: 0, label: 'All' },
    ];
    return {
      monthNames: MONTH_NAMES,
      availableYears,
      viewOptions,
    };
  },
});
</script>
