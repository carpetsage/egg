<template>
  <Menu as="div" class="relative">
    <MenuButton class="block">
      <share-icon class="h-4 w-4 text-gray-500" />
    </MenuButton>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div class="py-1">
          <MenuItem v-slot="{ active }">
            <button
              :class="[
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                'block w-full text-left px-4 py-2 text-sm',
              ]"
              @click="copyLink"
            >
              Copy Link
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script lang="ts">
import { defineComponent, toRefs } from 'vue';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { ShareIcon } from '@heroicons/vue/solid';
import copyTextToClipboard from 'copy-text-to-clipboard';

export default defineComponent({
  components: {
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    ShareIcon,
  },
  props: {
    page: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { id, page } = toRefs(props);
    const copyLink = () => {
      // const baseUrl=window.location.origin;
      copyTextToClipboard(`https://wasmegg-carpet.netlify.app/artifact-explorer/#/${page.value}/${id.value}`);
    };
    return {
      copyLink,
    };
  },
});
</script>
