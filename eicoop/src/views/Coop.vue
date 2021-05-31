<template>
  <main class="flex-1 max-w-ultrawide w-full mx-auto mt-6 ultrawide:px-4">
    <!-- Use a key to recreate on navigation -->
    <base-error-boundary :key="`${contractId}:${coopCode}:${refreshId}`">
      <Suspense>
        <template #default>
          <coop-card :contract-id="contractId" :coop-code="coopCode" @success="onSuccess" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </Suspense>
    </base-error-boundary>
  </main>
</template>

<script lang="ts">
import { defineComponent, provide, ref } from 'vue';
import { useStore } from 'vuex';

import { CoopStatus } from '@/lib';
import { HistoryCoopEntry, key } from '@/store';
import { refreshCallbackKey } from '@/symbols';
import BaseErrorBoundary from '@/components/BaseErrorBoundary.vue';
import BaseLoading from '@/components/BaseLoading.vue';
import CoopCard from '@/components/CoopCard.vue';

export default defineComponent({
  components: {
    BaseErrorBoundary,
    BaseLoading,
    CoopCard,
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

    const refreshId = ref(Date.now());
    provide(refreshCallbackKey, () => {
      refreshId.value = Date.now();
    });

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
      refreshId,
      onSuccess,
    };
  },
});
</script>
