<template>
  <div class="relative">
    <coop-card v-if="coopStatus" :status="coopStatus" />
    <coop-card-skeleton v-else :contract-id="contractId" :coop-code="coopCode" :contract="knownContract" />
    <div
      v-if="!hasLoadedOnce"
      class="absolute inset-0 rounded-md bg-gray-700 bg-opacity-90 flex items-center justify-center"
    >
      <button
        :disabled="loading"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        @click="handleLoadClick"
      >
        <base-loading v-if="loading">
          <span>Loading...</span>
        </base-loading>
        <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{{ loading ? 'Loading...' : 'Load Coop Status' }}</span>
      </button>
    </div>
    <div
      v-else-if="error"
      class="absolute inset-0 rounded-md bg-gray-200 dark:bg-gray-700 bg-opacity-80 dark:bg-opacity-80"
    >
      <div class="h-full py-4 flex items-center justify-center">
        <div class="max-h-full overflow-y-scroll">
          <div v-if="isInvalidMembership" class="px-4 sm:px-6 py-3">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Not a Member</h3>
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-3">
              You are not a member of this coop. To view your coops, use the
              <router-link to="/dashboard" class="text-blue-500 hover:text-blue-600 transition-colors"
                >dashboard</router-link
              >.
            </p>
          </div>
          <error-message v-else :error="error" />
        </div>
      </div>
    </div>
    <base-modal :should-show="showWarningModal" :hide="hideWarningModal">
      <div>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Load Coop Status?</h3>
        <div class="mt-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Checking coop status with your EID will intercept any tokens you've been sent but haven't received yet. They
            usually show up 30 minutes later, but may never reappear.
          </p>
        </div>
        <div class="mt-4 flex gap-3 justify-end">
          <button
            class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            @click="hideWarningModal"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            @click="confirmLoad"
          >
            Load Anyway
          </button>
        </div>
      </div>
    </base-modal>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, provide, Ref, ref, toRefs, watch } from 'vue';

import {
  CoopStatus,
  ei,
  requestCoopStatus,
  getSavedPlayerID,
  getLocalStorageNoPrefix,
  setLocalStorageNoPrefix,
} from '@/lib';
import { ContractLeague } from 'lib';
import { refreshCallbackKey } from '@/symbols';
import BaseLoading from '@/components/BaseLoading.vue';
import BaseModal from '@/components/BaseModal.vue';
import CoopCard from '@/components/CoopCard.vue';
import CoopCardSkeleton from '@/components/CoopCardSkeleton.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import useContractsStore from '@/stores/contracts';

export default defineComponent({
  components: {
    BaseLoading,
    BaseModal,
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
    userId: {
      type: String as PropType<string | undefined>,
      default: undefined,
    },
    autoLoad: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    success(_payload: CoopStatus) {
      return true;
    },
  },
  setup(props, { emit }) {
    const contractStore = useContractsStore();
    const { contractId, coopCode, knownContract, knownLeague, knownGrade, refreshKey, userId, autoLoad } =
      toRefs(props);

    const loading = ref(false);
    const hasLoadedOnce = ref(false);
    const coopStatus: Ref<CoopStatus | undefined> = ref(undefined);
    const error: Ref<Error | undefined> = ref(undefined);
    const showWarningModal = ref(false);
    const isInvalidMembership = ref(false);
    const COOP_LOAD_WARNING_KEY = 'coopLoadWarningAcknowledged';

    const refreshCoopStatus = async () => {
      loading.value = true;
      hasLoadedOnce.value = true;
      error.value = undefined;
      isInvalidMembership.value = false;
      const grade = knownGrade.value;
      let validId = userId.value;

      try {
        // Use userId prop if valid, otherwise fall back to getSavedPlayerID
        if (!userId.value?.startsWith('EI') || userId.value?.length != 19) {
          validId = getSavedPlayerID();
        }
        const status = new CoopStatus(await requestCoopStatus(contractId.value, coopCode.value.toLowerCase(), validId));
        await status.resolveContract({
          store: contractStore.list,
          knownContract: knownContract.value || coopStatus.value?.contract || undefined,
          knownLeague: knownLeague.value || coopStatus.value?.league || undefined,
          knownGrade: grade || coopStatus.value?.grade || undefined,
        });
        contractStore.addContract(status.contract!);
        emit('success', status);
        coopStatus.value = status;
      } catch (err) {
        // Check if it's an invalid membership error
        if (err instanceof Error && err.name === 'InvalidCoopMembershipError') {
          isInvalidMembership.value = true;
          error.value = new Error('You are not a member of this coop. View your coops on the dashboard.');
        } else {
          error.value = err instanceof Error ? err : new Error(`${err}`);
        }
      }
      loading.value = false;
    };

    const hideWarningModal = () => {
      showWarningModal.value = false;
    };

    const confirmLoad = async () => {
      hideWarningModal();
      setLocalStorageNoPrefix(COOP_LOAD_WARNING_KEY, 'true');
      await refreshCoopStatus();
    };

    const handleLoadClick = () => {
      if (getLocalStorageNoPrefix(COOP_LOAD_WARNING_KEY) === 'true') {
        refreshCoopStatus();
      } else {
        showWarningModal.value = true;
      }
    };

    // Auto-load if enabled
    if (autoLoad.value) {
      if (getLocalStorageNoPrefix(COOP_LOAD_WARNING_KEY) === 'true') {
        refreshCoopStatus();
      } else {
        showWarningModal.value = true;
      }
    }

    provide(refreshCallbackKey, () => {
      refreshCoopStatus();
    });
    watch([contractId, coopCode], () => {
      coopStatus.value = undefined;
      hasLoadedOnce.value = false;
      if (autoLoad.value) {
        if (getLocalStorageNoPrefix(COOP_LOAD_WARNING_KEY) === 'true') {
          refreshCoopStatus();
        } else {
          showWarningModal.value = true;
        }
      }
    });
    watch(refreshKey, () => {
      if (autoLoad.value) {
        refreshCoopStatus();
      }
    });
    watch(autoLoad, newVal => {
      if (newVal && !hasLoadedOnce.value) {
        if (getLocalStorageNoPrefix(COOP_LOAD_WARNING_KEY) === 'true') {
          refreshCoopStatus();
        } else {
          showWarningModal.value = true;
        }
      }
    });

    return {
      loading,
      hasLoadedOnce,
      coopStatus,
      error,
      refreshCoopStatus,
      showWarningModal,
      hideWarningModal,
      confirmLoad,
      handleLoadClick,
      isInvalidMembership,
    };
  },
});
</script>
