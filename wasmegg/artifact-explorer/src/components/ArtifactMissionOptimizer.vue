<template>
  <div class="lg:grid lg:grid-cols-[minmax(280px,340px)_1fr] lg:gap-6 space-y-6 lg:space-y-0">
    <!-- Left: inputs sidebar -->
    <div class="lg:sticky lg:top-4 self-start">
      <optimizer-sidebar
        :player-id="playerId"
        :pending-compute="pendingCompute"
        :wait-time-days="waitTimeDays"
        :time-budget-invalid="!timeBudgetValid"
        @submit-player-id="submitPlayerId"
        @run-compute="runCompute"
        @update:wait-time-days="waitTimeDays = $event"
      />
    </div>

    <!-- Right: results canvas -->
    <div class="min-w-0 space-y-4">
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
        <p v-if="solutionViews.length === 0" class="text-sm text-gray-400">
          {{
            timeBudgetValid
              ? 'No ship set found for the current settings.'
              : 'Enter a time budget (a positive number of days) to compute a plan.'
          }}
        </p>
      </div>

      <optimizer-inventory-panel :rows="inventoryRows" />

      <slot />
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
  playerInventory,
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
import OptimizerSidebar from './optimizer/OptimizerSidebar.vue';
import OptimizerInventoryPanel from './optimizer/OptimizerInventoryPanel.vue';
import OptimizerSolutionCard from './optimizer/OptimizerSolutionCard.vue';

export default defineComponent({
  components: { OptimizerSidebar, OptimizerInventoryPanel, OptimizerSolutionCard },
  props: {
    artifactId: { type: String, required: true },
  },
  setup(props) {
    const { artifactId } = toRefs(props);

    const waitTimeDays = ref('30');
    const maxWaitTimeSeconds = computed(() => parseFloat(waitTimeDays.value) * 86400);

    const timeBudgetValid = computed(() => Number.isFinite(maxWaitTimeSeconds.value) && maxWaitTimeSeconds.value > 0);

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
      if (!timeBudgetValid.value) {
        computedResults.value = [];
        pendingCompute.value = false;
        return;
      }
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
      waitTimeDays,
      timeBudgetValid,
      pendingCompute,
      playerId,
      runCompute,
      submitPlayerId,
      playerInventory,
      inventoryRows,
      solutionViews,
    };
  },
});
</script>
