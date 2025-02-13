<template>
  <Menu as="div" class="relative h-4 w-4">
    <MenuButton class="block focus:outline-none">
      <svg class="h-4 w-4 text-blue-500 cursor-pointer select-none" viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"
        />
      </svg>
    </MenuButton>

    <transition
      enter-active-class="transition ease-out !duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in !duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        class="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-700 ring-opacity-5 focus:outline-none z-10"
      >
        <div class="py-1">
          <MenuItem v-slot="{ active }">
            <a
              :href="url"
              target="_blank"
              class="block px-4 py-2 text-sm text-gray-900 dark:text-gray-100 !duration-0"
              :class="active ? 'bg-gray-100 dark:bg-gray-700' : null"
            >
              Open in new tab
            </a>
          </MenuItem>
          <MenuItem v-slot="{ active }">
            <div
              class="block px-4 py-2 text-sm text-gray-900 dark:text-gray-100 !duration-0 cursor-pointer"
              :class="active ? 'bg-gray-100 dark:bg-gray-700' : null"
              @click="copyTextToClipboard(absoluteUrl)"
            >
              Copy sharing link
            </div>
          </MenuItem>
          <MenuItem v-slot="{ active }">
            <div
              class="block px-4 py-2 text-sm text-gray-900 dark:text-gray-100 !duration-0 cursor-pointer"
              :class="active ? 'bg-gray-100 dark:bg-gray-700' : null"
              @click="copyTextToClipboard(ecoopadCommand)"
            >
              Copy <code>ecoopad</code> command
            </div>
          </MenuItem>
          <MenuItem v-slot="{ active }">
            <div
              class="block px-4 py-2 text-sm text-gray-900 dark:text-gray-100 !duration-0 cursor-pointer"
              :class="active ? 'bg-gray-100 dark:bg-gray-700' : null"
              @click="copyTextToClipboard(endTimeDiscordified)"
            >
              Copy end date
            </div>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { useRouter } from 'vue-router';
import copyTextToClipboard from 'copy-text-to-clipboard';

export default defineComponent({
  components: {
    // eslint-disable-next-line vue/no-reserved-component-names
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
  },
  props: {
    contractId: {
      type: String,
      required: true,
    },
    coopCode: {
      type: String,
      required: true,
    },
    endTime: {
      type: Number,
      default: 0,
    },
  },
  setup(props) {
    const { contractId, coopCode, endTime } = toRefs(props);
    const router = useRouter();
    const url = computed(
      () =>
        router.resolve({
          name: 'coop',
          params: {
            contractId: contractId.value,
            coopCode: coopCode.value,
          },
        }).href
    );
    const absoluteUrl = computed(() => new URL(url.value, document.location.href).href);
    const ecoopadCommand = computed(() => `ecoopad ${contractId.value} ${coopCode.value}`);
    const endTimeDiscordified = computed(() => `<t:${endTime.value}:F>`);
    return {
      url,
      absoluteUrl,
      ecoopadCommand,
      endTimeDiscordified,
      copyTextToClipboard,
    };
  },
});
</script>
