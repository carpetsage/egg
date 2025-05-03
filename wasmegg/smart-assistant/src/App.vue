<template>
  <the-nav-bar active-entry-id="smart-assistant" />

  <h1 class="mx-4 mt-4 mb-2 text-center text-lg leading-6 font-medium text-gray-900">Smart assistant</h1>

  <the-player-id-form :player-id="playerId" @submit="submitPlayerId" />

  <div class="max-w-5xl w-full px-4 pb-4 xl:px-0 mx-auto">
    <!-- Use a key to recreate on data loading -->
    <base-error-boundary v-if="playerId" :key="`${playerId}:${refreshId}`">
      <suspense>
        <template #default>
          <!-- <the-assistant :player-id="playerId" /> -->
          <the-mirror-assistant :player-id="playerId" />
        </template>
        <template #fallback>
          <base-loading />
        </template>
      </suspense>
    </base-error-boundary>

    <template v-else>
      <div class="text-sm space-y-2">
        <p>
          This tool automatically recommends optimal artifact setups for various prestiging strategies based on what
          artifacts you have. Use in conjuction with
          <a href="/artifact-sandbox/" target="_blank" class="text-blue-500 hover:text-blue-600">Artifact sandbox</a>,
          where you can explore any artifact setup without acquiring the constituents.
        </p>
        <p>
          Also included is an earning bonus planner where you can check the soul eggs and prophecy eggs needed to
          progress to any earning bonus target, with support for artifact effects and epic research preview.
        </p>
      </div>
    </template>
  </div>
  <the-calculator-wrapper />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

import { getSavedPlayerID, savePlayerID } from 'lib';
import BaseErrorBoundary from 'ui/components/BaseErrorBoundary.vue';
import BaseLoading from 'ui/components/BaseLoading.vue';
import TheNavBar from 'ui/components/NavBar.vue';
import ThePlayerIdForm from 'ui/components/PlayerIdForm.vue';
import TheAssistant from '@/components/TheAssistant.vue';
import TheMirrorAssistant from './components/TheMirrorAssistant.vue';
import TheCalculatorWrapper from 'ui/components/TheCalculatorWrapper.vue';

export default defineComponent({
  components: {
    TheNavBar,
    BaseErrorBoundary,
    BaseLoading,
    ThePlayerIdForm,
    TheAssistant,
    TheMirrorAssistant,
    TheCalculatorWrapper,
  },
  setup() {
    const playerId = ref(new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || '');
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
