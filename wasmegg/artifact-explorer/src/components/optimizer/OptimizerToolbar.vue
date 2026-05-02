<template>
  <player-id-form @submit="$emit('submitPlayerId', $event)" />
  <div class="mb-2 flex items-center gap-2 text-xs text-gray-500">
    <template v-if="hasPlayerData">
      <span>Player data loaded.</span>
      <button
        type="button"
        class="flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs rounded-md text-gray-500 bg-gray-100 hover:bg-gray-200 focus:outline-none"
        @click="$emit('openPlayerOverridesModal')"
      >
        Override fields
      </button>
    </template>
    <template v-else>
      <button
        type="button"
        class="flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs rounded-md text-gray-500 bg-gray-100 hover:bg-gray-200 focus:outline-none"
        @click="$emit('openPlayerOverridesModal')"
      >
        Configure
      </button>
    </template>
  </div>
  <div class="mb-2 flex items-center gap-2 text-xs text-gray-500">
    <label class="flex items-center gap-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        class="rounded"
        :checked="autoCompute"
        @change="$emit('setAutoCompute', ($event.target as HTMLInputElement).checked)"
      />
      Auto-compute
    </label>
    <button
      v-if="!autoCompute"
      type="button"
      class="flex items-center px-2 py-1 border shadow-sm rounded-md focus:outline-none"
      :class="
        pendingCompute
          ? 'border-indigo-400 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
          : 'border-gray-300 text-gray-500 bg-gray-100 hover:bg-gray-200'
      "
      @click="$emit('runCompute')"
    >
      {{ pendingCompute ? 'Compute ●' : 'Compute' }}
    </button>
  </div>
  <loot-data-credit />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import PlayerIdForm from 'ui/components/PlayerIdForm.vue';
import LootDataCredit from '@/components/LootDataCredit.vue';

export default defineComponent({
  components: { PlayerIdForm, LootDataCredit },
  props: {
    hasPlayerData: { type: Boolean, required: true },
    autoCompute: { type: Boolean, required: true },
    pendingCompute: { type: Boolean, required: true },
  },
  emits: ['submitPlayerId', 'openPlayerOverridesModal', 'setAutoCompute', 'runCompute'],
});
</script>
