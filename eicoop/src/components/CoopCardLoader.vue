<template>
  <div class="relative">
    <coop-card v-if="coopStatus" :status="coopStatus" />
    <coop-card-skeleton v-else :contract-id="contractId" :coop-code="coopCode" :contract="knownContract" />
    <div
      v-if="loading || error"
      class="absolute inset-0 rounded-md bg-gray-200 dark:bg-gray-700 bg-opacity-80 dark:bg-opacity-80"
    >
      <div class="h-full py-4 flex items-center justify-center">
        <base-loading v-if="loading" />
        <div v-else-if="error" class="max-h-full overflow-y-scroll">
          <error-message :error="error" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, provide, Ref, ref, toRefs, watch } from 'vue';

import { CoopStatus, ei, requestCoopStatus } from '@/lib';
import { ContractLeague } from 'lib';
import { refreshCallbackKey } from '@/symbols';
import BaseLoading from '@/components/BaseLoading.vue';
import CoopCard from '@/components/CoopCard.vue';
import CoopCardSkeleton from '@/components/CoopCardSkeleton.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import useContractsStore from '@/stores/contracts';

export default defineComponent({
  components: {
    BaseLoading,
    ErrorMessage,
    CoopCard,
    CoopCardSkeleton,
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
    knownContract: {
      type: Object as PropType<ei.IContract | undefined>,
      default: undefined,
    },
    knownLeague: {
      type: Number as PropType<ContractLeague | undefined>,
      default: undefined,
    },
    knownGrade: {
      type: Number as PropType<ei.Contract.PlayerGrade | undefined>,
      default: undefined,
    },
    // Supply a refreshKey to force a refresh.
    refreshKey: {
      type: Number,
      default: 0,
    },
  },
  emits: {
    success(_payload: CoopStatus) {
      return true;
    },
  },
  setup(props, { emit }) {
    const contractStore = useContractsStore();
    const { contractId, coopCode, knownContract, knownLeague, refreshKey } = toRefs(props);

    const loading = ref(true);
    const coopStatus: Ref<CoopStatus | undefined> = ref(undefined);
    const error: Ref<Error | undefined> = ref(undefined);

    const refreshCoopStatus = async () => {
      loading.value = true;
      error.value = undefined;

      try {
        const status = new CoopStatus(await requestCoopStatus(contractId.value, coopCode.value.toLowerCase()));
        await status.resolveContract({
          store: contractStore.list,
          knownContract: knownContract.value || coopStatus.value?.contract || undefined,
          knownLeague: knownLeague.value || coopStatus.value?.league || undefined,
        });
        contractStore.addContract(status.contract!);
        emit('success', status);
        coopStatus.value = status;
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(`${err}`);
      }
      loading.value = false;
    };
    refreshCoopStatus();
    provide(refreshCallbackKey, () => {
      refreshCoopStatus();
    });
    watch([contractId, coopCode], () => {
      coopStatus.value = undefined;
      refreshCoopStatus();
    });
    watch(refreshKey, () => {
      refreshCoopStatus();
    });

    return {
      loading,
      coopStatus,
      error,
    };
  },
});
</script>
