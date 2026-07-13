<template>
  <div class="space-y-5">
    <!-- Player data -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Player data</h3>
      <player-id-form :player-id="playerId" @submit="$emit('submitPlayerId', $event)" />
      <div class="flex items-center gap-1.5 text-xs">
        <span class="h-2 w-2 rounded-full flex-shrink-0" :class="hasPlayerData ? 'bg-green-500' : 'bg-gray-300'"></span>
        <span :class="hasPlayerData ? 'text-gray-600' : 'text-gray-400'">
          {{ hasPlayerData ? 'Save data loaded' : 'No save loaded — using manual settings' }}
        </span>
      </div>
    </section>

    <!-- Constraints -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Constraints</h3>
      <div class="space-y-3">
        <div>
          <label for="waitTimeInput" class="block text-sm text-gray-700">Time budget (days)</label>
          <base-input
            id="waitTimeInput"
            :model-value="waitTimeDays"
            type="number"
            name="waitTimeInput"
            class="mt-1 appearance-none block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Days"
            @update:model-value="$emit('update:waitTimeDays', String($event))"
          />
          <p v-if="timeBudgetInvalid" class="mt-1 text-xs text-red-500">Enter a positive number of days</p>
          <p v-else class="mt-1 text-xs text-gray-400">Maximum time you're willing to spend launching missions</p>
        </div>

        <div>
          <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              :checked="missionFilters.minDurationHoursEnabled"
              @change="setMinDurationHoursEnabled(($event.target as HTMLInputElement).checked)"
            />
            Minimum mission duration
          </label>
          <div class="mt-1 flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              :disabled="!missionFilters.minDurationHoursEnabled"
              :value="missionFilters.minDurationHours"
              class="block w-20 sm:text-sm rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 px-2 py-1 border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
              @input="onDurationInput($event)"
            />
            <span class="text-xs text-gray-500">hours</span>
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            id="sidebar_show_nodata"
            v-model="config.showNodata"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          Show targets with no data
        </label>
      </div>
    </section>

    <!-- Settings -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Settings</h3>
      <div class="divide-y divide-gray-100">
        <optimizer-setting-row
          label="Crafting level"
          :has-save="playerCraftingLevel !== null"
          :overridden="overrides.craftingLevel"
          :save-value="playerCraftingLevel"
          :manual-value="extras.craftingLevel"
          :min="0"
          :max="30"
          max-label="/ 30"
          @update:overridden="setOverrideCraftingLevel"
          @update:manual="setCraftingLevel"
        />
        <optimizer-setting-row
          label="Previous crafts"
          :has-save="playerPreviousCrafts !== null"
          :overridden="overrides.previousCrafts"
          :save-value="playerPreviousCrafts"
          :manual-value="extras.previousCrafts"
          :min="0"
          @update:overridden="setOverridePreviousCrafts"
          @update:manual="setPreviousCraftCount"
        />
        <optimizer-setting-row
          label="Fuel tank level"
          :has-save="playerTankLevel !== null"
          :overridden="overrides.tankLevel"
          :save-value="playerTankLevel"
          :manual-value="extras.tankLevel"
          :min="0"
          :max="maxTankLevel"
          :max-label="`/ ${maxTankLevel}`"
          :capacity="tankCapacityLabel"
          @update:overridden="setOverrideTankLevel"
          @update:manual="setTankLevel"
        />
        <optimizer-setting-row
          label="FTL Drive Upgrades"
          :has-save="hasPlayerData"
          :overridden="overrides.epicResearchFTLLevel"
          :save-value="playerShipsConfig ? playerShipsConfig.epicResearchFTLLevel : null"
          :manual-value="config.epicResearchFTLLevel"
          :min="0"
          :max="60"
          max-label="/ 60"
          @update:overridden="setOverrideFTL"
          @update:manual="setEpicResearchFTLLevel"
        />
        <optimizer-setting-row
          label="Zero-g Quantum Containment"
          :has-save="hasPlayerData"
          :overridden="overrides.epicResearchZerogLevel"
          :save-value="playerShipsConfig ? playerShipsConfig.epicResearchZerogLevel : null"
          :manual-value="config.epicResearchZerogLevel"
          :min="0"
          :max="10"
          max-label="/ 10"
          @update:overridden="setOverrideZerog"
          @update:manual="setEpicResearchZerogLevel"
        />
      </div>
    </section>

    <!-- Ships -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Ships</h3>
      <div class="text-sm text-gray-600 mb-2">{{ shipsVisibleCount }} of {{ totalShips }} ships visible</div>
      <button
        type="button"
        class="w-full flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 focus:outline-none"
        @click="openPlayerOverridesModal"
      >
        Edit ships…
      </button>
    </section>

    <!-- Compute -->
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Compute</h3>
      <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none mb-2">
        <input
          type="checkbox"
          class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          :checked="autoCompute"
          @change="setAutoCompute(($event.target as HTMLInputElement).checked)"
        />
        Recompute automatically
      </label>
      <button
        v-if="!autoCompute"
        type="button"
        class="w-full flex items-center justify-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none"
        :class="
          pendingCompute
            ? 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700'
            : 'border-gray-300 text-gray-600 bg-gray-100 hover:bg-gray-200'
        "
        @click="$emit('runCompute')"
      >
        {{ pendingCompute ? 'Recompute — results out of date' : 'Compute' }}
      </button>
      <div class="mt-3">
        <loot-data-credit />
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

