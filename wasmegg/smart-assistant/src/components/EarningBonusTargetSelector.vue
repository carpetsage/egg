<template>
  <div>
    <Listbox v-model="selected" as="div" class="sm:max-w-xs">
      <ListboxLabel class="block text-sm">Select your target EB:</ListboxLabel>
      <div class="mt-1 relative">
        <ListboxButton
          class="bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <span class="block truncate">
            <template v-if="selected">
              <span :style="{ color: selected.color }">{{ selected.name }}</span>
              <span>,</span>
              <span class="ml-1.5">{{ formatEIValue(10 ** (selected.oom + 2), { trim: true }) }}%</span>
            </template>
            <template v-else>Custom target</template>
          </span>
          <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <SelectorIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </ListboxButton>

        <transition
          leave-active-class="transition ease-in duration-100"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          >
            <ListboxOption
              v-for="(target, index) in [...targets, null]"
              :key="index"
              v-slot="{ active: isActive, selected: isSelected }"
              as="template"
              :value="target"
            >
              <li
                :class="[
                  isActive ? 'text-white bg-blue-600' : 'text-gray-900',
                  'cursor-default select-none relative py-0.5 pl-3 pr-9',
                ]"
              >
                <span :class="isSelected ? 'font-semibold' : 'font-normal'">
                  <template v-if="target">
                    <span :style="isActive ? {} : { color: target.color }">{{ target.name }}</span>
                    <span>,</span>
                    <span class="ml-1.5">{{ formatEIValue(10 ** (target.oom + 2), { trim: true }) }}%</span>
                  </template>
                  <template v-else>Custom target</template>
                </span>

                <span
                  v-if="isSelected"
                  class="absolute inset-y-0 right-0 flex items-center pr-4"
                  :class="isActive ? 'text-white' : 'text-blue-600'"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>

    <base-e-i-value-input
      v-if="selected === null"
      v-model:raw="rawCustomEBPercentage"
      v-model:value="customEBPercentage"
      :lazy="true"
    >
      <template #default="{ input, invalid, updateInput, updateValue }">
        <div
          class="relative sm:max-w-xs border border-gray-300 rounded-md px-3 py-2 shadow-sm focus-within:ring-1 mt-4"
          :class="
            invalid
              ? 'focus-within:ring-red-600 focus-within:border-red-600'
              : 'focus-within:ring-blue-600 focus-within:border-blue-600'
          "
        >
          <label class="absolute -top-2 left-2 -mt-px inline-block px-1 bg-white text-xs font-medium text-gray-900"
            >Custom EB target</label
          >
          <input
            :value="input"
            type="text"
            spellcheck="false"
            class="block w-full border-0 p-0 focus:ring-0 sm:text-sm pr-10"
            :class="invalid ? 'text-red-700' : 'text-gray-900'"
            @input="updateInput"
            @blur="updateValue"
            @keyup.enter="blurEventTarget"
          />
          <div
            class="absolute right-0 top-0 bottom-0 px-3 py-2 sm:text-sm bg-gray-50 text-gray-500 rounded-r-md border-l border-gray-300"
          >
            %
          </div>
        </div>
        <div class="text-xs mt-2">Valid OoM units: {{ units.map(unit => unit.symbol).join(', ') }}.</div>
      </template>
    </base-e-i-value-input>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, Ref, ref, toRefs, watch } from 'vue';
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { CheckIcon, SelectorIcon } from '@heroicons/vue/solid';

import { FarmerRole, formatEIValue, units } from 'lib';
import BaseEIValueInput from 'ui/components/BaseEIValueInput.vue';

export default defineComponent({
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
    CheckIcon,
    SelectorIcon,
    BaseEIValueInput,
  },
  props: {
    targets: {
      type: Array as PropType<FarmerRole[]>,
      required: true,
    },
    selectedTarget: {
      type: Object as PropType<FarmerRole>,
      required: true,
    },
  },
  emits: {
    'update:selectedTarget': (_payload: FarmerRole) => true,
  },
  setup(props, { emit }) {
    const { targets, selectedTarget } = toRefs(props);
    // Selecting null stands for custom EB target.
    const selected: Ref<FarmerRole | null> = ref(selectedTarget.value);
    const defaultCustomEBPercentage = 10 ** (targets.value[0].oom + 2);
    const rawCustomEBPercentage = ref(formatEIValue(defaultCustomEBPercentage, { trim: true }));
    const customEBPercentage = ref(defaultCustomEBPercentage);
    watch([selected, customEBPercentage], () => {
      emit(
        'update:selectedTarget',
        selected.value !== null
          ? selected.value
          : {
              oom: Math.log10(customEBPercentage.value / 100),
              name: '',
              color: 'inherit',
            }
      );
    });
    const blurEventTarget = (event: Event) => {
      (event.target as HTMLElement).blur();
    };
    return {
      selected,
      rawCustomEBPercentage,
      customEBPercentage,
      blurEventTarget,
      units,
      formatEIValue,
    };
  },
});
</script>
