<template>
  <player-id-form @submit="onPlayerLoad" />
  <div class="mb-2 flex items-center gap-2 text-xs text-gray-500">
    <template v-if="playerShipsConfig">
      <span>Player data loaded.</span>
      <button
        type="button"
        class="flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs rounded-md text-gray-500 bg-gray-100 hover:bg-gray-200 focus:outline-none"
        @click="openPlayerOverridesModal"
      >
        Override fields
      </button>
    </template>
    <template v-else>
      <button
        type="button"
        class="flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs rounded-md text-gray-500 bg-gray-100 hover:bg-gray-200 focus:outline-none"
        @click="openPlayerOverridesModal"
      >
        Configure
      </button>
    </template>
  </div>
  <loot-data-credit />

  <div v-if="playerInventory && inventoryRows.length" class="mt-4 border border-gray-200 rounded-lg p-4">
    <h3 class="text-base font-semibold text-gray-700 mb-3">Inventory</h3>
    <ul class="space-y-1 text-sm">
      <li
        v-for="row in inventoryRows"
        :key="row.nodeId"
        class="flex items-center gap-1.5"
        :style="{ paddingLeft: row.depth * 16 + 'px' }"
      >
        <img :src="row.iconUrl" class="h-5 w-5 flex-shrink-0" />
        <span class="text-gray-700">{{ row.name }}</span>
        <span v-if="row.needed > 1" class="text-xs text-gray-400 ml-0.5">(×{{ row.needed }})</span>
        <span
          class="ml-auto font-mono text-xs"
          :class="row.have > 0 ? 'text-green-700 font-semibold' : 'text-gray-400'"
          >{{ row.have }}</span
        >
      </li>
    </ul>
  </div>

  <div v-if="isDev" class="flex items-center gap-4 mt-4">
    <button
      type="button"
      class="text-xs px-2.5 py-1 rounded border select-none"
      :class="
        fwCompareOpen
          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
          : 'border-gray-300 text-gray-500 hover:text-gray-700'
      "
      @click="fwCompareOpen = !fwCompareOpen"
    >
      FW vs Final
    </button>
    <div>
      <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
        <input v-model="bruteForceEnabled" type="checkbox" class="rounded" />
        Brute-force ground truth
      </label>
    </div>
  </div>

  <div class="grid gap-6 mt-4" :class="isDev && bruteForceEnabled ? 'grid-cols-2' : 'grid-cols-1'">
    <!-- Frank-Wolfe column -->
    <div class="border border-gray-200 rounded-lg p-4">
      <h3 class="text-base font-semibold text-gray-700 mb-3">Best Ship Set</h3>
      <div v-for="[i, m] in frankWolfeResults.entries()" :key="'fw-' + i" class="space-y-1 text-sm">
        <div class="font-medium text-green-700">
          Legendary Craft Probability: {{ (m.best_probability * 100).toFixed(2) }}%
        </div>
        <div class="text-gray-600">Fuel: {{ (m.fuel_used / 1_000_000_000_000).toFixed(2) }}T Eggs</div>

        <ul>
          <li  class="text-gray-600" v-for="[egg, qty] of m.fuel_by_egg.entries()" :key="'fw-' + i + '-egg-' + egg">
            {{ (qty / 1_000_000_000_000).toFixed(2) }}T
            <base-icon :icon-rel-path="eggIconPath(egg)" :size="64" class="inline-block -ml-0.5 h-4 w-4"></base-icon>
          </li>
        </ul>
        <div class="text-gray-600">Time: {{ (m.time_units_used / 86400).toFixed(1) }} days</div>
        <div class="text-gray-600">Expected crafts: {{ expectedCraftCount(m).toFixed(1) }}</div>
        <ul class="mt-2 space-y-0.5">
          <li
            v-for="[j, choice] of m.choice_history.entries()"
            :key="'fw-' + i + '-' + j"
            class="flex items-center gap-1.5"
            :class="choice.from_fw ? 'text-gray-800' : 'text-gray-400'"
          >
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :class="choice.from_fw ? 'bg-green-500' : 'bg-gray-300'"
              :title="choice.from_fw ? 'Frank-Wolfe' : 'Local search fill'"
            ></span>
            <span
              >{{ choice.num_ships_launched }}×
              <mission-name :mission="choice.ship" :target="choice.targetAfxId" :no-link="true" class="inline-block"
            /></span>
          </li>
        </ul>
        <details class="mt-3">
          <summary class="cursor-pointer text-gray-500 hover:text-gray-700 select-none">Expected drops</summary>
          <ul class="mt-2 space-y-1">
            <li
              v-for="drop in m.expected_drops"
              :key="drop.itemId"
              class="flex items-center gap-1.5"
              :class="drop.relevant ? 'text-gray-800' : 'text-gray-400'"
            >
              <img :src="drop.iconUrl" class="h-5 w-5 flex-shrink-0" :class="drop.relevant ? '' : 'opacity-40'" />
              <span>{{ drop.name }}</span>
              <span
                class="ml-auto font-mono"
                :class="drop.relevant ? 'text-gray-700 font-semibold' : 'text-gray-400'"
                >{{ drop.expected.toFixed(1) }}</span
              >
            </li>
          </ul>
        </details>
      </div>
    </div>

    <!-- Brute Force column (dev only) -->
    <div v-if="isDev && bruteForceEnabled" class="border border-gray-200 rounded-lg p-4">
      <h3 class="text-base font-semibold text-gray-700 mb-3">
        Brute Force (Exhaustive)
        <span v-if="bruteForceRunning" class="ml-2 text-xs font-normal text-gray-400">searching…</span>
      </h3>
      <div v-if="bruteForceResult" class="space-y-1 text-sm">
        <div class="font-medium text-blue-700">
          Success: {{ (bruteForceResult.best_probability * 100).toFixed(2) }}%
        </div>
        <div class="text-gray-600">Fuel: {{ (bruteForceResult.fuel_used / 1_000_000_000_000).toFixed(2) }}T Eggs</div>
        <div class="text-gray-600">Time: {{ (bruteForceResult.time_units_used / 86400).toFixed(1) }} days</div>
        <div class="text-gray-600">Expected crafts: {{ expectedCraftCount(bruteForceResult).toFixed(1) }}</div>
        <ul class="mt-2 space-y-0.5">
          <li v-for="[j, choice] of bruteForceResult.choice_history.entries()" :key="'bf-' + j" class="text-gray-700">
            {{ choice.num_ships_launched }}× {{ choice.ship.shipName }} ({{ choice.ship.durationTypeName }}) →
            {{ choice.target }}
          </li>
        </ul>
        <details class="mt-3">
          <summary class="cursor-pointer text-gray-500 hover:text-gray-700 select-none">Expected drops</summary>
          <ul class="mt-2 space-y-1">
            <li
              v-for="drop in bruteForceResult.expected_drops"
              :key="drop.itemId"
              class="flex items-center gap-1.5"
              :class="drop.relevant ? 'text-gray-800' : 'text-gray-400'"
            >
              <img :src="drop.iconUrl" class="h-5 w-5 flex-shrink-0" :class="drop.relevant ? '' : 'opacity-40'" />
              <span>{{ drop.name }}</span>
              <span
                class="ml-auto font-mono"
                :class="drop.relevant ? 'text-gray-700 font-semibold' : 'text-gray-400'"
                >{{ drop.expected.toFixed(1) }}</span
              >
            </li>
          </ul>
        </details>
      </div>
      <div v-else class="text-sm text-gray-400">—</div>
    </div>
  </div>

  <!-- FW vs Final comparison panel -->
  <div v-if="fwCompareOpen" class="mt-4 border border-indigo-200 rounded-lg p-4">
    <h3 class="text-base font-semibold text-gray-700 mb-3">FW Fractional vs Final (Integer)</h3>
    <div v-for="[i, m] in frankWolfeResults.entries()" :key="'cmp-' + i" class="text-sm">
      <template v-if="m.fw_fractional">
        <!-- Header row -->
        <div class="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs font-medium text-gray-400 mb-1 pr-1">
          <span></span>
          <span class="text-right w-16">FW</span>
          <span class="text-right w-16">Final</span>
        </div>
        <!-- Craft count -->
        <div class="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center py-0.5 border-b border-gray-100 mb-1">
          <span class="text-gray-600 font-medium">Expected crafts</span>
          <span class="font-mono text-right w-16 text-indigo-600">{{
            expectedCraftCountFromYield(m.fw_fractional.yield_vector).toFixed(2)
          }}</span>
          <span class="font-mono text-right w-16 text-gray-800 font-semibold">{{
            expectedCraftCount(m).toFixed(2)
          }}</span>
        </div>
        <!-- Probability -->
        <div class="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center py-0.5 border-b border-gray-100 mb-2">
          <span class="text-gray-600 font-medium">Probability</span>
          <span class="font-mono text-right w-16 text-indigo-600"
            >{{ (m.fw_fractional.probability * 100).toFixed(2) }}%</span
          >
          <span class="font-mono text-right w-16 text-gray-800 font-semibold"
            >{{ (m.best_probability * 100).toFixed(2) }}%</span
          >
        </div>
        <!-- Per-item drops from yield vector (DAG nodes only) -->
        <div
          v-for="row in dagYieldRows(m)"
          :key="'cmp-' + i + '-' + row.nodeId"
          class="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 items-center py-0.5"
        >
          <img :src="row.iconUrl" class="h-4 w-4 flex-shrink-0" />
          <span class="text-gray-700 truncate">{{ row.name }}</span>
          <span class="font-mono text-right w-16 text-indigo-500">{{ row.fw.toFixed(1) }}</span>
          <span
            class="font-mono text-right w-16"
            :class="row.final > row.fw ? 'text-green-700' : row.final < row.fw ? 'text-red-600' : 'text-gray-700'"
            >{{ row.final.toFixed(1) }}</span
          >
        </div>
      </template>
      <div v-else class="text-sm text-gray-400">No FW fractional data available.</div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onUnmounted, ref, watch, watchEffect, toRefs } from 'vue';

