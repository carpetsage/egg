<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <main class="flex-1 max-w-ultrawide w-full mx-auto mt-2 ultrawide:px-4">
    <div class="my-4 bg-white dark:bg-gray-800 shadow rounded-lg p-6 max-w-2xl mx-auto">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Temporarily disabled</h2>
      <p class="text-gray-700 dark:text-gray-300 mb-4">
        Due to changes to the game's API, viewing coops outside of the dashboard is temporarily disabled.
      </p>
      <p class="text-gray-700 dark:text-gray-300">
        If you would like to view your coops, you can use the
        <router-link to="/dashboard" class="text-blue-500 hover:text-blue-600 transition-colors">dashboard</router-link
        >.
      </p>
    </div>
    <template v-if="false">
      <coop-card-loader :contract-id="contractId" :coop-code="coopCode" :gradearg="grade" @success="onSuccess" />
      <frequently-asked-questions />
    </template>
  </main>
</template>

<script lang="ts">
import { defineComponent, toRefs } from 'vue';

import { CoopStatus } from '@/lib';
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
      onSuccess,
    };
  },
});
</script>
