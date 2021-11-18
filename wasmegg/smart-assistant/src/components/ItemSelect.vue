<!-- Adapted from loot-simulator/src/components/SimulatorItemSelect.vue -->

<template>
  <div class="flex items-center gap-2">
    <div class="flex-grow relative max-w-sm">
      <div class="relative rounded-md shadow-sm">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <img
            v-if="selected && searchFilter === selected.display"
            :src="iconURL(selected.iconPath, 64)"
            class="flex-shrink-0 h-6 w-6"
          />
          <question-mark-circle-icon v-else class="flex-shrink-0 h-6 w-6 p-px text-gray-400" />
        </div>
        <input
          ref="selectButton"
          v-model="searchFilter"
          type="text"
          class="focus:ring-blue-500 focus:border-blue-500 block w-full pl-11 pr-10 sm:text-sm border-gray-300 rounded-md"
          :class="selected ? artifactRarityFgClass(selected.afxRarity) : null"
          spellcheck="false"
          placeholder="Select artifact (type to filter)"
          @focus="openDropdown"
          @blur="closeDropdown"
          @keydown="handleKeydown"
        />
        <div class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
          <selector-icon class="h-5 w-5 text-gray-400" />
        </div>
      </div>

      <ul
        v-show="open"
        ref="dropdownList"
        class="absolute mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm z-10"
        :style="{ maxHeight: '21.5rem' }"
        tabindex="-1"
      >
        <li
          v-for="item in filteredItems"
          :key="item.id"
          class="cursor-default select-none relative py-0.5 pl-3 pr-9"
          :class="
            item.id === active?.id
              ? 'text-white bg-blue-600'
              : artifactRarityFgClass(item.afxRarity)
          "
          @mousedown="selectItem(item)"
          @mouseenter="activateItem(item)"
          @mouseleave="deactivateItem()"
        >
          <div class="flex items-center">
            <img :src="iconURL(item.iconPath, 64)" class="flex-shrink-0 h-6 w-6" />
            <span
              class="ml-2 block truncate"
              :class="[item.id === selected?.id ? 'font-semibold' : 'font-normal']"
            >
              {{ item.display }}
            </span>
          </div>

          <span
            v-if="item.id === selected?.id"
            class="absolute inset-y-0 right-0 flex items-center pr-4"
            :class="item.id === active?.id ? 'text-white' : 'text-blue-600'"
          >
            <check-icon class="h-5 w-5" />
          </span>
        </li>
        <div v-if="filteredItems.length === 0" class="py-0.5 pl-3 pr-9">
          <div class="flex items-center">
            <exclamation-circle-icon class="flex-shrink-0 h-6 w-6 p-px text-gray-400" />
            <span class="ml-2 block truncate">No match</span>
          </div>
        </div>
      </ul>
    </div>

    <div>
      <svg
        class="h-5 w-5 text-gray-400 hover:text-gray-500 cursor-pointer"
        viewBox="0 0 20 20"
        fill="currentColor"
        @click="deleteEntry"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, PropType, Ref, ref, toRefs } from 'vue';
import {
  CheckIcon,
  ExclamationCircleIcon,
  QuestionMarkCircleIcon,
  SelectorIcon,
} from '@heroicons/vue/solid';
import scrollIntoView from 'scroll-into-view-if-needed';

import { ei, iconURL } from 'lib';

import Rarity = ei.ArtifactSpec.Rarity;
import {
  Item,
  ItemSelectSpec,
  itemIdToItem,
  excludableItems as items,
  searchItems,
} from '@/lib/select';

