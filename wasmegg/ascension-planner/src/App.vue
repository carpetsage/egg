<template>
  <the-nav-bar active-entry-id="ascension-planner" />

  <div class="max-w-3xl w-full px-4 pb-4 xl:px-0 mx-auto">
    <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">
      Ascension Planner
    </h1>

    <p class="text-sm text-gray-600 text-center mb-4">
      Plan your ascension journey: which eggs to visit, what to buy, and when to shift.
    </p>

    <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
      <suspense>
        <template #default>
          <the-planner :player-id="playerId" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </suspense>
    </base-error-boundary>

    <template v-else>
      <step-chain />
      <p class="text-xs text-gray-500 text-center mt-4">
        Load your player data above to auto-fill your current state, or plan manually below.
      </p>
    </template>
  </div>

  <asset-browser />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { getSavedPlayerID, savePlayerID } from 'lib';
import TheNavBar from 'ui/components/NavBar.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import ThePlanner from '@/components/ThePlanner.vue';
import StepChain from '@/components/StepChain.vue';
import AssetBrowser from '@/components/AssetBrowser.vue';

export default defineComponent({
  components: {
    TheNavBar,
    ThePlayerIdForm,
    BaseErrorBoundary,
    BaseLoading,
    ThePlanner,
    StepChain,
    AssetBrowser,
  },
  setup() {
    const playerId = ref(
      new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || ''
    );
    const refreshId = ref(Date.now());

    const submitPlayerId = (id: string) => {
      playerId.value = id;
      refreshId.value = Date.now();
      savePlayerID(id);
    };

    return {
      playerId,
      refreshId,
      submitPlayerId,
    };
  },
});
</script>
