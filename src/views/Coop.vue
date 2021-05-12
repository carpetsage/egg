<template>
  <main class="flex-1 max-w-8xl w-full mx-auto mt-6">
    <base-collapsible-panel title="Configuration" :collapse="!showConfig" :toggle="toggleConfig">
      <base-checkbox
        name="config-show-role-column"
        :modelValue="configShowRoleColumn"
        @update:modelValue="toggleConfigShowRoleColumn"
      >
        <span class="text-green-700 dark:text-green-300">Show role column</span>
        <base-info class="ml-0.5" classes="text-green-600 dark:text-green-400">
          The roles shown are farmer roles used in the Egg, Inc. Discord server.
        </base-info>
      </base-checkbox>
    </base-collapsible-panel>

    <!-- Use a key to recreate on navigation -->
    <base-error-boundary :key="`${contractId}:${coopCode}:${refreshId}`">
      <Suspense>
        <template #default>
          <coop-card :contractId="contractId" :coopCode="coopCode" @success="onSuccess" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </Suspense>
    </base-error-boundary>
  </main>
</template>

<script lang="ts">
import { computed, defineComponent, provide, ref } from 'vue';
import { useStore } from 'vuex';

import { CoopStatus } from '@/lib';
import { HistoryCoopEntry, key } from '@/store';
import { refreshCallbackKey } from '@/symbols';
import BaseCheckbox from '@/components/BaseCheckbox.vue';
import BaseCollapsiblePanel from '@/components/BaseCollapsiblePanel.vue';
import BaseErrorBoundary from '@/components/BaseErrorBoundary.vue';
import BaseInfo from '@/components/BaseInfo.vue';
import BaseLoading from '@/components/BaseLoading.vue';
import CoopCard from '@/components/CoopCard.vue';

export default defineComponent({
  components: {
    BaseCheckbox,
    BaseCollapsiblePanel,
    BaseErrorBoundary,
    BaseInfo,
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

    const showConfig = computed(() => store.state.coopConfig.showConfig);
    const toggleConfig = () => {
      store.dispatch('coopConfig/toggleShowConfig');
    };

    const configShowRoleColumn = computed(() => store.state.coopConfig.showRoleColumn);
    const toggleConfigShowRoleColumn = () => {
      store.dispatch('coopConfig/toggleShowRoleColumn');
    };

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
      showConfig,
      toggleConfig,
      configShowRoleColumn,
      toggleConfigShowRoleColumn,
      refreshId,
      onSuccess,
    };
  },
});
</script>
