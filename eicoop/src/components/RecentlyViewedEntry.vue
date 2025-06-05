<template>
  <div class="flex items-center text-sm truncate">
    <svg viewBox="0 0 640 512" class="shrink-0 h-3.5 text-gray-400 dark:text-gray-300 mr-1.5">
      <path
        fill="currentColor"
        d="M96 224c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm448 0c35.3 0 64-28.7 64-64s-28.7-64-64-64-64 28.7-64 64 28.7 64 64 64zm32 32h-64c-17.6 0-33.5 7.1-45.1 18.6 40.3 22.1 68.9 62 75.1 109.4h66c17.7 0 32-14.3 32-32v-32c0-35.3-28.7-64-64-64zm-256 0c61.9 0 112-50.1 112-112S381.9 32 320 32 208 82.1 208 144s50.1 112 112 112zm76.8 32h-8.3c-20.8 10-43.9 16-68.5 16s-47.6-6-68.5-16h-8.3C179.6 288 128 339.6 128 403.2V432c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-28.8c0-63.6-51.6-115.2-115.2-115.2zm-223.7-13.4C161.5 263.1 145.6 256 128 256H64c-35.3 0-64 28.7-64 64v32c0 17.7 14.3 32 32 32h65.9c6.3-47.4 34.9-87.3 75.2-109.4z"
      />
    </svg>
    <router-link
      :to="{ name: 'coop', params: { contractId: entry.contractId, coopCode: entry.coopCode } }"
      class="truncate no-unnecessary-truncate"
      :class="colorClasses"
    >
      {{ entry.coopCode }}
    </router-link>
    <span class="text-gray-500 dark:text-gray-400">&nbsp;@</span>
    <base-icon
      :icon-rel-path="eggIconPath(entry.contractEgg, entry.customEggId)"
      :size="64"
      class="shrink-0 h-4 w-4 mx-1"
    />
    <span
      class="truncate no-unnecessary-truncate cursor-pointer"
      :class="colorClasses"
      @click="selectContractAndShowCoopSelector(entry.contractId)"
    >
      {{ entry.contractName }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { HistoryCoopEntry } from '@/stores/history';
import { eggIconPath } from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';
import useCoopSelectorStore from '@/stores/coopSelector';

export default defineComponent({
  components: {
    BaseIcon,
  },
  props: {
    entry: {
      type: Object as PropType<HistoryCoopEntry>,
      required: true,
    },
    colorClasses: {
      type: String,
      default: 'text-gray-700 dark:text-gray-200 hover:text-gray-400 dark:hover:text-gray-400 duration-100!',
    },
  },
  setup() {
    const store = useCoopSelectorStore();
    const selectContractAndShowCoopSelector = (contractId: string) => store.selectContractAndShow(contractId);
    return {
      selectContractAndShowCoopSelector,
      eggIconPath,
    };
  },
});
</script>

<style scoped>
/*
The hot garbage that is Safari decides that even though it has been given
exactly enough space to display something, since I specified text-overflow:
ellipsis it has to replace the last few characters with ellipsis, because why
would I use text-overflow: ellipsis if I don't want to see the ellipsis, right?

The workaround is based on https://stackoverflow.com/a/38744914. The answer uses
width: 0, someone in the comments had to use width: 1px, and only 2px worked for
me. Isn't it great.

Of course, the fix can't be this easy, because of course, the "fix" breaks
otherwise working layout in Firefox... So we invoke some unholy Safari-specific
magic to limit the "fix" to this braindead browser.
https://stackoverflow.com/a/25975282
*/
_::-webkit-full-page-media,
_:future,
:root .no-unnecessary-truncate:after {
  content: '\0000a0';
  display: inline-block;
  width: 2px;
}
</style>
