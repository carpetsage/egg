<template>
  <!-- This example requires Tailwind CSS v2.0+ -->
  <div class="relative inline-block text-left">
    <div>
      <!-- FontAwesome: solid/history -->
      <svg
        ref="triggerRef"
        viewBox="-72 -72 656 656"
        class="h-4.5 w-4.5 flex-shrink-0 text-gray-200 cursor-pointer select-none"
        @click="toggle"
      >
        <path
          fill="currentColor"
          d="M504 255.531c.253 136.64-111.18 248.372-247.82 248.468-59.015.042-113.223-20.53-155.822-54.911-11.077-8.94-11.905-25.541-1.839-35.607l11.267-11.267c8.609-8.609 22.353-9.551 31.891-1.984C173.062 425.135 212.781 440 256 440c101.705 0 184-82.311 184-184 0-101.705-82.311-184-184-184-48.814 0-93.149 18.969-126.068 49.932l50.754 50.754c10.08 10.08 2.941 27.314-11.313 27.314H24c-8.837 0-16-7.163-16-16V38.627c0-14.254 17.234-21.393 27.314-11.314l49.372 49.372C129.209 34.136 189.552 8 256 8c136.81 0 247.747 110.78 248 247.531zm-180.912 78.784l9.823-12.63c8.138-10.463 6.253-25.542-4.21-33.679L288 256.349V152c0-13.255-10.745-24-24-24h-16c-13.255 0-24 10.745-24 24v135.651l65.409 50.874c10.463 8.137 25.541 6.253 33.679-4.21z"
        />
      </svg>
    </div>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="showDropdown"
        v-click-outside="{ handler: close, trigger: triggerRef }"
        class="z-10 origin-top-right absolute right-0 mt-2 w-max rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-600 dark:border dark:border-gray-600 focus:outline-none"
        :style="{ minWidth: '14rem', maxWidth: 'min(calc(100vw - 5rem), 40rem)' }"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="options-menu"
      >
        <div class="px-4 py-3 text-gray-900 dark:text-gray-100 text-sm font-medium" role="none">
          Recently viewed coops
        </div>
        <div v-if="entries.length > 0" class="py-2" role="none">
          <template v-for="(entry, index) in entries" :key="index">
            <recently-viewed-entry class="px-4 py-1" :entry="entry" @click="close" />
          </template>
        </div>
        <div v-else class="py-2" role="none">
          <div class="px-4 py-1 text-sm text-gray-700 dark:text-gray-200">None</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import RecentlyViewedEntry from './RecentlyViewedEntry.vue';
import useHistoryStore from '@/stores/history';

export default defineComponent({
  components: {
    RecentlyViewedEntry,
  },
  setup() {
    const store = useHistoryStore();
    const entries = store.coops;

    const triggerRef = ref(null as HTMLElement | null);
    const showDropdown = ref(false);
    const toggle = () => {
      showDropdown.value = !showDropdown.value;
    };
    const close = () => {
      showDropdown.value = false;
    };

    return {
      triggerRef,
      showDropdown,
      toggle,
      close,
      entries,
    };
  },
});
</script>
