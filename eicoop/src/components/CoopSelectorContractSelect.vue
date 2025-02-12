<template>
  <Listbox as="div" :model-value="selectedContract" @update:model-value="updateSelectedContract">
    <ListboxLabel class="block text-sm text-gray-900 dark:text-gray-100" for="contract_id_selected">
      Select a contract:
    </ListboxLabel>
    <div class="mt-1 relative">
      <ListboxButton
        class="bg-white relative w-full border border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default sm:text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:border-gray-500 !duration-0"
      >
        <span class="flex items-center">
          <base-icon
            :icon-rel-path="selectedContract ? contractEggIconPath(selectedContract) : 'egginc/egg_unknown.png'"
            :size="64"
            class="flex-shrink-0 -ml-0.5 h-6 w-6 rounded-full"
          />
          <span class="ml-2 block truncate">
            {{ selectedContract ? selectedContract.name : '-- Select contract --' }}
          </span>
        </span>
        <span class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <SelectorIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </ListboxButton>

      <transition
        leave-active-class="transition ease-in !duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions
          class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
        >
          <ListboxOption
            v-for="contract in contracts"
            :key="contract.id"
            v-slot="{ active, selected }"
            as="template"
            :value="contract"
          >
            <li
              class="dark:text-white cursor-default select-none relative py-1 pl-3 pr-9 transition-none"
              :class="active ? 'text-white dark:text-white bg-blue-600' : 'text-gray-900'"
            >
              <div class="flex items-center !duration-0">
                <base-icon
                  :icon-rel-path="contractEggIconPath(contract)"
                  :size="64"
                  class="flex-shrink-0 -ml-0.5 h-6 w-6 rounded-full"
                />
                <span class="!duration-0" :class="[selected ? 'font-semibold' : 'font-normal', 'ml-2 block truncate']">
                  {{ contract.name }}
                </span>
              </div>

              <span v-if="selected" class="text-green-500 absolute inset-y-0 right-0 flex items-center pr-4">
                <CheckIcon class="h-5 w-5" aria-hidden="true" />
              </span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/vue';
import { CheckIcon, SelectorIcon } from '@heroicons/vue/solid';

import { Contract, eggIconPath } from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';

export default defineComponent({
  components: {
    Listbox,
    ListboxButton,
    ListboxLabel,
    ListboxOption,
    ListboxOptions,
    CheckIcon,
    SelectorIcon,
    BaseIcon,
  },
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    contracts: {
      type: Array as PropType<Contract[]>,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { modelValue: selectedContractId, contracts } = toRefs(props);
    const selectedContract = computed(() => {
      for (const contract of contracts.value) {
        if (selectedContractId.value === contract.id) {
          return contract;
        }
      }
      return null;
    });
    // Use 'unknown' type for selected to accommodate weak type info on the Listbox
    // component's update:modelValue event ($event has 'unknown' type).
    const updateSelectedContract = (selected: unknown) => {
      emit('update:modelValue', (selected as Contract).id);
    };
    const contractEggIconPath = (contract: Contract) => eggIconPath(contract.egg!, contract.customEggId);
    return {
      selectedContract,
      updateSelectedContract,
      contractEggIconPath,
    };
  },
});
</script>
