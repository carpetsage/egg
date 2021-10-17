<template>
  <nav :class="useCoolGray ? 'bg-cool-gray-600' : 'bg-gray-600'">
    <div
      class="mx-auto py-3 flex flex-row space-x-3"
      :class="[centerIcons ? 'justify-center' : null, widthClasses]"
    >
      <!-- Home icon -->
      <a
        :href="useAbsoluteUrls ? 'https://wasmegg.netlify.app/' : '/'"
        class="block focus:outline-none focus:ring-1 focus:ring-inset"
        :class="
          useCoolGray
            ? 'text-cool-gray-300 focus:ring-cool-gray-300'
            : 'text-gray-300 focus:ring-gray-300'
        "
      >
        <HomeIcon v-tippy="{ content: 'Home', touch: false }" class="h-5 w-5" aria-hidden="true" />
      </a>
      <!-- Sidebar icon -->
      <button
        type="button"
        class="block focus:outline-none focus:ring-1 focus:ring-inset relative"
        :class="
          useCoolGray
            ? 'text-cool-gray-300 focus:ring-cool-gray-300'
            : 'text-gray-300 focus:ring-gray-300'
        "
        @click="openSidebar"
      >
        <span class="sr-only">Open sidebar</span>
        <MenuIcon
          v-tippy="{ content: 'Related links', touch: false }"
          class="h-5 w-5"
          aria-hidden="true"
        />
        <base-ping v-if="!sitewideNavUsed" />
      </button>
      <!-- Additional app-specific icons -->
      <slot></slot>
    </div>
  </nav>

  <nav-bar-sidebar
    v-model:open="sidebarOpen"
    :active-entry-id="activeEntryId"
    :use-absolute-urls="useAbsoluteUrls"
  />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { HomeIcon, MenuIcon } from '@heroicons/vue/solid';

import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from 'lib';
import BasePing from './BasePing.vue';
import NavBarSidebar from './NavBarSidebar.vue';

const SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY = 'sitewideNavFirstUsed';

export default defineComponent({
  components: {
    HomeIcon,
    MenuIcon,
    BasePing,
    NavBarSidebar,
  },
  props: {
    activeEntryId: {
      type: String,
      default: '',
    },
    useAbsoluteUrls: {
      type: Boolean,
      default: false,
    },
    centerIcons: {
      type: Boolean,
      default: false,
    },
    widthClasses: {
      type: String,
      default: 'max-w-5xl px-4 xl:px-0',
    },
    // By default coolGray is used for Tailwind's gray, but in certain apps we
    // override the default gray, and for sitewide consistency we need to use
    // cool-gray here instead.
    useCoolGray: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    const sidebarOpen = ref(false);
    const sitewideNavUsed = ref(
      getLocalStorageNoPrefix(SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY) !== undefined
    );
    const openSidebar = () => {
      sidebarOpen.value = true;
      if (!sitewideNavUsed.value) {
        sitewideNavUsed.value = true;
        setLocalStorageNoPrefix(SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY, Date.now());
      }
    };
    return {
      sidebarOpen,
      sitewideNavUsed,
      openSidebar,
    };
  },
});
</script>
