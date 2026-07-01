<template>
  <optimizer-toolbar
    :has-player-data="!!playerShipsConfig"
    :auto-compute="autoCompute"
    :pending-compute="pendingCompute"
    :player-id="playerId"
    @submit-player-id="submitPlayerId"
    @open-player-overrides-modal="openPlayerOverridesModal"
    @set-auto-compute="setAutoCompute"
    @run-compute="runCompute"
  />

  <optimizer-inventory-panel :rows="inventoryRows" />

  <div class="grid gap-6 mt-4 grid-cols-1">
    <div class="border border-gray-200 rounded-lg p-4">
      <h3 class="text-base font-semibold text-gray-700 mb-3">Best Ship Set</h3>
      <optimizer-solution-card
        v-for="(view, i) in solutionViews"
        :key="'solution-' + i"
        :solution="view.solution"
        :p-craft="view.pCraft"
        :lambda="view.lambda"
        :craft-chain="view.craftChain"
        :mission-legendary-sources="view.missionLegendarySources"
        :has-inventory="!!playerInventory"
        :drop-data-is-sparse="view.dropDataIsSparse"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onUnmounted, ref, toRefs, watch, watchEffect } from 'vue';

import { getSavedPlayerID, requestFirstContact, savePlayerID } from 'lib';

import {
  autoCompute,
  currentOptimizerArtifactId,
  effectiveConfig,
  effectiveFuelTankCapacity,
  effectivePreviousCrafts,
  effectiveTotalCraftingXp,
  missionFilters,
  openPlayerOverridesModal,
  playerInventory,
  playerShipsConfig,
  setAutoCompute,
  setPlayerData,
} from '@/store';
import {
  buildRecipeDag,
  computeBaseYield,
  computeCraftChainRows,
  computeInventoryRows,
  computeMissionLegendaryRows,
  lambdaFromDropProbability,
  legendaryCraftProbabilityOf,
  legendaryDataIsSparse,
  optimize,
  type OptimizerSolution,
} from '@/lib';
import OptimizerToolbar from './optimizer/OptimizerToolbar.vue';
import OptimizerInventoryPanel from './optimizer/OptimizerInventoryPanel.vue';
import OptimizerSolutionCard from './optimizer/OptimizerSolutionCard.vue';

export default defineComponent({
  components: { OptimizerToolbar, OptimizerInventoryPanel, OptimizerSolutionCard },
  props: {
    artifactId: { type: String, required: true },
    maxWaitTimeSeconds: { type: Number, required: true },
  },
  setup(props) {
    const { artifactId, maxWaitTimeSeconds } = toRefs(props);

    const playerId = ref(new URLSearchParams(window.location.search).get('playerId') || getSavedPlayerID() || '');
    if (playerId.value) {
      requestFirstContact(playerId.value).then(data => {
        if (data.backup) setPlayerData(data.backup);
      });
    }

    // let the override modal show the prior craft count for this artifact
    watch(
      artifactId,
      v => {
        currentOptimizerArtifactId.value = v;
      },
      { immediate: true }
    );
    onUnmounted(() => {
      currentOptimizerArtifactId.value = null;
    });

    const submitPlayerId = async (id: string) => {
      playerId.value = id;
      savePlayerID(id);
      const data = await requestFirstContact(id);
      if (data.backup) setPlayerData(data.backup);
    };

    const pendingCompute = ref(false);
    const computedResults = ref<OptimizerSolution[]>([]);

    const recipeDag = computed<ReturnType<typeof buildRecipeDag>>(() =>
      buildRecipeDag(
        [artifactId.value],
        playerInventory.value,
        effectiveTotalCraftingXp.value,
        effectivePreviousCrafts.value
      )
    );

    const playerBaseYield = computed<ReturnType<typeof computeBaseYield>>(() =>
      computeBaseYield(playerInventory.value, [artifactId.value], recipeDag.value)
    );

    function runCompute() {
      const minDurationSeconds = missionFilters.value.minDurationHoursEnabled
        ? missionFilters.value.minDurationHours * 3600
        : undefined;
      computedResults.value = optimize(
        {
          // Eventually, this will be expanded to allow multiple artifacts
          // so array entry is a placeholder
          desiredArtifactNodeIds: [artifactId.value],
          includeNotEnoughData: effectiveConfig.value.showNodata,
          fuelTankCapacity: effectiveFuelTankCapacity.value,
          timeBudgetSeconds: maxWaitTimeSeconds.value,
        },
        effectiveConfig.value,
        recipeDag.value,
        playerBaseYield.value,
        minDurationSeconds
      );
      pendingCompute.value = false;
    }

    // Recompute on any relevant change while auto-compute is on; otherwise
    // just flag that a manual recompute is due. Note that with auto-compute
    // off this effect only tracks autoCompute itself.
    watchEffect(() => {
      if (autoCompute.value) {
        runCompute();
      } else {
        pendingCompute.value = true;
      }
    });

    const inventoryRows = computed(() =>
      computeInventoryRows(artifactId.value, recipeDag.value, playerInventory.value)
    );

    const solutionViews = computed(() =>
      computedResults.value.map(solution => ({
        solution,
        pCraft: legendaryCraftProbabilityOf(solution, artifactId.value),
        lambda: lambdaFromDropProbability(solution.dropProbability),
        craftChain: computeCraftChainRows(solution, artifactId.value, playerInventory.value),
        missionLegendarySources: computeMissionLegendaryRows(solution, artifactId.value),
        dropDataIsSparse: legendaryDataIsSparse(artifactId.value),
      }))
    );

    return {
      autoCompute,
      setAutoCompute,
      pendingCompute,
      playerId,
      runCompute,
      submitPlayerId,
      openPlayerOverridesModal,
      playerShipsConfig,
      playerInventory,
      inventoryRows,
      solutionViews,
    };
  },
});
</script>
