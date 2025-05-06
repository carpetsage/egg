<template>
  <form class="mx-4 sm:mx-auto sm:max-w-xs sm:w-full mt-2 mb-4 space-y-1" @submit.prevent="$emit('submit', input)">
    <div>
      <label for="email" class="sr-only">Player ID</label>
      <base-input
        id="playerId"
        v-model.trim="input"
        type="text"
        name="playerId"
        class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="Player ID"
      />
      <div class="text-center">
        <span
          v-tippy="{
            content:
              'The ID asked for here is the unique ID used by Egg, Inc.\'s server to identify your account. You can find it in game screen -> nine dots menu -> Settings -> Privacy & Data, at the very bottom. It should look like EI1234567890123456. Your old game services ID prior to the Artifact Update does not work here. Also note that the ID is case-sensitive.',
          }"
          class="mt-2 inline-flex items-center space-x-1"
        >
          <base-info />
          <span class="text-xs text-gray-500">Where do I find my ID?</span>
        </span>
      </div>
    </div>
    <div>
      <button
        type="submit"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        :class="{ 'cursor-not-allowed': !submittable }"
        :disabled="!submittable"
      >
        Load Player Data
      </button>
    </div>
  </form>
  <div v-if="eids.size >= 1" class="mx-4 xl:mx-0 my-4">
    <div class="relative max-w-xs mx-auto px-3 sm:px-4 py-1 text-center bg-gray-50 rounded-xl shadow">
      <button
        type="button"
        class="absolute p-1 top-2 right-2 sm:right-3 select-none focus:outline-none"
        @click="toggleCollapse"
      >
        <!-- fa: solid/compress-arrows-alt -->
        <svg v-if="!collapsed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="h-3 w-3 text-gray-500">
          <path
            fill="currentColor"
            d="M200 288H88c-21.4 0-32.1 25.8-17 41l32.9 31-99.2 99.3c-6.2 6.2-6.2 16.4 0 22.6l25.4 25.4c6.2 6.2 16.4 6.2 22.6 0L152 408l31.1 33c15.1 15.1 40.9 4.4 40.9-17V312c0-13.3-10.7-24-24-24zm112-64h112c21.4 0 32.1-25.9 17-41l-33-31 99.3-99.3c6.2-6.2 6.2-16.4 0-22.6L481.9 4.7c-6.2-6.2-16.4-6.2-22.6 0L360 104l-31.1-33C313.8 55.9 288 66.6 288 88v112c0 13.3 10.7 24 24 24zm96 136l33-31.1c15.1-15.1 4.4-40.9-17-40.9H312c-13.3 0-24 10.7-24 24v112c0 21.4 25.9 32.1 41 17l31-32.9 99.3 99.3c6.2 6.2 16.4 6.2 22.6 0l25.4-25.4c6.2-6.2 6.2-16.4 0-22.6L408 360zM183 71.1L152 104 52.7 4.7c-6.2-6.2-16.4-6.2-22.6 0L4.7 30.1c-6.2 6.2-6.2 16.4 0 22.6L104 152l-33 31.1C55.9 198.2 66.6 224 88 224h112c13.3 0 24-10.7 24-24V88c0-21.3-25.9-32-41-16.9z"
          />
        </svg>
        <!-- fa: solid/expand-arrows-alt -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="h-3 w-3 text-gray-500">
          <path
            fill="currentColor"
            d="M448 344v112a23.94 23.94 0 0 1-24 24H312c-21.39 0-32.09-25.9-17-41l36.2-36.2L224 295.6 116.77 402.9 153 439c15.09 15.1 4.39 41-17 41H24a23.94 23.94 0 0 1-24-24V344c0-21.4 25.89-32.1 41-17l36.19 36.2L184.46 256 77.18 148.7 41 185c-15.1 15.1-41 4.4-41-17V56a23.94 23.94 0 0 1 24-24h112c21.39 0 32.09 25.9 17 41l-36.2 36.2L224 216.4l107.23-107.3L295 73c-15.09-15.1-4.39-41 17-41h112a23.94 23.94 0 0 1 24 24v112c0 21.4-25.89 32.1-41 17l-36.19-36.2L263.54 256l107.28 107.3L407 327.1c15.1-15.2 41-4.5 41 16.9z"
          />
        </svg>
      </button>

      <div class="divide-y divide-gray-200">
        <div class="py-2">Recently Used EIDs</div>
        <div v-if="!collapsed" class="py-2 flex-row items-center text-sm max-w-xs">
          <span v-for="(entry, index) in eids" :key="index" class="inline-flex">
            <svg viewBox="0 0 640 512" class="flex-shrink-0 h-3.5 text-gray-400 dark:text-gray-300 mr-1.5 mt-0.5">
              <path
                fill="currentColor"
                d="M96 224c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm448 0c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm32 32h-64c-17.6 0-33.5 7.1-45.1 18.6 40.3 22.1 68.9 62 75.1 109.4h66c17.7 0 32-14.3 32-32v-32c0-35.3-28.7-64-64-64zm-256 0c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208 144s50.1 112 112 112zm76.8 32h-8.3c-20.8 10-43.9 16-68.5 16s-47.6-6-68.5-16h-8.3C179.6 288 128 339.6 128 403.2V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-28.8c0-63.6-51.6-115.2-115.2-115.2zm-223.7-13.4C161.5 263.1 145.6 256 128 256H64c-35.3 0-64 28.7-64 64v32c0 17.7 14.3 32 32 32h65.9c6.3-47.4 34.9-87.3 75.2-109.4z"
              />
            </svg>
            <a :href="'/?playerId=' + entry" target="_self" class="underline">{{ entry }}</a>

            <div class="inset-y-0 flex cursor-pointer" :onClick="() => eidsStore.removeEid(entry)">
              <x-icon class="h-4 w-4 text-gray-400" />
            </div>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRefs, watch } from 'vue';

import BaseInfo from './BaseInfo.vue';
import BaseInput from './BaseInput.vue';
import { getLocalStorage, setLocalStorage, useEidsStore } from 'lib';
import { XIcon } from '@heroicons/vue/solid';

export default defineComponent({
  components: {
    BaseInfo,
    BaseInput,
    XIcon,
  },
  props: {
    playerId: {
      type: String,
      default: '',
    },
  },
  emits: {
    submit: (_playerId: string) => true,
  },
  setup(props) {
    const { playerId } = toRefs(props);
    const eidsStore = ref(useEidsStore());
    const COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY = 'collpaseRecentEids';

    const input = ref(playerId.value);
    const eids = eidsStore.value.list;

    watch(playerId, () => {
      input.value = playerId.value;
      eidsStore.value.addEid(playerId.value);
    });
    const submittable = computed(() => /^(mk2!)?EI\d{16}$/.test(input.value));
    const collapsed = ref(getLocalStorage(COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY) === 'true');
    const toggleCollapse = () => {
      collapsed.value = !collapsed.value;
      setLocalStorage(COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY, collapsed.value);
    };
    return {
      input,
      submittable,
      eids,
      eidsStore,
      collapsed,
      toggleCollapse,
    };
  },
});
</script>
