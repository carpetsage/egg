<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <main class="flex-1 max-w-ultrawide w-full mx-auto mt-2 ultrawide:px-4">
    <div v-if="!userId" class="my-4 bg-white dark:bg-gray-800 shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Enter Your EID</h2>
      <p class="text-gray-700 dark:text-gray-300 mb-4">
        If you are a member of this coop, you can enter your EID to view it. Otherwise, you can view all your active
        coops on the
        <router-link to="/dashboard" class="text-blue-500 hover:text-blue-600 transition-colors">dashboard</router-link
        >.
      </p>
      <div class="flex gap-2">
        <input
          v-model="playerIdInput"
          type="text"
          placeholder="Enter your EID (e.g., EI1234567890123456789)"
          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          @click="saveAndContinue"
        >
          Continue
        </button>
      </div>
    </div>
    <div v-else-if="coopCodeMismatch" class="my-4 bg-white dark:bg-gray-800 shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Different Coop Found</h2>
      <p class="text-gray-700 dark:text-gray-300 mb-4">
        You are not a member of the coop in the URL. However, you are a member of a different coop for this contract:
        <strong class="text-gray-900 dark:text-gray-100">{{ actualCoopCode }}</strong>
      </p>
      <button
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        @click="redirectToActualCoop"
      >
        View Your Coop
      </button>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Or view all your active coops on the
        <router-link to="/dashboard" class="text-blue-500 hover:text-blue-600 transition-colors">dashboard</router-link
        >.
      </p>
    </div>
    <template v-else>
      <coop-card-loader
        :contract-id="contractId"
        :coop-code="coopCode"
        :user-id="userId"
        :gradearg="grade"
        :auto-load="autoLoadCoops"
        @success="onSuccess"
      />
      <frequently-asked-questions />
    </template>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';

import { CoopStatus, getSavedPlayerID, savePlayerID, getLocalStorageNoPrefix } from '@/lib';
import useHistoryStore, { HistoryCoopEntry } from '@/stores/history';
import CoopCardLoader from '@/components/CoopCardLoader.vue';
import FrequentlyAskedQuestions from '@/components/FrequentlyAskedQuestions.vue';

export default defineComponent({
  components: {
    CoopCardLoader,
    FrequentlyAskedQuestions,
  },
  props: {
    contractId: {
      type: String,
      required: true,
    },
    coopCode: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const router = useRouter();
    const historyStore = useHistoryStore();
    const { grade, coopCode, contractId } = toRefs(props);
    const userId = ref(getSavedPlayerID());
    const playerIdInput = ref('');
    const coopCodeMismatch = ref(false);
    const actualCoopCode = ref('');
    const autoLoadCoops = ref(getLocalStorageNoPrefix('autoLoadCoops') === 'true');

    const saveAndContinue = () => {
      const trimmedId = playerIdInput.value.trim();
      if (trimmedId) {
        savePlayerID(trimmedId);
        userId.value = trimmedId;
      }
    };

    const onSuccess = (coopStatus: CoopStatus) => {
      // Check if the coop code from the response matches the URL parameter
      if (coopStatus.coopCode.toLowerCase() !== coopCode.value.toLowerCase()) {
        coopCodeMismatch.value = true;
        actualCoopCode.value = coopStatus.coopCode;
        return;
      }

      const entry: HistoryCoopEntry = {
        contractId: coopStatus.contractId,
        contractName: coopStatus.contract!.name!,
        contractEgg: coopStatus.contract!.egg!,
        coopCode: coopStatus.coopCode,
        grade: grade.value,
      };
      historyStore.addCoop(entry);
    };

    const redirectToActualCoop = () => {
      router.push(`/${contractId.value}/${actualCoopCode.value}`);
    };

    // Watch for route param changes and reset state
    watch([contractId, coopCode], () => {
      coopCodeMismatch.value = false;
      actualCoopCode.value = '';
    });

    return {
      userId,
      playerIdInput,
      saveAndContinue,
      onSuccess,
      coopCodeMismatch,
      actualCoopCode,
      redirectToActualCoop,
      autoLoadCoops,
    };
  },
});
</script>
