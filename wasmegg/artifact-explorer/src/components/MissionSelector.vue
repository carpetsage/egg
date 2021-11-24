<!-- Adapted from loot-simulator/src/components/SimulatorMissionSelect.vue -->

<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      What can I possibly get from this mission?
    </label>

    <div class="relative max-w-sm">
      <div class="relative rounded-md shadow-sm">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <img
            v-if="selected && searchFilter === selected.name"
            :src="iconURL(selected.shipIconPath, 64)"
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
          placeholder="Select mission (type to filter)"
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
          v-for="mission in filteredMissions"
          :key="mission.missionTypeId"
          class="cursor-default select-none relative py-0.5 pl-3 pr-9"
          :class="
            mission.missionTypeId === active?.missionTypeId
              ? 'text-white bg-blue-600'
              : 'text-gray-900'
          "
          @mousedown="selectMission(mission)"
          @mouseenter="activateMission(mission)"
          @mouseleave="deactivateMission()"
        >
          <div class="flex items-center">
            <img
              :src="iconURL(mission.shipIconPath, 64)"
              class="flex-shrink-0 h-6 w-6 rounded-full border"
              :class="durationBorderClass(mission.durationType)"
            />
            <span
              class="ml-2 block truncate"
              :class="
                mission.missionTypeId === selected?.missionTypeId ? 'font-semibold' : 'font-normal'
              "
            >
              {{ mission.name }}
            </span>
          </div>

          <span
            v-if="mission.missionTypeId === selected?.missionTypeId"
            class="absolute inset-y-0 right-0 flex items-center pr-4"
            :class="
              mission.missionTypeId === active?.missionTypeId ? 'text-white' : 'text-blue-600'
            "
          >
            <check-icon class="h-5 w-5" />
          </span>
        </li>
        <div v-if="filteredMissions.length === 0" class="py-0.5 pl-3 pr-9">
          <div class="flex items-center">
            <exclamation-circle-icon class="flex-shrink-0 h-6 w-6 p-px text-gray-400" />
            <span class="ml-2 block truncate">No match</span>
          </div>
        </div>
      </ul>
    </div>

    <p class="text-xs text-gray-500">
      You may use this dropdown, or click on any mission name on the page, including, for instance,
      results in an artifact query.
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

import { iconURL, MissionType } from 'lib';
import { missionIdToMission, missions, searchMissions } from '@/lib/filter';
import { durationBorderClass } from '@/utils';
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
      modelValue.value !== null ? missionIdToMission.get(modelValue.value)! : null
    );
    const searchFilter = ref(selected.value ? selected.value.name : '');
    const filteredMissions = computed(() =>
      searchFilter.value !== '' ? searchMissions(searchFilter.value) : missions
    );
    const active: Ref<MissionType | null> = ref(null);

    const dropdownListEntryIndex = (id: string): number => {
      const entries = filteredMissions.value;
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].missionTypeId === id) {
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
          const index = dropdownListEntryIndex(active.value.missionTypeId);
          if (index !== -1) {
            scrollDropdownListEntryIntoViewIfNeeded(index, 'center');
          }
        } else {
          scrollDropdownListEntryIntoViewIfNeeded(0);
        }
      });
    };
    const closeDropdown = () => {
      searchFilter.value = selected.value !== null ? selected.value.name : '';
      open.value = false;
    };
    const selectMission = (mission: typeof missions[number]) => {
      emit('update:modelValue', mission.missionTypeId);
    };
    const activateMission = (mission: typeof missions[number]) => {
      active.value = mission;
    };
    const deactivateMission = () => {
      active.value = null;
    };
    const handleKeydown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          event.preventDefault();
          // Select the active entry, or the first entry.
          const mission = active.value ? active.value : filteredMissions.value[0];
          if (mission !== null) {
            selectMission(mission);
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
          const entries = filteredMissions.value;
          let currentIndex = active.value ? dropdownListEntryIndex(active.value.missionTypeId) : -1;
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
      filteredMissions,
      active,
      open,
      openDropdown,
      closeDropdown,
      selectMission,
      activateMission,
      deactivateMission,
      handleKeydown,
      durationBorderClass,
      iconURL,
    };
  },
});
</script>
