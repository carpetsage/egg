<template>
  <Dropdown
    :modelValue="selectedContract"
    :options="contracts"
    optionLabel="name"
    placeholder="-- Select contract --"
    @update:modelValue="updateSelectedContract"
  >
    <template #value="slotProps">
      <div class="flex items-center transition-none">
        <img
          :src="
            slotProps.value ? eggIconURL(slotProps.value) : iconURL('egginc/egg_unknown.png', 64)
          "
          class="flex-shrink-0 -ml-0.5 h-6 w-6 rounded-full"
        />
        <div class="ml-2 block truncate transition-none">
          {{ slotProps.value ? slotProps.value.name : slotProps.placeholder }}
        </div>
      </div>
    </template>

    <template #option="slotProps">
      <div class="flex items-center transition-none">
        <img
          :src="eggIconURL(slotProps.option)"
          class="flex-shrink-0 -ml-0.5 h-6 w-6 rounded-full"
        />
        <div
          class="ml-2 block truncate transition-none"
          :class="slotProps.option.id === modelValue ? 'font-semibold' : 'font-normal'"
        >
          {{ slotProps.option.name }}
        </div>
      </div>

      <span
        v-if="slotProps.option.id === modelValue"
        class="text-green-500 absolute inset-y-0 right-0 flex items-center pr-4"
      >
        <!-- Heroicon name: solid/check -->
        <svg
          class="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </span>
    </template>
  </Dropdown>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import Dropdown from 'primevue/dropdown';

import { Contract, eggIconPath } from '@/lib';
import { iconURL } from '@/utils';

export default defineComponent({
  components: {
    Dropdown,
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
    const updateSelectedContract = (selected: Contract | null) => {
      emit('update:modelValue', selected ? selected.id : '');
    };
    const eggIconURL = (contract: Contract) => iconURL(eggIconPath(contract.egg!), 64);
    return {
      selectedContract,
      updateSelectedContract,
      iconURL,
      eggIconURL,
    };
  },
});
</script>

<style lang="postcss" scoped src="@/css/components/Dropdown.css"></style>
