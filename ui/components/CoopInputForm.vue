<template>
  <form
    class="mx-4 sm:mx-auto sm:max-w-xs sm:w-full mt-2 mb-4 space-y-1"
    @submit.prevent="$emit('submit', input)"
  >
    <div>
      <label for="contractId" class="ml-2 items-center text-sm text-gray-900"> ">Player ID</label>
      <base-input
        id="contractId"
        v-model.trim="input"
        type="text"
        name="contractId"
        class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="Contract ID"
      />
      <div class="text-center">
        <span
          v-tippy="{
            content:
              'The ID asked for here is the unique ID used by Egg, Inc.\'s server to identify each contract. You can find it in the home page of Eicoop in the ID column',
          }"
          class="mt-2 inline-flex items-center space-x-1"
        >
          <base-info />
          <span class="text-xs text-gray-500">Where do I find the ID?</span>
        </span>
      </div>
    </div>
    <div>
      <button
        type="submit"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        :class="{ 'cursor-not-allowed': !submittable }"
        :disabled="!submittable"
      >
        Load Player Data
      </button>
    </div>
  </form>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRefs, watch } from 'vue';

import BaseInfo from './BaseInfo.vue';
import BaseInput from 'ui/components/BaseInput.vue';

export default defineComponent({
  components: {
    BaseInfo,
    BaseInput,
  },
  props: {
    playerId: {
      type: String,
      default: '',
    },
  },
  emits: {
    submit: (_playerId: string) => true,
  },
  setup(props) {
    const { playerId } = toRefs(props);
    const input = ref(playerId.value);
    watch(playerId, () => {
      input.value = playerId.value;
    });
    const submittable = computed(() => input.value !== '');
    return {
      input,
      submittable,
    };
  },
});
</script>
