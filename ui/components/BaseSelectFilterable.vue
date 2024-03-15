<!-- Classes Select__input and Select__dropdown can be used to override styles. -->
<template>
  <div ref="dropdownRef" class="relative max-w-sm">
    <div class="relative rounded-md shadow-sm">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <base-icon
          v-if="selected && searchFilter === getItemDisplay(selected)"
          :icon-rel-path="getItemIconPath(selected)"
          :size="64"
          class="flex-shrink-0 h-6 w-6"
        />
        <question-mark-circle-icon v-else class="flex-shrink-0 h-6 w-6 p-px text-gray-400" />
      </div>
      <input
        ref="selectButtonRef"
        :value="searchFilter"
        type="text"
        class="Select__input bg-gray-50 focus:ring-blue-500 focus:border-blue-500 block w-full pl-11 pr-10 sm:text-sm border-gray-300 rounded-md"
        :class="
          selected && searchFilter === getItemDisplay(selected) ? itemColorClass(selected) : null
        "
        spellcheck="false"
        :placeholder="placeholder"
        @input="searchFilter = ($event.target as HTMLInputElement).value"
        @focus="openDropdown"
        @keydown="handleKeydown"
      />
      <div class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
        <selector-icon class="h-5 w-5 text-gray-400" />
      </div>
      <div
        v-if="allowClearing && selected"
        class="absolute inset-y-0 right-7 flex items-center cursor-pointer"
        @click="clearItem"
      >
        <x-icon class="h-4 w-4 text-gray-400" />
      </div>
    </div>

    <ul
      v-show="open"
      ref="dropdownListRef"
      class="Select__dropdown absolute mt-1 w-full bg-white text-gray-900 shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm z-10"
      :style="{ maxHeight: '21.5rem' }"
      tabindex="-1"
    >
      <li
        v-for="item in filteredItems"
        :key="getItemId(item)"
        class="cursor-default select-none relative py-0.5 pl-3 pr-9"
        :class="isSameItem(item, active) ? 'text-white bg-blue-600' : itemColorClass(item)"
        @mousedown="selectItem(item)"
        @mouseenter="activateItem(item)"
        @mouseleave="deactivateItem()"
      >
        <div class="flex items-center">
          <base-icon
            :icon-rel-path="getItemIconPath(item)"
            :size="64"
            class="flex-shrink-0 h-6 w-6"
          />
          <span
            class="ml-2 block truncate"
            :class="isSameItem(item, selected) ? 'font-semibold' : 'font-normal'"
          >
            {{ getItemDisplay(item) }}
          </span>
        </div>

        <span
          v-if="isSameItem(item, selected)"
          class="absolute inset-y-0 right-0 flex items-center pr-4"
          :class="isSameItem(item, active) ? 'text-white' : 'text-blue-600'"
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
</template>

<script lang="ts">
// Generically typed component pattern lifted from:
// https://logaretm.com/blog/generically-typed-vue-components/

import {
  computed,
  defineComponent,
  nextTick,
  onMounted,
  onUnmounted,
  PropType,
  Ref,
  ref,
  toRefs,
} from 'vue';
import {
  CheckIcon,
  ExclamationCircleIcon,
  QuestionMarkCircleIcon,
  SelectorIcon,
  XIcon,
} from '@heroicons/vue/solid';
import scrollIntoView from 'scroll-into-view-if-needed';

import { iconURL } from 'lib';
import BaseIcon from './BaseIcon.vue';

