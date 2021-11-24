<!-- Adapted from loot-simulator/src/components/SimulatorArtifactSelect.vue -->

<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      What does this artifact do and how do I get it?
    </label>

    <div class="relative max-w-sm">
      <div class="relative rounded-md shadow-sm">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <img
            v-if="selected && searchFilter === selected.display"
            :src="iconURL('egginc/' + selected.icon_filename, 64)"
            class="flex-shrink-0 h-6 w-6"
          />
          <question-mark-circle-icon v-else class="flex-shrink-0 h-6 w-6 p-px text-gray-400" />
        </div>
        <base-input
          ref="selectButton"
          v-model="searchFilter"
          type="text"
          class="bg-gray-50 focus:ring-blue-500 focus:border-blue-500 block w-full pl-11 pr-10 sm:text-sm border-gray-300 rounded-md"
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
          v-for="artifact in filteredArtifacts"
          :key="artifact.id"
          class="cursor-default select-none relative py-0.5 pl-3 pr-9"
          :class="artifact.id === active?.id ? 'text-white bg-blue-600' : 'text-gray-900'"
          @mousedown="selectArtifact(artifact)"
          @mouseenter="activateArtifact(artifact)"
          @mouseleave="deactivateArtifact()"
        >
          <div class="flex items-center">
            <img
              :src="iconURL('egginc/' + artifact.icon_filename, 64)"
              class="flex-shrink-0 h-6 w-6"
            />
            <span
              class="ml-2 block truncate"
              :class="artifact.id === selected?.id ? 'font-semibold' : 'font-normal'"
            >
              {{ artifact.display }}
            </span>
          </div>

          <span
            v-if="artifact.id === selected?.id"
            class="absolute inset-y-0 right-0 flex items-center pr-4"
            :class="artifact.id === active?.id ? 'text-white' : 'text-blue-600'"
          >
            <check-icon class="h-5 w-5" />
          </span>
        </li>
        <div v-if="filteredArtifacts.length === 0" class="py-0.5 pl-3 pr-9">
          <div class="flex items-center">
            <exclamation-circle-icon class="flex-shrink-0 h-6 w-6 p-px text-gray-400" />
            <span class="ml-2 block truncate">No match</span>
          </div>
        </div>
      </ul>
    </div>

    <p class="text-xs text-gray-500">
      You may use this dropdown or the visual artifacts picker below, or click on any artifact name
      on the page, including, for instance, results in a mission query.
    </p>
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

import { AfxTier, iconURL } from 'lib';
import { artifactIdToArtifact, artifacts, searchArtifacts } from '@/lib/filter';
import BaseInput from 'ui/components/BaseInput.vue';

export default defineComponent({
  components: {
    CheckIcon,
    ExclamationCircleIcon,
    QuestionMarkCircleIcon,
    SelectorIcon,
    BaseInput,
  },
  props: {
    modelValue: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: {
    'update:modelValue': (_payload: string | null) => true,
    delete: () => true,
  },
  setup(props, { emit }) {
    const { modelValue } = toRefs(props);

    const selectButton: Ref<HTMLElement | null> = ref(null);
    const dropdownList: Ref<HTMLElement | null> = ref(null);

    const selected = computed(() =>
      modelValue.value !== null ? artifactIdToArtifact.get(modelValue.value)! : null
    );
    const searchFilter = ref(selected.value ? selected.value.display : '');
    const filteredArtifacts = computed(() =>
      searchFilter.value !== '' ? searchArtifacts(searchFilter.value) : artifacts
    );
    const active: Ref<AfxTier | null> = ref(null);

    const dropdownListEntryIndex = (id: string): number => {
      const entries = filteredArtifacts.value;
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
    const selectArtifact = (artifact: AfxTier) => {
      emit('update:modelValue', artifact.id);
    };
    const activateArtifact = (artifact: AfxTier) => {
      active.value = artifact;
    };
    const deactivateArtifact = () => {
      active.value = null;
    };
    const handleKeydown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          event.preventDefault();
          // Do nothing if there are no matching entries.
          if (filteredArtifacts.value.length === 0) {
            return;
          }
          // Select the active entry, or the first entry.
          const artifact = active.value ? active.value : filteredArtifacts.value[0];
          if (artifact !== null) {
            selectArtifact(artifact);
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
          if (filteredArtifacts.value.length === 0) {
            return;
          }
          const entries = filteredArtifacts.value;
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

    return {
      selectButton,
      dropdownList,
      selected,
      searchFilter,
      filteredArtifacts,
      active,
      open,
      openDropdown,
      closeDropdown,
      selectArtifact,
      activateArtifact,
      deactivateArtifact,
      handleKeydown,
      iconURL,
    };
  },
});
</script>
