<template>
  <form class="mx-4 sm:mx-auto sm:max-w-xs sm:w-full mt-2 mb-4 space-y-1" @submit.prevent="$emit('submit', input)">
    <div>
      <label for="email" class="sr-only">Player ID</label>
      <base-input
        id="playerId"
        v-model.trim="input"
        type="text"
        name="playerId"
        class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        placeholder="Player ID"
      />
      <div v-if="eids.size <= 1" class="text-center">
        <span
          v-tippy="{
            content:
              'The ID asked for here is the unique ID used by Egg, Inc.\'s server to identify your account. You can find it in game screen -> nine dots menu -> Settings -> Privacy & Data, at the very bottom. It should look like EI1234567890123456. Your old game services ID prior to the Artifact Update does not work here. Also note that the ID is case-sensitive.',
          }"
          class="mt-2 inline-flex items-center space-x-1"
        >
          <base-info />
          <span class="text-xs text-gray-500">Where do I find my ID?</span>
        </span>
      </div>
      <div v-else class="mt-2 mb-2 w-fit mx-auto">
        <div class="flex flex-wrap gap-2 w-fit">
          <span
            v-for="[eid, name] of eids"
            :key="eid"
            class="inline-flex items-center px-1 py-1 rounded-full bg-gray-200 border border-gray-300 text-xs text-gray-900 w-fit"
          >
            <button
              type="button"
              class="mr-1 text-gray-400 hover:text-blue-500 focus:outline-none"
              aria-label="Edit name"
              @click="eidsStore.editName(eid, name)"
            >
              ✎
            </button>
            <span
              class="hover:underline cursor-pointer"
              style="text-decoration-thickness: 1.5px"
              @click="
                input = eid;
                $emit('submit', eid);
              "
              >{{ name || eid }}</span
            >
            <button
              type="button"
              class="mx-0.5 text-gray-500 hover:text-red-500 focus:outline-none"
              aria-label="Remove"
              @click="eidsStore.removeEid(eid)"
            >
              &times;
            </button>
          </span>
        </div>
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
import BaseInput from './BaseInput.vue';
import { useEidsStore } from 'lib';
import { PlayerIdSchema } from 'lib/schema';

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
    const eidsStore = ref(useEidsStore());
    const input = ref(playerId.value.trim());
    const eids = eidsStore.value.eids;

    // Initialize with current playerId
    if (playerId.value) {
      eidsStore.value.addEid(playerId.value);
    }

    watch(playerId, () => {
      input.value = playerId.value.trim();
      eidsStore.value.addEid(playerId.value);
    });

    const submittable = computed(() => PlayerIdSchema.safeParse(input.value.trim()).success);

    return {
      input,
      submittable,
      eids,
      eidsStore,
    };
  },
});
</script>
