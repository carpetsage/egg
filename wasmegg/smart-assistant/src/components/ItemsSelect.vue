<!-- Adapted from loot-simulator/src/components/SimulatorItemsSelect.vue -->

<template>
  <div class="space-y-2">
    <item-select
      v-for="(entry, index) in modelValue"
      :key="entry.rowid"
      :model-value="entry"
      @update:model-value="updateItem(index, $event)"
      @delete="() => deleteItem(index)"
    />
    <button type="button" class="px-1 rounded-md flex items-center focus:outline-none" @click="addItem">
      <span
        class="-ml-1 w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"
      >
        <plus-icon class="h-4 w-4" />
      </span>
      <span class="ml-2 text-sm text-gray-900">Add another artifact</span>
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, toRefs } from 'vue';
import { PlusIcon } from '@heroicons/vue/solid';
import { v4 as uuidv4 } from 'uuid';

import ItemSelect from '@/components/ItemSelect.vue';
import { ItemSelectSpec } from '@/lib/select';

export default defineComponent({
  components: {
    ItemSelect,
    PlusIcon,
  },
  props: {
    modelValue: {
      type: Array as PropType<ItemSelectSpec[]>,
      required: true,
    },
  },
  emits: {
    'update:modelValue': (_payload: ItemSelectSpec[]) => true,
  },
  setup(props, { emit }) {
    const { modelValue } = toRefs(props);
    const addItem = () => {
      const updated = [...modelValue.value];
      updated.push({
        id: null,
        rowid: uuidv4(),
      });
      emit('update:modelValue', updated);
    };
    const updateItem = (index: number, spec: ItemSelectSpec) => {
      const updated = [...modelValue.value];
      updated[index] = spec;
      emit('update:modelValue', updated);
    };
    const deleteItem = (index: number) => {
      const updated = [...modelValue.value];
      updated.splice(index, 1);
      emit('update:modelValue', updated);
    };
    return {
      addItem,
      updateItem,
      deleteItem,
    };
  },
});
</script>