import { getArtifactTierPropsFromId, requestFirstContact } from 'lib';

import {
  currentOptimizerArtifactId,
  effectiveConfig,
  effectiveFuelTankCapacity,
  effectivePreviousCrafts,
  effectiveTotalCraftingXp,
  openPlayerOverridesModal,
  playerInventory,
  playerShipsConfig,
  setPlayerData,
} from '@/store';
import { OptimizeFrank, OptimizeBF, type OptimizerSolution, generateRecipeDag } from '@/lib';
import type { CancellationToken } from '@/lib/brute-force';
import LootDataCredit from '@/components/LootDataCredit.vue';
import PlayerIdForm from 'ui/components/PlayerIdForm.vue';
import MissionName from './MissionName.vue';
import { iconURL, eggIconPath } from 'lib';
import { MaxCraftCountDirect } from '@/lib/frank-wolfe';
import BaseIcon from 'ui/components/BaseIcon.vue';

export default defineComponent({
  components: {
    LootDataCredit,
    PlayerIdForm,
    MissionName,
    BaseIcon,
  },
  props: {
    artifactId: {
      type: String,
      required: true,
    },
    maxWaitTimeSeconds: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const { artifactId, maxWaitTimeSeconds } = toRefs(props);

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

    async function onPlayerLoad(playerId: string) {
      const data = await requestFirstContact(playerId);
      if (data.backup) {
        setPlayerData(data.backup);
      }
    }

    const frankWolfeResults = computed(() => {
      return OptimizeFrank(
        {
          desired_artifact_node_ids: [artifactId.value],
          include_not_enough_data: effectiveConfig.value.showNodata,
          fuel_tank_capacity: effectiveFuelTankCapacity.value,
          time_budget_seconds: maxWaitTimeSeconds.value,
        },
        effectiveConfig.value,
        playerInventory.value,
        effectiveTotalCraftingXp.value,
        effectivePreviousCrafts.value
      );
    });

    const isDev = import.meta.env.DEV;
    const fwCompareOpen = ref(false);

    const bruteForceEnabled = ref(false);
    const bruteForceResult = ref<OptimizerSolution | null>(null);
    const bruteForceRunning = ref(false);

    if (isDev) {
      watchEffect(onCleanup => {
        if (!bruteForceEnabled.value) {
          bruteForceResult.value = null;
          bruteForceRunning.value = false;
          return;
        }

        const token: CancellationToken = { cancelled: false };
        onCleanup(() => {
          token.cancelled = true;
        });

        bruteForceResult.value = null;
        bruteForceRunning.value = true;

        OptimizeBF(
          {
            desired_artifact_node_ids: [artifactId.value],
            include_not_enough_data: effectiveConfig.value.showNodata,
            fuel_tank_capacity: effectiveFuelTankCapacity.value,
            time_budget_seconds: maxWaitTimeSeconds.value,
          },
          effectiveConfig.value,
          solution => {
            bruteForceResult.value = solution;
          },
          token,
          playerInventory.value,
          effectiveTotalCraftingXp.value,
          effectivePreviousCrafts.value
        ).then(() => {
          if (!token.cancelled) bruteForceRunning.value = false;
        });
      });
    }

    const recipeDag = computed(() => {
      const dag = new Map();
      generateRecipeDag(artifactId.value, dag);
      return dag;
    });

    function expectedCraftCount(solution: OptimizerSolution): number {
      return expectedCraftCountFromYield(solution.final_yield_vector);
    }

    function expectedCraftCountFromYield(yieldVector: Map<string, number>): number {
      const dag = recipeDag.value;
      const node = dag.get(artifactId.value);
      if (!node) return 0;
      return MaxCraftCountDirect(node, dag, yieldVector);
    }

    interface DagYieldRow {
      nodeId: string;
      name: string;
      iconUrl: string;
      fw: number;
      final: number;
    }

    function dagYieldRows(solution: OptimizerSolution): DagYieldRow[] {
      const fwYield = solution.fw_fractional?.yield_vector;
      if (!fwYield) return [];
      const finalYield = solution.final_yield_vector;
      const dag = recipeDag.value;
      const rows: DagYieldRow[] = [];
      for (const nodeId of dag.keys()) {
        const fw = fwYield.get(nodeId) ?? 0;
        const final = finalYield.get(nodeId) ?? 0;
        if (fw < 0.05 && final < 0.05) continue;
        const props = getArtifactTierPropsFromId(nodeId);
        rows.push({
          nodeId,
          name: props.name,
          iconUrl: iconURL('egginc/' + props.icon_filename, 64),
          fw,
          final,
        });
      }
      rows.sort((a, b) => b.fw - a.fw);
      return rows;
    }

    interface InventoryRow {
      nodeId: string;
      name: string;
      iconUrl: string;
      depth: number;
      have: number;
      needed: number;
    }

    const inventoryRows = computed((): InventoryRow[] => {
      const inv = playerInventory.value;
      if (!inv) return [];

      const dag = recipeDag.value;
      const rows: InventoryRow[] = [];
      const visited = new Set<string>();
      const queue: { nodeId: string; depth: number; needed: number }[] = [
        { nodeId: artifactId.value, depth: 0, needed: 1 },
      ];

      while (queue.length > 0) {
        const { nodeId, depth, needed } = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = dag.get(nodeId);
        if (!node) continue;

        const props = getArtifactTierPropsFromId(nodeId);
        const item = inv.getItem({ name: props.afx_id, level: props.afx_level });
        const have = item.haveRarity[0] + item.haveRarity[1] + item.haveRarity[2] + item.haveRarity[3];

        rows.push({
          nodeId,
          name: props.name,
          iconUrl: iconURL('egginc/' + props.icon_filename, 64),
          depth,
          have,
          needed,
        });

        for (const child of node.children) {
          queue.push({ nodeId: child.node_id, depth: depth + 1, needed: child.quantity });
        }
      }

      return rows;
    });

    return {
      isDev,
      fwCompareOpen,
      bruteForceEnabled,
      frankWolfeResults,
      bruteForceResult,
      bruteForceRunning,
      expectedCraftCount,
      expectedCraftCountFromYield,
      dagYieldRows,
      inventoryRows,
      playerInventory,
      playerShipsConfig,
      onPlayerLoad,
      openPlayerOverridesModal,
      eggIconPath,
    };
  },
});
</script>
