<template>
  <main class="flex-1 max-w-ultrawide w-full mx-auto mt-2 ultrawide:px-4">
    <coop-card-loader :contract-id="contractId" :coop-code="coopCode" @success="onSuccess" />
    <frequently-asked-questions />
  </main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useStore } from 'vuex';

import { CoopStatus } from '@/lib';
import { HistoryCoopEntry, key } from '@/store';
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
  },
  setup() {
    const store = useStore(key);
    const onSuccess = (coopStatus: CoopStatus) => {
      const entry: HistoryCoopEntry = {
        contractId: coopStatus.contractId,
        contractName: coopStatus.contract!.name!,
        contractEgg: coopStatus.contract!.egg!,
        coopCode: coopStatus.coopCode,
      };
      store.dispatch('history/addCoop', entry);
    };
    return {
      onSuccess,
    };
  },
});
</script>
