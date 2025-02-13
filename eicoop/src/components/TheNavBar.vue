<template>
  <nav class="bg-cool-gray-600 dark:bg-cool-gray-800">
    <div class="mx-auto px-3 sm:px-5 max-w-ultrawide">
      <div class="flex items-center justify-between h-14 sm:h-12">
        <div class="flex items-center justify-center h-6">
          <div class="flex-shrink-0">
            <router-link :to="{ name: 'home' }" class="block">
              <img src="/logo-small.svg" class="h-6" />
            </router-link>
          </div>

          <button
            type="button"
            class="block text-gray-300 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-gray-300 ml-1.5 relative"
            @click="openSidewideNav"
          >
            <span class="sr-only">Open sidebar</span>
            <MenuIcon
              v-tippy="{ content: 'Related links', touch: false }"
              class="h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
            <base-ping v-if="!sitewideNavUsed" />
          </button>

          <svg
            v-if="devmode"
            v-tippy="{
              content: 'Developer mode enabled! Click to disable temporarily (re-enabled upon refresh).',
            }"
            viewBox="0 0 512 512"
            class="h-3 w-3 flex-shrink-0 text-gray-200 cursor-pointer ml-3"
            fill="currentColor"
            @click="disableDevmodeTemporarily"
          >
            <path
              d="M501.1 395.7L384 278.6c-23.1-23.1-57.6-27.6-85.4-13.9L192 158.1V96L64 0 0 64l96 128h62.1l106.6 106.6c-13.6 27.8-9.2 62.3 13.9 85.4l117.1 117.1c14.6 14.6 38.2 14.6 52.7 0l52.7-52.7c14.5-14.6 14.5-38.2 0-52.7zM331.7 225c28.3 0 54.9 11 74.9 31l19.4 19.4c15.8-6.9 30.8-16.5 43.8-29.5 37.1-37.1 49.7-89.3 37.9-136.7-2.2-9-13.5-12.1-20.1-5.5l-74.4 74.4-67.9-11.3L334 98.9l74.4-74.4c6.6-6.6 3.4-17.9-5.7-20.2-47.4-11.7-99.6.9-136.6 37.9-28.5 28.5-41.9 66.1-41.2 103.6l82.1 82.1c8.1-1.9 16.5-2.9 24.7-2.9zm-103.9 82l-56.7-56.7L18.7 402.8c-25 25-25 65.5 0 90.5s65.5 25 90.5 0l123.6-123.6c-7.6-19.9-9.9-41.6-5-62.7zM64 472c-13.2 0-24-10.8-24-24 0-13.3 10.7-24 24-24s24 10.7 24 24c0 13.2-10.7 24-24 24z"
            />
          </svg>
        </div>
        <div>
          <div class="ml-4 flex items-center md:ml-6">
            <div class="ml-10 flex items-baseline space-x-3">
              <coop-selector-show v-slot="scope">
                <svg
                  v-tippy="{ content: 'Coop selector (hotkey: c)' }"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  class="relative top-px h-4.5 w-4.5 flex-shrink-0 text-gray-200 cursor-pointer select-none focus:outline-none"
                  @click="scope.show"
                >
                  <path
                    fill-rule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clip-rule="evenodd"
                  />
                </svg>
              </coop-selector-show>

              <the-recently-viewed-dropdown />

              <the-theme-switcher />
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <nav-bar-sidebar
    :open="sitewideNavOpen"
    active-entry-id="eicoop"
    :use-absolute-urls="true"
    :use-cool-gray="true"
    @update:open="
      (open: Boolean) => {
        if (!open) {
          closeSidewideNav();
        }
      }
    "
  />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { MenuIcon } from '@heroicons/vue/solid';

import BasePing from 'ui/components/BasePing.vue';
import NavBarSidebar from 'ui/components/NavBarSidebar.vue';
import CoopSelectorShow from './CoopSelectorShow.vue';
import TheThemeSwitcher from './TheThemeSwitcher.vue';
import TheRecentlyViewedDropdown from './TheRecentlyViewedDropdown.vue';
import useSitewideNavStore from '@/stores/sitewideNav';
import useDevmodeStore from '@/stores/devmode';

export default defineComponent({
  components: {
    MenuIcon,
    BasePing,
    NavBarSidebar,
    CoopSelectorShow,
    TheRecentlyViewedDropdown,
    TheThemeSwitcher,
  },
  props: {
    widthClass: {
      type: String,
      default: 'max-w-4xl',
    },
  },
  setup() {
    const navStore = useSitewideNavStore();
    const devmodeStore = useDevmodeStore();
    const sitewideNavOpen = computed(() => navStore.open);
    const sitewideNavUsed = computed(() => navStore.used);
    const openSidewideNav = () => navStore.openNav();
    const closeSidewideNav = () => navStore.closeNav();
    const devmode = computed(() => devmodeStore.on);
    const disableDevmodeTemporarily = () => devmodeStore.disableTemporarily();
    return {
      sitewideNavOpen,
      sitewideNavUsed,
      openSidewideNav,
      closeSidewideNav,
      devmode,
      disableDevmodeTemporarily,
    };
  },
});
</script>