export default defineComponent({
  components: {
    CheckIcon,
    ExclamationCircleIcon,
    QuestionMarkCircleIcon,
    SelectorIcon,
  },
  props: {
    modelValue: {
      type: Object as PropType<ItemSelectSpec>,
      required: true,
    },
  },
  emits: {
    'update:modelValue': (_payload: ItemSelectSpec) => true,
    delete: () => true,
  },
  setup(props, { emit }) {
    const { modelValue } = toRefs(props);

    const selectButton: Ref<HTMLElement | null> = ref(null);
    const dropdownList: Ref<HTMLElement | null> = ref(null);

    const selected = computed(() =>
      modelValue.value.id !== null ? itemIdToItem.get(modelValue.value.id)! : null
    );
    const searchFilter = ref(selected.value ? selected.value.display : '');
    const filteredItems = computed(() =>
      searchFilter.value !== '' ? searchItems(searchFilter.value) : items
    );
    const active: Ref<Item | null> = ref(null);

    const dropdownListEntryIndex = (id: string): number => {
      const entries = filteredItems.value;
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].id === id) {
          return i;
        }
      }
      return -1;
    };
    const scrollDropdownListEntryIntoViewIfNeeded = (
      index: number,
      block: ScrollLogicalPosition = 'nearest'
    ) => {
      const node = dropdownList.value?.querySelector(`:scope > li:nth-child(${index + 1})`);
      if (node) {
        scrollIntoView(node, {
          scrollMode: 'if-needed',
          block,
          inline: 'nearest',
          boundary: dropdownList.value,
        });
      }
    };

    const open = ref(false);
    const openDropdown = () => {
      searchFilter.value = '';
      active.value = selected.value;
      open.value = true;
      nextTick(() => {
        if (active.value) {
          const index = dropdownListEntryIndex(active.value.id);
          if (index !== -1) {
            scrollDropdownListEntryIntoViewIfNeeded(index, 'center');
          }
        } else {
          scrollDropdownListEntryIntoViewIfNeeded(0);
        }
      });
    };
    const closeDropdown = () => {
      searchFilter.value = selected.value !== null ? selected.value.display : '';
      open.value = false;
    };
    const selectItem = (item: Item) => {
      emit('update:modelValue', {
        ...modelValue.value,
        id: item.id,
      });
    };
    const activateItem = (item: Item) => {
      active.value = item;
    };
    const deactivateItem = () => {
      active.value = null;
    };
    const handleKeydown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          event.preventDefault();
          // Do nothing if there are no matching entries.
          if (filteredItems.value.length === 0) {
            return;
          }
          // Select the active entry, or the first entry.
          const item = active.value ? active.value : filteredItems.value[0];
          if (item !== null) {
            selectItem(item);
          }
          // Wait for selected entry to be updated before closing the dropdown.
          nextTick(() => {
            closeDropdown();
            selectButton.value?.blur();
          });
          return;
        }
        case 'ArrowDown':
        case 'ArrowUp': {
          event.preventDefault();
          // Do nothing if there are no matching entries.
          if (filteredItems.value.length === 0) {
            return;
          }
          const entries = filteredItems.value;
          let currentIndex = active.value ? dropdownListEntryIndex(active.value.id) : -1;
          if (currentIndex === -1) {
            // No entry currently active.
            currentIndex = event.key === 'ArrowDown' ? -1 : entries.length;
          }
          const newIndex =
            (((event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1) % entries.length) +
              entries.length) %
            entries.length;
          active.value = entries[newIndex];
          scrollDropdownListEntryIntoViewIfNeeded(newIndex);
          return;
        }
      }
    };

    const deleteEntry = () => {
      emit('delete');
    };

    return {
      selectButton,
      dropdownList,
      selected,
      searchFilter,
      filteredItems,
      active,
      // updateCount,
      open,
      openDropdown,
      closeDropdown,
      selectItem,
      activateItem,
      deactivateItem,
      handleKeydown,
      deleteEntry,
      iconURL,
      artifactRarityFgClass,
    };
  },
});

function artifactRarityFgClass(afxRarity: Rarity): string {
  switch (afxRarity) {
    case Rarity.COMMON:
      return '';
    case Rarity.RARE:
      return 'text-rare';
    case Rarity.EPIC:
      return 'text-epic';
    case Rarity.LEGENDARY:
      return 'text-legendary';
  }
}
</script>

<style lang="postcss" scoped>
.text-rare {
  @apply text-blue-500;
}

.text-epic {
  @apply text-purple-500;
}

.text-legendary {
  @apply text-yellow-500;
}
</style>