class BaseSelectFilterableFactory<T = unknown> {
  define() {
    return defineComponent({
      components: {
        CheckIcon,
        ExclamationCircleIcon,
        QuestionMarkCircleIcon,
        SelectorIcon,
        XIcon,
        BaseIcon,
      },
      props: {
        modelValue: {
          type: String as PropType<string | null>,
          default: null,
        },
        items: {
          type: Array as PropType<T[]>,
          required: true,
        },
        getItemId: {
          type: Function as PropType<(item: T) => string>,
          required: true,
        },
        getItemDisplay: {
          type: Function as PropType<(item: T) => string>,
          required: true,
        },
        getItemIconPath: {
          type: Function as PropType<(item: T) => string>,
          required: true,
        },
        itemFromId: {
          type: Function as PropType<(id: string) => T>,
          required: true,
        },
        searchItems: {
          type: Function as PropType<(query: string) => T[]>,
          required: true,
        },
        placeholder: {
          type: String,
          required: true,
        },
        itemColorClass: {
          type: Function as PropType<(item: T) => string>,
          default: () => '',
        },
        allowClearing: {
          type: Boolean,
          default: false,
        },
      },
      emits: {
        'update:modelValue': (_payload: string | null) => true,
      },
      setup(props, { emit }) {
        const { modelValue, items, getItemId, getItemDisplay, itemFromId, searchItems } = toRefs(
          props
        );

        const dropdownRef: Ref<HTMLElement | null> = ref(null);
        const selectButtonRef: Ref<HTMLElement | null> = ref(null);
        const dropdownListRef: Ref<HTMLElement | null> = ref(null);

        const selected = computed(() =>
          modelValue.value !== null ? itemFromId.value(modelValue.value) : null
        );
        const searchFilter = ref(selected.value ? getItemDisplay.value(selected.value) : '');
        const filteredItems = computed(() =>
          searchFilter.value !== '' ? searchItems.value(searchFilter.value) : (items.value as T[])
        );
        const active: Ref<T | null> = ref(null);

        const dropdownListEntryIndex = (item: T): number => {
          for (let i = 0; i < filteredItems.value.length; i++) {
            if (isSameItem(filteredItems.value[i], item)) {
              return i;
            }
          }
          return -1;
        };
        const scrollDropdownListEntryIntoViewIfNeeded = (
          index: number,
          block: ScrollLogicalPosition = 'nearest'
        ) => {
          const node = dropdownListRef.value?.querySelector(`:scope > li:nth-child(${index + 1})`);
          if (node) {
            scrollIntoView(node, {
              scrollMode: 'if-needed',
              block,
              inline: 'nearest',
              boundary: dropdownListRef.value,
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
              const index = dropdownListEntryIndex(active.value);
              if (index !== -1) {
                scrollDropdownListEntryIntoViewIfNeeded(index, 'center');
              }
            } else {
              scrollDropdownListEntryIntoViewIfNeeded(0);
            }
          });
        };
        const closeDropdown = () => {
          searchFilter.value = selected.value !== null ? getItemDisplay.value(selected.value) : '';
          open.value = false;
          selectButtonRef.value?.blur();
        };
        const selectItem = (item: T) => {
          emit('update:modelValue', getItemId.value(item));
          // Wait for selected entry to be updated before closing the dropdown.
          nextTick(closeDropdown);
        };
        const clearItem = () => {
          emit('update:modelValue', null);
          searchFilter.value = '';
        };
        const activateItem = (item: T) => {
          active.value = item;
        };
        const deactivateItem = () => {
          active.value = null;
        };
        const isSameItem = (i1: T | null, i2: T | null) => {
          if (i1 === null || i2 === null) {
            return false;
          }
          return getItemId.value(i1) === getItemId.value(i2);
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
              const item = active.value ?? filteredItems.value[0];
              if (item !== null) {
                selectItem(item);
              }
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
              let currentIndex = active.value ? dropdownListEntryIndex(active.value) : -1;
              if (currentIndex === -1) {
                // No entry currently active.
                currentIndex = event.key === 'ArrowDown' ? -1 : entries.length;
              }
              const newIndex =
                (((event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1) %
                  entries.length) +
                  entries.length) %
                entries.length;
              active.value = entries[newIndex];
              scrollDropdownListEntryIntoViewIfNeeded(newIndex);
              return;
            }

            case 'Home':
            case 'End':
            case 'PageUp':
            case 'PageDown': {
              event.preventDefault();
              const entries = filteredItems.value;
              const newIndex =
                event.key === 'Home' || event.key === 'PageUp' ? 0 : entries.length - 1;
              active.value = entries[newIndex];
              scrollDropdownListEntryIntoViewIfNeeded(newIndex);
              return;
            }

            case 'Escape':
              closeDropdown();
              return;
          }
        };

        // Close dropdown when clicking or focusing elsewhere.
        const handleMousedown = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (!dropdownRef.value?.contains(target)) {
            closeDropdown();
          }
        };
        const handleFocus = () => {
          const active = document.activeElement;
          if (!dropdownRef.value?.contains(active)) {
            closeDropdown();
          }
        };
        onMounted(() => {
          window.addEventListener('mousedown', handleMousedown);
          window.addEventListener('focus', handleFocus, true);
        });
        onUnmounted(() => {
          window.removeEventListener('mousedown', handleMousedown);
          window.removeEventListener('focus', handleFocus);
        });

        return {
          dropdownRef,
          selectButtonRef,
          dropdownListRef,
          selected,
          searchFilter,
          filteredItems,
          active,
          open,
          openDropdown,
          closeDropdown,
          selectItem,
          clearItem,
          activateItem,
          deactivateItem,
          isSameItem,
          handleKeydown,
          iconURL,
        };
      },
    });
  }
}

const main = new BaseSelectFilterableFactory().define();

export function GenericBaseSelectFilterable<T>() {
  // This now will be casted correctly!
  return main as ReturnType<BaseSelectFilterableFactory<T>['define']>;
}

export default main;
</script>
