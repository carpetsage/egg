<template>
  <div class="space-y-2">
    <div class="container">
      <h1 class="fs-4 my-3">Mission planner</h1>
      <hr />
      <div class="my-2">
        <div>
          <label class="form-label">Fuel Tank</label>
          <select v-model.number="fuelTankLevel" class="form-select" style="max-width: 10rem">
            <option v-for="(capacity, i) in fuelTankSizes" :key="i" :value="i">
              {{ formatEIValue(capacity, { trim: true }) }}
            </option>
          </select>
        </div>

        <div class="my-2">
          <div class="form-check">
            <input id="virtueFuelsCheckbox" v-model="useVirtueFuels" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="virtueFuelsCheckbox"> Virtue Farm </label>
          </div>
          <div class="form-check">
            <input id="ignoreHumilityCheckbox" v-model="ignoreHumility" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="ignoreHumilityCheckbox"> Ignore humility fuel </label>
          </div>
        </div>

        <div class="row gx-4 gy-2 my-2">
          <template v-for="(mission, i) in missions" :key="mission.missionTypeId">
            <div v-if="mission.durationType != 3" class="col-4 input-group" style="max-width: 24rem">
              <span
                class="input-group-text"
                :class="durationTypeFgClass(mission.durationType)"
                style="font-size: 0.875rem"
              >
                {{ mission.name }}
              </span>
              <input
                v-if="isMissionInfinite(mission)"
                type="text"
                class="form-control text-end"
                value="Infinite"
                disabled
              />
              <input
                v-else
                v-model.number="counts[i]"
                type="number"
                class="form-control text-end tabular-nums"
                min="0"
                step="1"
                placeholder="0"
              />
              <button
                v-if="!isMissionInfinite(mission)"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                @click="setMaxCount(i)"
              >
                Max
              </button>
            </div>
          </template>
        </div>
        <button type="button" class="btn btn-secondary btn-sm mt-2" @click="clear">Clear missions</button>
      </div>

      <hr />

      <div class="my-2 tabular-nums">
        <h2 class="fs-5">Fuel</h2>
        <div v-if="ignoreHumility && useVirtueFuels" class="text-muted">
          <small><em>Note: Humility fuel is being ignored in the total</em></small>
        </div>
        <div>
          <template v-for="[egg, fuel] in fuels" :key="egg">
            <span v-if="fuel > 0" class="me-2 text-nowrap">
              <img :src="iconURL(eggIconPath(egg), 64)" height="16" width="16" style="position: relative; top: -2px" />
              <span>{{ formatEIValue(fuel, { trim: true }) }}</span>
            </span>
          </template>
        </div>
        <div>
          Total:
          <span
            :class="fuelTankOverCapacity ? 'text-danger' : fuelTankPercentage >= 95 ? 'text-warning' : 'text-success'"
          >
            {{ formatEIValue(totalFuel, { trim: true }) }}
          </span>
          / {{ formatEIValue(fuelTankCapacity, { trim: true }) }}
        </div>
        <div v-if="fuelTankOverCapacity" class="text-danger text-decoration-underline">
          <small>Total fuel required exceeds tank capacity!</small>
        </div>
        <div class="my-2 progress">
          <div
            class="progress-bar"
            :class="fuelTankOverCapacity ? 'bg-danger' : fuelTankPercentage >= 95 ? 'bg-warning' : 'bg-success'"
            :style="{ width: `${fuelTankPercentage}%` }"
          ></div>
        </div>
        <p class="text-danger lh-sm">
          <small>
            Note that fueling in-game is imprecise; a mission could actually take slightly more or less fuel (usually by
            a fraction of an egg) than advertised. Therefore you should always have a little surplus of each fuel when
            planning your tank. A precisely planned tank &mdash; e.g. a full 100T tank for 10 extended Henerprises
            &mdash; is pointless and will leave you disappointed.
          </small>
        </p>
      </div>

      <hr />

      <div v-if="missionBreakdown.length > 0" class="my-2 tabular-nums">
        <h2 class="fs-5">Fuel breakdown by mission</h2>
        <table class="table table-sm table-striped" style="max-width: 50rem">
          <thead>
            <tr>
              <th scope="col">Mission</th>
              <th scope="col">Count</th>
              <th scope="col">Fuel per mission</th>
              <th scope="col">Total fuel</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in missionBreakdown" :key="item.missionIndex">
              <td>{{ item.missionName }}</td>
              <td>{{ item.count }}</td>
              <td>
                <template v-for="[egg, amount] in item.fuelPerMission" :key="egg">
                  <span v-if="amount > 0" class="me-2 text-nowrap">
                    <img
                      :src="iconURL(eggIconPath(egg), 64)"
                      height="16"
                      width="16"
                      style="position: relative; top: -2px"
                    />
                    <span>{{ formatEIValue(amount, { trim: true }) }}</span>
                  </span>
                </template>
              </td>
              <td>
                <template v-for="[egg, amount] in item.totalFuel" :key="egg">
                  <span v-if="amount > 0" class="me-2 text-nowrap">
                    <img
                      :src="iconURL(eggIconPath(egg), 64)"
                      height="16"
                      width="16"
                      style="position: relative; top: -2px"
                    />
                    <span>{{ formatEIValue(amount, { trim: true }) }}</span>
                  </span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr />

      <div>
        <h2 class="fs-5">Launch points</h2>
        <table class="table table-striped table-hover tabular-nums" style="max-width: 30rem">
          <thead>
            <tr>
              <th scope="col">Spaceship</th>
              <th scope="col">LP earned</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ship, i) in ships" :key="i">
              <th class="fw-normal">{{ spaceshipName(ship) }}</th>
              <td>{{ launchPoints[i].toFixed(1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';

import {
  eggName,
  eggIconPath,
  spaceshipName,
  allMissionTypes as missions,
  ei,
  fuelTankSizes,
  getLocalStorage,
  setLocalStorage,
  formatEIValue,
  iconURL,
  spaceshipList as ships,
  eggList,
} from 'lib';

const FUEL_TANK_LEVEL_LOCALSTORAGE_KEY = 'fuelTankLevel';
const COUNTS_LOCALSTORAGE_KEY = 'counts';
const USE_VIRTUE_FUELS_LOCALSTORAGE_KEY = 'useVirtueFuels';
const IGNORE_HUMILITY_LOCALSTORAGE_KEY = 'ignoreHumility';

export default defineComponent({
  setup() {
    const fuelTankLevel = ref(loadFuelTankLevel());
    watch(fuelTankLevel, () => {
      setLocalStorage(FUEL_TANK_LEVEL_LOCALSTORAGE_KEY, fuelTankLevel.value);
    });
    const fuelTankCapacity = computed(() => fuelTankSizes[fuelTankLevel.value]);

    const useVirtueFuels = ref(getLocalStorage(USE_VIRTUE_FUELS_LOCALSTORAGE_KEY) !== 'false');
    watch(useVirtueFuels, () => {
      setLocalStorage(USE_VIRTUE_FUELS_LOCALSTORAGE_KEY, useVirtueFuels.value.toString());
    });

    const ignoreHumility = ref(getLocalStorage(IGNORE_HUMILITY_LOCALSTORAGE_KEY) !== 'false');
    watch(ignoreHumility, () => {
      setLocalStorage(IGNORE_HUMILITY_LOCALSTORAGE_KEY, ignoreHumility.value.toString());
    });

    const counts = ref<(number | null)[]>(loadCounts());
    const clear = () => {
      counts.value = missions.map(() => null);
    };
    const setMaxCount = (missionIndex: number) => {
      const mission = missions[missionIndex];
      const missionFuels = useVirtueFuels.value ? mission.virtueFuels : mission.defaultFuels;

      // If ignoreHumility is on and this mission only uses humility fuel, do nothing
      if (ignoreHumility.value) {
        const nonHumilityFuels = missionFuels.filter(f => f.egg !== ei.Egg.HUMILITY);
        if (nonHumilityFuels.length === 0) {
          return;
        }
      }

      // Calculate currently used fuel (excluding the mission we're setting max for)
      let currentlyUsedFuel = 0;
      missions.forEach((m, i) => {
        if (i === missionIndex) return; // Skip the current mission
        const count = Math.floor(counts.value[i] || 0);
        const mFuels = useVirtueFuels.value ? m.virtueFuels : m.defaultFuels;
        for (const { egg, amount } of mFuels) {
          if (ignoreHumility.value && egg === ei.Egg.HUMILITY) {
            continue;
          }
          currentlyUsedFuel += amount * count;
        }
      });

      // Calculate remaining capacity
      const remainingCapacity = fuelTankCapacity.value - currentlyUsedFuel;

      // Calculate total fuel per mission (excluding humility if ignored)
      let totalFuelPerMission = 0;
      for (const { egg, amount } of missionFuels) {
        if (ignoreHumility.value && egg === ei.Egg.HUMILITY) {
          continue;
        }
        totalFuelPerMission += amount;
      }

      // Calculate max count based on remaining capacity
      const maxCount = totalFuelPerMission > 0 ? Math.floor((remainingCapacity - 1) / totalFuelPerMission) : 0;

      counts.value[missionIndex] = Math.max(0, maxCount);
    };

    const isMissionInfinite = (mission: (typeof missions)[number]) => {
      if (!ignoreHumility.value || !useVirtueFuels.value) {
        return false;
      }
      // Check if this is a chicken one, nine, or heavy mission
      const isChickenMission =
        mission.shipType === ei.MissionInfo.Spaceship.CHICKEN_ONE ||
        mission.shipType === ei.MissionInfo.Spaceship.CHICKEN_NINE ||
        mission.shipType === ei.MissionInfo.Spaceship.CHICKEN_HEAVY;
      return isChickenMission;
    };

    watch(
      counts,
      () => {
        setLocalStorage(COUNTS_LOCALSTORAGE_KEY, JSON.stringify(counts.value));
      },
      { deep: true }
    );

    const fuels = computed(() => {
      const fuelAmount: Map<ei.Egg, number> = new Map(eggList.map(egg => [egg, 0]));
      missions.forEach((mission, i) => {
        const count = Math.floor(counts.value[i] || 0);
        const missionFuels = useVirtueFuels.value ? mission.virtueFuels : mission.defaultFuels;
        for (const { egg, amount } of missionFuels) {
          fuelAmount.set(egg, (fuelAmount.get(egg) ?? 0) + amount * count);
        }
      });
      return fuelAmount;
    });
    const totalFuel = computed(() => {
      // Object.values(fuels.value).reduce((sum, { amount }) => sum + amount, 0)
      let total = 0;
      fuels.value.forEach((fuelUsed, egg) => {
        // Skip humility fuel if ignoreHumility is checked
        if (ignoreHumility.value && egg === ei.Egg.HUMILITY) {
          return;
        }
        total += fuelUsed;
      });
      return total;
    });
    const fuelTankPercentage = computed(() => (totalFuel.value / fuelTankCapacity.value) * 100);
    const fuelTankOverCapacity = computed(() => totalFuel.value >= fuelTankCapacity.value);

    const missionBreakdown = computed(() => {
      const breakdown: Array<{
        missionIndex: number;
        missionName: string;
        count: number;
        fuelPerMission: Map<ei.Egg, number>;
        totalFuel: Map<ei.Egg, number>;
      }> = [];

      missions.forEach((mission, i) => {
        const count = Math.floor(counts.value[i] || 0);
        if (count <= 0) return;

        const missionFuels = useVirtueFuels.value ? mission.virtueFuels : mission.defaultFuels;
        const fuelPerMission = new Map<ei.Egg, number>();
        const totalFuel = new Map<ei.Egg, number>();

        for (const { egg, amount } of missionFuels) {
          fuelPerMission.set(egg, amount);
          totalFuel.set(egg, amount * count);
        }

        breakdown.push({
          missionIndex: i,
          missionName: mission.name,
          count,
          fuelPerMission,
          totalFuel,
        });
      });

      return breakdown;
    });

    const launchPoints = computed(() => {
      const lps = ships.map(() => 0);
      missions.forEach((mission, i) => {
        const count = Math.floor(counts.value[i] || 0);
        lps[mission.shipType] += durationTypeLaunchPoints(mission.durationType) * count;
      });
      return lps;
    });

    return {
      ships,
      spaceshipName,
      eggName,
      eggIconPath,
      missions,
      fuelTankSizes,
      fuelTankLevel,
      fuelTankCapacity,
      useVirtueFuels,
      ignoreHumility,
      counts,
      clear,
      setMaxCount,
      isMissionInfinite,
      fuels,
      totalFuel,
      fuelTankPercentage,
      fuelTankOverCapacity,
      missionBreakdown,
      launchPoints,
      durationTypeFgClass,
      formatEIValue,
      iconURL,
    };
  },
});

function loadFuelTankLevel() {
  const maxLevel = fuelTankSizes.length - 1;
  const s = getLocalStorage(FUEL_TANK_LEVEL_LOCALSTORAGE_KEY);
  if (s === undefined) {
    return maxLevel;
  }
  let parsed;
  try {
    parsed = parseInt(s);
  } catch (err) {
    console.warn(`${FUEL_TANK_LEVEL_LOCALSTORAGE_KEY}: ${s}: ${err}`);
    return maxLevel;
  }
  if (typeof parsed !== 'number' || !(parsed >= 0 && parsed <= maxLevel)) {
    console.warn(`${FUEL_TANK_LEVEL_LOCALSTORAGE_KEY}: ${s}: invalid level`);
    return maxLevel;
  }
  return parsed;
}

function loadCounts(): (number | null)[] {
  const defaultCounts = missions.map(() => null);
  const s = getLocalStorage(COUNTS_LOCALSTORAGE_KEY);
  if (s === undefined) {
    return defaultCounts;
  }
  let parsed;
  try {
    parsed = JSON.parse(s);
  } catch (err) {
    console.warn(`${COUNTS_LOCALSTORAGE_KEY}: ${s}: ${err}`);
    return defaultCounts;
  }
  if (!Array.isArray(parsed)) {
    console.warn(`${COUNTS_LOCALSTORAGE_KEY}: ${s}: not an array`);
    return defaultCounts;
  }
  if (parsed.length !== missions.length) {
    console.warn(`${COUNTS_LOCALSTORAGE_KEY}: ${s}: unexpected length`);
    return defaultCounts;
  }
  for (const el of parsed) {
    if (el !== null && (typeof el !== 'number' || !Number.isFinite(el) || el < 0)) {
      console.warn(`${COUNTS_LOCALSTORAGE_KEY}: ${s}: element not number or null`);
      return defaultCounts;
    }
  }
  return parsed;
}

function durationTypeLaunchPoints(durationType: ei.MissionInfo.DurationType) {
  switch (durationType) {
    case 0:
      return 1.0;
    case 1:
      return 1.4;
    case 2:
      return 1.8;
    default:
      return 0;
  }
}

function durationTypeFgClass(durationType: ei.MissionInfo.DurationType) {
  switch (durationType) {
    case 0:
      return 'text-blue-500';
    case 1:
      return 'text-purple-500';
    case 2:
      return 'text-yellow-500';
    default:
      return '';
  }
}
</script>
