<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <main class="flex-1 max-w-ultrawide w-full mx-auto mt-2 ultrawide:px-4">
    <div class="my-4 bg-white dark:bg-gray-800 shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Temporarily disabled</h2>
      <p class="text-gray-700 dark:text-gray-300 mb-4">
        Due to the recent update breaking the API, viewing coops outside of the dashboard is disabled until the API is functional again.
      </p>
      <p class="text-gray-700 dark:text-gray-300">
        If you would like to view your coops, you can use the
        <router-link to="/dashboard" class="text-blue-500 hover:text-blue-600 transition-colors">dashboard</router-link
        >.
      </p>
    </div>
    <template v-if="false">
      <coop-card-loader :contract-id="contractId" :coop-code="coopCode" :knownGrade="parsedGrade" @success="onSuccess" />
      <frequently-asked-questions />
    </template>
  </main>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';

import { ei, CoopStatus } from '@/lib';
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
    const historyStore = useHistoryStore();
    const { grade } = toRefs(props);
    const parsedGrade = computed<ei.Contract.PlayerGrade | undefined>(() =>
      grade.value ? (Number(grade.value) as ei.Contract.PlayerGrade) : undefined
    );
    const onSuccess = (coopStatus: CoopStatus) => {
      const entry: HistoryCoopEntry = {
        contractId: coopStatus.contractId,
        contractName: coopStatus.contract!.name!,
        contractEgg: coopStatus.contract!.egg!,
        coopCode: coopStatus.coopCode,
        grade: grade.value,
      };
      historyStore.addCoop(entry);
    };
    return {
      parsedGrade,
      onSuccess,
    };
  },
});
</script>
