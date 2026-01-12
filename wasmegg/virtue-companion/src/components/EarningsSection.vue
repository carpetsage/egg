<template>
  <div class="my-2">
    <div class="mb-2 flex items-center gap-4">
      <div class="flex items-center">
        <input
          id="always-video-doubler"
          v-model="alwaysCountVideoDoubler"
          type="checkbox"
          class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
        />
        <label for="always-video-doubler" class="ml-2 text-sm text-gray-600">Always count video doubler </label>
      </div>
      <div class="flex items-center">
        <input
          id="hide-online-earnings"
          v-model="hideOnlineEarnings"
          type="checkbox"
          class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
        />
        <label for="hide-online-earnings" class="ml-2 text-sm text-gray-600">Hide online earnings</label>
      </div>
      <div class="flex items-center">
        <input
          id="assume-target-te"
          v-model="assumeTargetTE"
          type="checkbox"
          class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
        />
        <label for="assume-target-te" class="ml-2 text-sm text-gray-600">Assume target TE</label>
      </div>
    </div>
    <p>
      Earning bonus:
      <base-e-i-value class="text-green-500" :value="earningBonus * 100" suffix="%" />,
      <span class="whitespace-nowrap" :style="{ color: farmerRole.color }">{{ farmerRole.name }}</span>
    </p>
    <p>Farm value: <base-e-i-value class="text-green-500" :value="farmValue" /></p>
    <p>Cash on hand: <base-e-i-value class="text-green-500" :value="cashOnHand" /></p>
    <p>Egg value: <base-e-i-value class="text-green-500" :value="eggValue" /></p>
    <p>
      Clothed TE:
      <span class="text-green-500 font-medium">{{ formatWithThousandSeparators(Math.round(clothedTE)) }}</span>
      <base-info
        v-tippy="{
          content:
            'Effective Truth Egg count adjusted for artifacts and missing bonuses. Assumes max Colleggtibles and Epic Research. Artifact bonuses (egg value, offline earnings, research discount) increase this value, while missing Colleggtibles or Epic Research reduce it. Standard permit players have a 50% penalty due to reduced offline earnings.',
        }"
        class="inline relative -top-px ml-1 text-gray-400"
      />
    </p>
    <p>
      Max Clothed TE:
      <span class="text-green-500 font-medium">{{ formatWithThousandSeparators(Math.round(maxClothedTE)) }}</span>
      <base-info
        v-tippy="{
          content:
            'Maximum possible Clothed TE with the best artifact combination from your inventory. See the Optimal Artifacts section below for the recommended loadout.',
        }"
        class="inline relative -top-px ml-1 text-gray-400"
      />
    </p>
    <p v-if="showRCB">
      Earning rate (active, no running chicken, video doubler on):
      <base-e-i-value class="text-green-500" :value="onlineBaseline * 2" suffix="/s" />
    </p>
    <p v-if="showRCB">
      Earning rate (active, max RCB
      <span class="text-green-500">{{ formatWithThousandSeparators(maxRCB) }}x</span>, video doubler on):
      <base-e-i-value class="text-green-500" :value="onlineMaxRCB * 2" suffix="/s" />
    </p>
    <p>
      Earning rate (offline{{ alwaysCountVideoDoubler ? ', video doubler on' : '' }}):
      <base-e-i-value class="text-green-500" :value="offlineWithDoubler" suffix="/s" />
    </p>
    <p v-if="showRCB">
      Earning rate (active, no running chicken, video doubler on, <strong>optimal artifacts</strong>):
      <base-e-i-value class="text-green-500" :value="onlineBaselineOptimal * 2" suffix="/s" />
    </p>
    <p v-if="showRCB">
      Earning rate (active, max RCB
      <span class="text-green-500">{{ formatWithThousandSeparators(maxRCB) }}x</span>, video doubler on,
      <strong>optimal artifacts</strong>):
      <base-e-i-value class="text-green-500" :value="onlineMaxRCBOptimal * 2" suffix="/s" />
    </p>
    <p>
      Earning rate (offline{{ alwaysCountVideoDoubler ? ', video doubler on' : '' }},
      <strong>optimal artifacts</strong>):
      <base-e-i-value class="text-green-500" :value="offlineOptimalWithDoubler" suffix="/s" />
    </p>
    <p>
      Cash gift:
      <base-e-i-value class="text-green-500" :value="farmValue * 0.005" /> /
      <base-e-i-value class="text-green-500" :value="farmValue * 0.015" />
    </p>
    <div v-if="!hideOnlineEarnings">
      <div class="mt-1 flex items-center gap-2">
        <span>Drone values:</span>
        <div class="flex items-center">
          <input
            id="show-drone-rcb"
            v-model="showDroneRCB"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
          <label for="show-drone-rcb" class="ml-2 text-sm text-gray-600">With RCB</label>
        </div>
      </div>
      <ul>
        <li>Elite: <base-e-i-value class="text-green-500" :value="displayedDroneValues.elite" /></li>
        <li>
          Regular tier 1:
          <base-e-i-value class="text-green-500" :value="displayedDroneValues.tier1" /> ({{
            formatPercentage(displayedDroneValues.tier1 / displayedDroneValues.elite)
          }}
          of elite), {{ formatPercentage(displayedDroneValues.tier1Prob) }} chance
        </li>
        <li>
          Regular tier 2:
          <base-e-i-value class="text-green-500" :value="displayedDroneValues.tier2" /> ({{
            formatPercentage(displayedDroneValues.tier2 / displayedDroneValues.elite)
          }}
          of elite), {{ formatPercentage(displayedDroneValues.tier2Prob) }} chance
        </li>
        <li>
          Regular tier 3:
          <base-e-i-value class="text-green-500" :value="displayedDroneValues.tier3" /> ({{
            formatPercentage(displayedDroneValues.tier3 / displayedDroneValues.elite)
          }}
          of elite), {{ formatPercentage(displayedDroneValues.tier3Prob) }} chance
        </li>
      </ul>
      <p class="text-xs text-gray-500 mt-1">
        Drone values are based on your current equipped set of artifacts. You may increase their values with an Aurelian
        brooch or a Mercury's lens (drone reward is proportional to farm value) or a Vial of Martian dust / terra stones
        (drone reward is proportional to the square root of active running chicken bonus, so increasing max RCB helps to
        a small extent); or increase their frequency with a Neodymium medallion. Farming drones during a Generous Drones
        event is also immensely helpful.
      </p>
      <p class="text-xs text-gray-500 mt-1">
        Note: Farm value and drone values are calculated based on mikit#7826's research on game version v1.12.13
        (pre-artifacts), and drone probabilities were speculative at that time. No in-depth research has been carried
        out since the artifact update, so values may be inaccurate in certain edge cases.
      </p>
    </div>

    <!-- Cash Target -->
    <div class="mt-3">
      <div class="mb-2 flex items-center gap-2">
        <label for="cash-target" class="text-sm text-gray-600">Cash target:</label>
        <input
          id="cash-target"
          v-model="cashTargetInput"
          type="text"
          placeholder="e.g. 1.5T, 100M"
          class="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div v-if="parsedCashTarget > 0" class="mt-2 pt-2 border-t border-gray-200">
        <table class="text-sm w-auto tabular-nums">
          <tbody class="divide-y divide-gray-100">
            <tr>
              <td class="py-1.5 pr-4 text-gray-600 font-medium whitespace-nowrap">Cash target</td>
              <td class="py-1.5 text-right text-gray-900 whitespace-nowrap">
                {{ formatEIValue(parsedCashTarget) }}
              </td>
            </tr>

            <tr>
              <td class="py-1.5 pr-4 text-gray-600 font-medium whitespace-nowrap">Need to earn</td>
              <td class="py-1.5 text-right text-gray-900 whitespace-nowrap">
                {{ formatEIValue(needToEarn) }}
              </td>
            </tr>
            <tr v-for="m in cashMeans" :key="m.description">
              <td class="py-1.5 pr-4 text-gray-600 whitespace-nowrap">{{ m.description }}</td>
              <td class="py-1.5 text-right text-gray-900 whitespace-nowrap">
                <span
                  v-tippy="{
                    content:
                      m.calc === calculateAndFormatNumDrones || needToEarn <= 0
                        ? undefined
                        : formatTargetDate(needToEarn, m.rate),
                  }"
                  :class="{
                    'border-b border-dotted border-gray-400 cursor-help':
                      m.calc !== calculateAndFormatNumDrones && needToEarn > 0,
                  }"
                >
                  {{ m.calc(needToEarn, m.rate) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, watch, toRefs } from 'vue';
import dayjs from 'dayjs';
import { ei, formatEIValue, parseValueWithUnit, allModifiersFromColleggtibles, getNumTruthEggs } from 'lib';
import {
  farmEarningRate,
  calculateDroneValues,
  homeFarmArtifacts,
  farmEarningBonus,
  earningBonusToFarmerRole,
  calculateFarmValue,
  farmEggValue,
  farmEggValueResearches,
  farmMaxRCB,
  farmMaxRCBResearches,
  calculateClothedTE,
} from '@/lib';
import { calculateAndFormatDuration } from 'lib/utils';
import { Artifact } from '@/lib/types';
import { formatPercentage, formatWithThousandSeparators } from '@/utils';
import { getLocalStorage, setLocalStorage } from 'lib/utils';
import BaseEIValue from 'ui/components/BaseEIValue.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';

type Means = {
  rate: number;
  description: string;
  calc: (target: number, rate: number) => string;
};

export default defineComponent({
  components: {
    BaseEIValue,
    BaseInfo,
  },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
    optimalArtifacts: {
      type: Array as PropType<Artifact[]>,
      required: true,
    },
    targetTE: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const { backup, optimalArtifacts, targetTE } = toRefs(props);

    const CASH_TARGET_LOCALSTORAGE_KEY = 'earningsCashTarget';
    const VIDEO_DOUBLER_LOCALSTORAGE_KEY = 'alwaysCountVideoDoubler';
    const HIDE_ONLINE_EARNINGS_KEY = 'hideOnlineEarnings';
    const SHOW_DRONE_RCB_KEY = 'showDroneRCB';
    const ASSUME_TARGET_TE_KEY = 'assumeTargetTE';

    const cashTargetInput = ref(getLocalStorage(CASH_TARGET_LOCALSTORAGE_KEY) || '');
    const alwaysCountVideoDoubler = ref(getLocalStorage(VIDEO_DOUBLER_LOCALSTORAGE_KEY) !== 'false');
    const hideOnlineEarnings = ref(getLocalStorage(HIDE_ONLINE_EARNINGS_KEY) !== 'false');
    const showDroneRCB = ref(getLocalStorage(SHOW_DRONE_RCB_KEY) !== 'false');
    const assumeTargetTE = ref(getLocalStorage(ASSUME_TARGET_TE_KEY) === 'true');

    watch(cashTargetInput, () => {
      setLocalStorage(CASH_TARGET_LOCALSTORAGE_KEY, cashTargetInput.value);
    });

    watch(alwaysCountVideoDoubler, () => {
      setLocalStorage(VIDEO_DOUBLER_LOCALSTORAGE_KEY, alwaysCountVideoDoubler.value.toString());
    });

    watch(hideOnlineEarnings, () => {
      setLocalStorage(HIDE_ONLINE_EARNINGS_KEY, hideOnlineEarnings.value.toString());
    });

    watch(showDroneRCB, () => {
      setLocalStorage(SHOW_DRONE_RCB_KEY, showDroneRCB.value.toString());
    });

    watch(assumeTargetTE, () => {
      setLocalStorage(ASSUME_TARGET_TE_KEY, assumeTargetTE.value.toString());
    });

    const parsedCashTarget = computed(() => {
      const parsed = parseValueWithUnit(cashTargetInput.value, false);
      return parsed !== null ? parsed : 0;
    });

    const effectiveTruthEggs = computed(() => {
      const baseTE = getNumTruthEggs(backup.value);
      if (!assumeTargetTE.value) {
        return baseTE;
      }
      return targetTE.value * 5;
    });

    const cashOnHand = computed(() => {
      const farm = backup.value.farms![0];
      return farm.cashEarned! - farm.cashSpent!;
    });

    const computedMetrics = computed(() => {
      const farm = backup.value.farms![0];
      const progress = backup.value.game!;
      const modifiers = allModifiersFromColleggtibles(backup.value);

      // Create a modified backup if target TE is assumed, for EB and EB-dependent calculations.
      let workingBackup: ei.IBackup = backup.value;

      if (assumeTargetTE.value) {
        // Override the truth eggs count to targetTE * 5
        const originalVirtue = backup.value.virtue || {};
        workingBackup = {
          ...backup.value,
          virtue: {
            ...originalVirtue,
            eovEarned: [effectiveTruthEggs.value],
          },
        };
      }

      const earningBonus = farmEarningBonus(workingBackup);
      const farmerRole = earningBonusToFarmerRole(earningBonus);
      const artifacts = homeFarmArtifacts(backup.value, true);
      const farmValue = calculateFarmValue(workingBackup, farm, progress, artifacts);
      // eggValue depends on researches, not EB directly.
      const eggValue = farmEggValue(farmEggValueResearches(farm), artifacts);
      const maxRCB = farmMaxRCB(farmMaxRCBResearches(farm, progress), artifacts);

      const rates = farmEarningRate(workingBackup, farm, progress, artifacts, modifiers);

      const droneValuesMaxRCB = calculateDroneValues(farm, progress, artifacts, {
        population: farm.numChickens! as number,
        farmValue,
        rcb: maxRCB,
      });

      const droneValuesNoRCB = calculateDroneValues(farm, progress, artifacts, {
        population: farm.numChickens! as number,
        farmValue,
        rcb: 1,
      });

      const clothedTE = calculateClothedTE(workingBackup, artifacts);

      // We assume optimal artifacts set doesn't change with adding pending TE, just the resulting clothed TE count.
      const maxClothedTE = calculateClothedTE(workingBackup, optimalArtifacts.value);

      const ratesOptimal = farmEarningRate(workingBackup, farm, progress, optimalArtifacts.value, modifiers);

      return {
        earningBonus,
        farmerRole,
        farmValue,
        eggValue,
        maxRCB,
        onlineBaseline: rates.onlineBaseline,
        onlineMaxRCB: rates.onlineMaxRCB,
        offline: rates.offline,
        droneValuesMaxRCB,
        droneValuesNoRCB,
        clothedTE,
        maxClothedTE,
        onlineBaselineOptimal: ratesOptimal.onlineBaseline,
        onlineMaxRCBOptimal: ratesOptimal.onlineMaxRCB,
        offlineOptimal: ratesOptimal.offline,
      };
    });

    const earningBonus = computed(() => computedMetrics.value.earningBonus);
    const farmerRole = computed(() => computedMetrics.value.farmerRole);
    const farmValue = computed(() => computedMetrics.value.farmValue);
    const eggValue = computed(() => computedMetrics.value.eggValue);
    const maxRCB = computed(() => computedMetrics.value.maxRCB);
    const onlineBaseline = computed(() => computedMetrics.value.onlineBaseline);
    const onlineMaxRCB = computed(() => computedMetrics.value.onlineMaxRCB);
    const offline = computed(() => computedMetrics.value.offline);
    const clothedTE = computed(() => computedMetrics.value.clothedTE);
    const maxClothedTE = computed(() => computedMetrics.value.maxClothedTE);

    const offlineWithDoubler = computed(() => {
      return alwaysCountVideoDoubler.value ? offline.value * 2 : offline.value;
    });

    const onlineBaselineOptimal = computed(() => computedMetrics.value.onlineBaselineOptimal);
    const onlineMaxRCBOptimal = computed(() => computedMetrics.value.onlineMaxRCBOptimal);
    const offlineOptimal = computed(() => computedMetrics.value.offlineOptimal);

    const offlineOptimalWithDoubler = computed(() => {
      return alwaysCountVideoDoubler.value ? offlineOptimal.value * 2 : offlineOptimal.value;
    });

    const showRCB = computed(() => !hideOnlineEarnings.value);

    const displayedDroneValues = computed(() =>
      showDroneRCB.value ? computedMetrics.value.droneValuesMaxRCB : computedMetrics.value.droneValuesNoRCB
    );

    const cashMeans = computed<Means[]>(() => {
      const means: Means[] = [];

      if (showRCB.value) {
        // Active earnings w/ max RCB, video 2x
        means.push({
          rate: onlineMaxRCB.value * 2,
          description: 'Active earnings w/ max RCB, video 2x',
          calc: (t, r) => calculateAndFormatDuration(t, r),
        });
      }

      // Offline
      means.push({
        rate: offlineWithDoubler.value,
        description: alwaysCountVideoDoubler.value ? 'Offline earnings, video 2x' : 'Offline earnings',
        calc: (t, r) => calculateAndFormatDuration(t, r),
      });

      if (showRCB.value) {
        // Active optimal artifacts
        means.push({
          rate: onlineMaxRCBOptimal.value * 2,
          description: 'Active w/ max RCB, video 2x, optimal artifacts',
          calc: (t, r) => calculateAndFormatDuration(t, r),
        });
      }

      // Offline optimal
      means.push({
        rate: offlineOptimalWithDoubler.value,
        description: alwaysCountVideoDoubler.value
          ? 'Offline, video 2x, optimal artifacts'
          : 'Offline, optimal artifacts',
        calc: (t, r) => calculateAndFormatDuration(t, r),
      });

      if (!hideOnlineEarnings.value) {
        means.push({
          rate: displayedDroneValues.value.elite,
          description: showDroneRCB.value ? 'Elite drone at max RCB' : 'Elite drone without RCB',
          calc: calculateAndFormatNumDrones,
        });

        // Cash gifts
        const giftRate = farmValue.value * 0.005;
        means.push({
          rate: giftRate,
          description: 'Random gift (cash)',
          calc: calculateAndFormatNumDrones,
        });

        const videoGiftRate = farmValue.value * 0.015;
        means.push({
          rate: videoGiftRate,
          description: 'Video gift (cash)',
          calc: calculateAndFormatNumDrones,
        });
      }

      return means;
    });

    const needToEarn = computed(() => {
      return Math.max(parsedCashTarget.value - cashOnHand.value, 0);
    });

    const setCashTarget = (amount: number) => {
      cashTargetInput.value = formatEIValue(amount, { trim: true });
    };

    const addCashTarget = (amount: number) => {
      const current = parsedCashTarget.value || 0;
      cashTargetInput.value = formatEIValue(current + amount, { trim: true });
    };

    const calculateAndFormatNumDrones = (target: number, droneValue: number): string => {
      let count: number | string;
      if (target <= 0) {
        count = 0;
      } else if (droneValue === 0) {
        count = '\u221E';
      } else {
        count = Math.ceil(target / droneValue);
      }
      return `\u00D7${count}`;
    };

    const formatTargetDate = (amount: number, rate: number) => {
      const seconds = amount / rate;
      return dayjs().add(seconds, 'second').format('LLL');
    };

    return {
      cashTargetInput,
      parsedCashTarget,
      cashMeans,
      needToEarn,
      setCashTarget,
      addCashTarget,
      alwaysCountVideoDoubler,
      hideOnlineEarnings,
      assumeTargetTE,
      showRCB,
      showDroneRCB,
      offlineWithDoubler,
      offlineOptimalWithDoubler,
      onlineBaselineOptimal,
      onlineMaxRCBOptimal,
      displayedDroneValues,
      formatEIValue,
      formatPercentage,
      formatWithThousandSeparators,
      earningBonus,
      farmerRole,
      farmValue,
      eggValue,
      maxRCB,
      onlineBaseline,
      onlineMaxRCB,
      offline,
      clothedTE,
      maxClothedTE,
      cashOnHand,
      calculateAndFormatNumDrones,
      formatTargetDate,
    };
  },
});
</script>
