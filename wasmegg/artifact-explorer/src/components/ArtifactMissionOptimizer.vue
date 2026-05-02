<template>
  <optimizer-toolbar
    :has-player-data="!!playerShipsConfig"
    :auto-compute="autoCompute"
    :pending-compute="pendingCompute"
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
        :key="'fw-' + i"
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
    requestFirstContact(playerId.value).then(data => {
      if (data.backup) setPlayerData(data.backup);
    });

    // Expose the targeted artifact to the override modal so it can show the
    // player's prior craft count for it.
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
    };

    const pendingCompute = ref(false);
    const computedResults = ref<OptimizerSolution[]>([]);

    const dagBundle = computed<ReturnType<typeof buildRecipeDag>>(() =>
      buildRecipeDag(
        [artifactId.value],
        playerInventory.value,
        effectiveTotalCraftingXp.value,
        effectivePreviousCrafts.value
      )
    );

    watchEffect(() => {
      const minDurationSeconds = missionFilters.value.minDurationHoursEnabled
        ? missionFilters.value.minDurationHours * 3600
        : undefined;
      const args = {
        desired_artifact_node_ids: [artifactId.value],
        include_not_enough_data: effectiveConfig.value.showNodata,
        fuel_tank_capacity: effectiveFuelTankCapacity.value,
        time_budget_seconds: maxWaitTimeSeconds.value,
      };
      if (autoCompute.value) {
        computedResults.value = optimize(
          args,
          effectiveConfig.value,
          dagBundle.value.dag,
          dagBundle.value.baseYield,
          minDurationSeconds
        );
        pendingCompute.value = false;
      } else {
        pendingCompute.value = true;
      }
    });

    function runCompute() {
      const minDurationSeconds = missionFilters.value.minDurationHoursEnabled
        ? missionFilters.value.minDurationHours * 3600
        : undefined;
      computedResults.value = optimize(
        {
          desired_artifact_node_ids: [artifactId.value],
          include_not_enough_data: effectiveConfig.value.showNodata,
          fuel_tank_capacity: effectiveFuelTankCapacity.value,
          time_budget_seconds: maxWaitTimeSeconds.value,
        },
        effectiveConfig.value,
        dagBundle.value.dag,
        dagBundle.value.baseYield,
        minDurationSeconds
      );
      pendingCompute.value = false;
    }

    const inventoryRows = computed(() =>
      computeInventoryRows(artifactId.value, dagBundle.value.dag, playerInventory.value)
    );

    const solutionViews = computed(() =>
      computedResults.value.map(solution => ({
        solution,
        pCraft: legendaryCraftProbabilityOf(solution, artifactId.value),
        lambda: lambdaFromDropProbability(solution.drop_probability),
        craftChain: computeCraftChainRows(solution, artifactId.value, playerInventory.value),
        missionLegendarySources: computeMissionLegendaryRows(solution, artifactId.value),
        dropDataIsSparse: legendaryDataIsSparse(artifactId.value),
      }))
    );

    return {
      autoCompute,
      setAutoCompute,
      pendingCompute,
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
