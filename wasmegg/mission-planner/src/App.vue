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
        </div>

        <div class="row gx-4 gy-2 my-2">
          <template v-for="(mission, i) in missions" :key="mission.missionTypeId">
            <div v-if="mission.durationType != 3" class="col-4 input-group" style="max-width: 21rem">
              <span
                class="input-group-text"
                :class="durationTypeFgClass(mission.durationType)"
                style="font-size: 0.875rem"
              >
                {{ mission.name }}
              </span>
              <input
                v-model.number="counts[i]"
                type="number"
                class="form-control text-end tabular-nums"
                min="0"
                step="1"
                placeholder="count"
              />
            </div>
          </template>
        </div>
        <button type="button" class="btn btn-secondary btn-sm mt-2" @click="clear">Clear missions</button>
      </div>

      <hr />

      <div class="my-2 tabular-nums">
        <h2 class="fs-5">Fuel</h2>
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
            &mdash; is pointless and will likely leave you disappointed.
          </small>
        </p>
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

export default defineComponent({
  setup() {
    const fuelTankLevel = ref(loadFuelTankLevel());
    watch(fuelTankLevel, () => {
      setLocalStorage(FUEL_TANK_LEVEL_LOCALSTORAGE_KEY, fuelTankLevel.value);
    });
    const fuelTankCapacity = computed(() => fuelTankSizes[fuelTankLevel.value]);

    const useVirtueFuels = ref(getLocalStorage(USE_VIRTUE_FUELS_LOCALSTORAGE_KEY) === 'true');
    watch(useVirtueFuels, () => {
      setLocalStorage(USE_VIRTUE_FUELS_LOCALSTORAGE_KEY, useVirtueFuels.value.toString());
    });

    const counts = ref(loadCounts());
    const clear = () => {
      counts.value = missions.map(() => 0);
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
        const count = Math.floor(counts.value[i]);
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
      fuels.value.forEach(fuelUsed => (total += fuelUsed));
      return total;
    });
    const fuelTankPercentage = computed(() => (totalFuel.value / fuelTankCapacity.value) * 100);
    const fuelTankOverCapacity = computed(() => totalFuel.value >= fuelTankCapacity.value);

    const launchPoints = computed(() => {
      const lps = ships.map(() => 0);
      missions.forEach((mission, i) => {
        const count = Math.floor(counts.value[i]);
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
      counts,
      clear,
      fuels,
      totalFuel,
      fuelTankPercentage,
      fuelTankOverCapacity,
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

function loadCounts(): number[] {
  const defaultCounts = missions.map(() => 0);
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
    if (typeof el !== 'number' || !Number.isFinite(el) || el < 0) {
      console.warn(`${COUNTS_LOCALSTORAGE_KEY}: ${s}: element not number`);
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