import { formatEIValue, fuelTankSizes, spaceshipList } from 'lib';
import BaseInput from 'ui/components/BaseInput.vue';
import PlayerIdForm from 'ui/components/PlayerIdForm.vue';
import LootDataCredit from '@/components/LootDataCredit.vue';
import OptimizerSettingRow from './OptimizerSettingRow.vue';

import {
  autoCompute,
  config,
  effectiveConfig,
  extras,
  missionFilters,
  openPlayerOverridesModal,
  overrides,
  playerCraftingLevel,
  playerPreviousCrafts,
  playerShipsConfig,
  playerTankLevel,
  setAutoCompute,
  setCraftingLevel,
  setEpicResearchFTLLevel,
  setEpicResearchZerogLevel,
  setMinDurationHours,
  setMinDurationHoursEnabled,
  setOverrideCraftingLevel,
  setOverrideFTL,
  setOverridePreviousCrafts,
  setOverrideTankLevel,
  setOverrideZerog,
  setPreviousCraftCount,
  setTankLevel,
} from '@/store';

export default defineComponent({
  components: { BaseInput, PlayerIdForm, LootDataCredit, OptimizerSettingRow },
  props: {
    playerId: { type: String, default: '' },
    pendingCompute: { type: Boolean, required: true },
    waitTimeDays: { type: String, required: true },
    timeBudgetInvalid: { type: Boolean, default: false },
  },
  emits: {
    submitPlayerId: (_id: string) => true,
    runCompute: () => true,
    'update:waitTimeDays': (_days: string) => true,
  },
  setup() {
    const maxTankLevel = fuelTankSizes.length - 1;
    const hasPlayerData = computed(() => !!playerShipsConfig.value);

    // The tank level currently in effect for display; when editable this tracks
    // the manual value, otherwise the save value.
    const shownTankLevel = computed(() => {
      const editable = playerTankLevel.value === null || overrides.value.tankLevel;
      return editable ? extras.value.tankLevel : (playerTankLevel.value ?? 0);
    });
    const tankCapacityLabel = computed(() => formatEIValue(fuelTankSizes[shownTankLevel.value] ?? 0, { trim: true }));

    const totalShips = spaceshipList.length;
    const shipsVisibleCount = computed(() => spaceshipList.filter(s => effectiveConfig.value.shipVisibility[s]).length);

    function onDurationInput(event: Event) {
      const raw = (event.target as HTMLInputElement).value.trim();
      if (!raw) return;
      const n = parseFloat(raw);
      if (isNaN(n) || n < 0) return;
      setMinDurationHours(n);
    }

    return {
      hasPlayerData,
      maxTankLevel,
      tankCapacityLabel,
      totalShips,
      shipsVisibleCount,
      onDurationInput,
      // store state
      config,
      extras,
      overrides,
      missionFilters,
      autoCompute,
      playerCraftingLevel,
      playerPreviousCrafts,
      playerTankLevel,
      playerShipsConfig,
      // setters
      setAutoCompute,
      setCraftingLevel,
      setPreviousCraftCount,
      setTankLevel,
      setEpicResearchFTLLevel,
      setEpicResearchZerogLevel,
      setOverrideCraftingLevel,
      setOverridePreviousCrafts,
      setOverrideTankLevel,
      setOverrideFTL,
      setOverrideZerog,
      setMinDurationHoursEnabled,
      openPlayerOverridesModal,
    };
  },
});
</script>
