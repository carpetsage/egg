<template>
  <main>
    <p>{{ nickname }}</p>
    <p class="text-sm">
      Last synced to server:
      <span v-tippy="{ content: lastRefreshed.format('LLL') }" class="whitespace-nowrap">
        {{ lastRefreshedRelative }}
      </span>
    </p>
    <p>
      <span
        v-tippy="{
          content: `
          <p>The game, while active, saves to Egg, Inc.&rsquo;s server every couple of minutes if network condition allows.
          Other than soon after a fresh launch of the game, such server syncs are unpredictable from the user&rsquo;s point of view.
          <span class='text-blue-300'>You can force close then reopen the app to reasonably reliably trigger a sync</span>
          (search for &ldquo;iOS force close app&rdquo; or &ldquo;Android force close app&rdquo; if you need help).</p>

          <p>However, even after an app-initiated sync, it may take an unpredicatible amount of time
          (usually within a minute or so) for the game&rsquo;s server to serve the updated save through its API,
          which is then picked up by this tool. There is no solution other than clicking &ldquo;Load Player Data&rdquo;
          periodically until the fresh save shows up. Please do not refresh too fast, which is not helpful.</p>`,
          allowHTML: true,
        }"
        class="inline-flex items-center space-x-1"
      >
        <base-info />
        <span class="text-xs text-gray-500">Why is my save out of date?</span>
      </span>
    </p>
    <p v-if="egg !== enlightenmentEgg" class="text-sm text-red-500 inline-flex items-center">
      Current egg is <img :src="eggIconURL" class="inline h-8 w-8" />, not
      <img :src="enlightenmentEggIconURL" class="inline h-8 w-8" />!
    </p>
    <template v-else>
      <p class="text-sm">
        Last save population:
        <span class="text-green-500 tabular-nums">
          {{ formatWithThousandSeparators(lastRefreshedPopulation) }}
        </span>
      </p>
      <p class="text-sm">
        Current population:
        <span class="text-green-500 tabular-nums mr-0.5">
          {{ formatWithThousandSeparators(currentPopulation) }}
        </span>
        <base-info
          v-tippy="{
            content:
              'The current population is calculated based on the population and offline IHR from the last save. Assuming your IHR did not change since the last save, this number should be slightly ahead of your actual population at the moment, depending on how long you remained active since the last save.',
          }"
          class="inline relative -top-px"
        />
      </p>
      <template v-for="trophy in trophies" :key="trophy.level">
        <trophy-forecast
          v-if="trophy.level > existingTrophyLevel"
          :trophy-level="trophy.name"
          :last-refreshed-population="lastRefreshedPopulation"
          :last-refreshed-timestamp="lastRefreshedTimestamp"
          :target-population="trophy.targetPopulation"
          :hab-space="totalHabSpace"
          :offline-i-h-r="offlineIHR"
        />
      </template>
      <!-- Nobel Prize in Animal Husbandry aka NAH -->
      <template v-if="showNAH">
        <trophy-forecast
          trophy-level="Nobel"
          trophy-name="Nobel Prize in Animal Husbandry&reg;"
          :last-refreshed-population="lastRefreshedPopulation"
          :last-refreshed-timestamp="lastRefreshedTimestamp"
          :target-population="19_845_000_000"
          :hab-space="totalHabSpace"
          :offline-i-h-r="offlineIHR"
        />
        <p class="text-xs text-gray-500">
          The Nobel Prize in Animal Husbandry&reg; is conferred by the Royal Mk.II Society of
          Sciences&reg; on legendary farmers who manage to reach 19,845,000,000 population on their
          enlightenment farm. A legendary jeweled gusset with three Eggceptional clarity stones and all
          Wormhole Dampening levels are required for such a feat.
        </p>
      </template>
      <hr class="mt-2" />

      <!-- Colleggtibles -->
        <div class="text-sm">
          Colleggtibles: 
          <p v-for="(value, key) in colleggtibles" :key="key" class="text-xs mr-0.5">
            <template v-if="value !== 1">
                <template v-if="key == 1">
                &nbsp;&nbsp;Earnings: {{ (value *100 ) - 100 }}%
                </template>
                <template v-if="key == 2">
                &nbsp;&nbsp;Away Earnings: {{ (value * 100 ) }}%
                </template>
                <template v-if="key == 3">
                &nbsp;&nbsp;Internal Hatchery Rate: {{ (value *100 ) - 100 }}%
                </template>
                <template v-if="key == 4">
                &nbsp;&nbsp;Egg Laying Rate: {{ (value -1) * 100 }}%
                </template>
                <template v-if="key == 5">
                &nbsp;&nbsp;Shipping Capacity: {{ (value * 100) -100 }}%
                </template>
                <template v-if="key == 6">
                &nbsp;&nbsp;Hab Capacity: {{ value * 100 }}%
                </template>
                <template v-if="key == 7">
                &nbsp;&nbsp;Vehicle Cost: {{ value * 100 }}%
                </template>
                <template v-if="key == 8">
                &nbsp;&nbsp;Hab Cost: {{ value * 100 }}%
                </template>
                <template v-if="key == 9">
                &nbsp;&nbsp;Research Cost: {{ value * 100 }}%
                </template>
            </template>
          </p>
        </div>

      <hr class="mt-2" />

      <collapsible-section
        section-title="Habs"
        :visible="isVisibleSection('habs')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('habs')"
      >
        <div class="flex my-2 space-x-2">
          <img
            v-for="(hab, index) in habs"
            :key="index"
            v-tippy="{
              content: `${hab.name}, space: ${formatWithThousandSeparators(habSpaces[index])}`,
            }"
            :src="iconURL(hab.iconPath, 128)"
            class="h-16 w-16 bg-gray-50 rounded-lg shadow"
          />
        </div>
        <p>
          Hab space:
          <span class="text-green-500">{{ formatWithThousandSeparators(totalHabSpace) }}</span>
        </p>
        <unfinished-researches :researches="habSpaceResearches" class="my-1" />
        <template v-if="!totalHabSpaceSufficient">
          <p>
            Required Wormhole Dampening level:
            <span class="text-blue-500 mr-0.5">{{ requiredWDLevel }}/25</span>
            <base-info
              v-tippy="{
                content:
                  'Minimum Wormhole Dampening level to reach 10B hab space, assuming all habs are final tier, and all other hab space-related researches have been finished.',
              }"
              class="inline relative -top-px"
            />
          </p>
          <template v-if="minimumRequiredWDLevel < requiredWDLevel">
            <p>
              Note that the level above assumes your current set of artifacts. The minimum WD level
              required is
              <span class="text-blue-500 mr-0.5">{{ minimumRequiredWDLevel }}/25</span>, assuming
              you equip your most effective gusset as pictured below (stone rearrangement possibly
              needed):
            </p>
            <artifacts-gallery :artifacts="bestPossibleGussetSet" class="mt-2 mb-3" />
          </template>
          <template v-if="nakedGangNickname">
            <p class="text-yellow-500">
              {{ nakedGangNickname }}, you're in the naked gang. Your gussets are ignored. You won't
              get any gusset recommendations.
            </p>
          </template>
        </template>
      </collapsible-section>

      <hr />

      <collapsible-section
        section-title="Earnings"
        :visible="isVisibleSection('earnings')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('earnings')"
      >
        <p>
          Earning bonus:
          <base-e-i-value class="text-green-500" :value="earningBonus * 100" suffix="%" />,
          <span class="whitespace-nowrap" :style="{ color: farmerRole.color }">{{
            farmerRole.name
          }}</span>
        </p>
        <p>Farm value: <base-e-i-value class="text-green-500" :value="farmValue" /></p>
        <p>Cash on hand: <base-e-i-value class="text-green-500" :value="cashOnHand" /></p>
        <p>Egg value: <base-e-i-value class="text-green-500" :value="eggValue" /></p>
        <p>
          Earning rate (active, no running chicken, video doubler on):
          <base-e-i-value
            class="text-green-500"
            :value="earningRateOnlineBaseline * 2"
            suffix="/s"
          />
        </p>
        <p>
          Earning rate (active, max RCB <span class="text-green-500">{{ maxRCB }}x</span>, video
          doubler on):
          <base-e-i-value class="text-green-500" :value="earningRateOnlineMaxRCB * 2" suffix="/s" />
        </p>
        <p>
          Earning rate (offline):
          <base-e-i-value class="text-green-500" :value="earningRateOffline" suffix="/s" />
        </p>
        <p class="mt-1">Drone values at max RCB:</p>
        <ul>
          <li>
            Elite: <base-e-i-value class="text-green-500" :value="droneValuesAtMaxRCB.elite" />
          </li>
          <li>
            Regular tier 1:
            <base-e-i-value class="text-green-500" :value="droneValuesAtMaxRCB.tier1" /> ({{
              formatPercentage(droneValuesAtMaxRCB.tier1 / droneValuesAtMaxRCB.elite)
            }}
            of elite), {{ formatPercentage(droneValuesAtMaxRCB.tier1Prob) }} chance
          </li>
          <li>
            Regular tier 2:
            <base-e-i-value class="text-green-500" :value="droneValuesAtMaxRCB.tier2" /> ({{
              formatPercentage(droneValuesAtMaxRCB.tier2 / droneValuesAtMaxRCB.elite)
            }}
            of elite),
            {{ formatPercentage(droneValuesAtMaxRCB.tier2Prob) }} chance
          </li>
          <li>
            Regular tier 3:
            <base-e-i-value class="text-green-500" :value="droneValuesAtMaxRCB.tier3" /> ({{
              formatPercentage(droneValuesAtMaxRCB.tier3 / droneValuesAtMaxRCB.elite)
            }}
            of elite),
            {{ formatPercentage(droneValuesAtMaxRCB.tier3Prob) }} chance
          </li>
        </ul>
        <p class="text-xs text-gray-500 my-1">
          Drone values are based on your current equipped set of artifacts. You may increase their
          values with an Aurelian brooch or a Mercury's lens (drone reward is proportional to farm
          value) or a Vial of Martian dust / terra stones (drone reward is proportional to the
          square root of active running chicken bonus, so increasing max RCB helps to a small
          extent); or increase their frequency with a Neodymium medallion. Farming drones during a
          Generous Drones event is also immensely helpful.
        </p>
        <p class="text-xs text-gray-500 my-1">
          Note: Farm value and drone values are calculated based on mikit#7826's research on game
          version v1.12.13 (pre-artifacts), and drone probabilities were speculative at that time.
          No in-depth research has been carried out since the artifact update, so values may be
          inaccurate in certain edge cases.
        </p>

        <template v-if="cashTargetPreDiscount > 0">
          <p>
            Cash required to reach minimum required Wormhole Dampening level
            <span class="text-blue-500">{{ minimumRequiredWDLevel }}/25</span>
            (before discounts):
            <base-e-i-value class="text-pink-500" :value="cashTargetPreDiscount" />
          </p>
          <target-cash-matrix
            :base-target="cashTargetPreDiscount"
            :current="cashOnHand"
            :targets="cashTargets"
            :means="cashMeans"
            class="my-2"
          />
          <template v-if="betterCubePossible">
            <p>Your best cube possible is pictured below (stone rearrangement possibly needed):</p>
            <artifacts-gallery :artifacts="bestPossibleCubeSet" class="mt-2 mb-3" />
          </template>
          <div class="text-sm mt-2">
            <a
              href="https://docs.google.com/spreadsheets/d/157K4r3Z5wfCNKhUWb34mlxM08DEA1AWamsA20xjQIhw/edit?usp=sharing"
              target="_blank"
              class="text-blue-500 hover:text-blue-600"
              >Sami#2336's spreadsheet</a
            >
            may provide more detailed help regarding execution, at the expense of requiring manual
            input for many parameters.
          </div>
        </template>
        <template v-else-if="cashTargetPreDiscount <= 0 && cashTargetNAHPreDiscount > 0 && showNAH">
          <p>
            Cash required to reach minimum required Wormhole Dampening level
            <span class="text-blue-500">25/25</span>
            (before discounts):
            <base-e-i-value class="text-pink-500" :value="cashTargetNAHPreDiscount" />
          </p>
          <target-cash-matrix
            :base-target="cashTargetNAHPreDiscount"
            :current="cashOnHand"
            :targets="cashTargets"
            :means="cashMeans"
            class="my-2" />
          <template v-if="betterCubePossible">
              <p>Your best cube possible is pictured below (stone rearrangement possibly needed):</p>
              <artifacts-gallery :artifacts="bestPossibleCubeSet" class="mt-2 mb-3" />
          </template>
        </template>

        <template v-else-if="cashTargetNAHPreDiscount <= 0 && cashTargetACREPreDiscount >= 0">
          <p>
            Cash required to max out the farm
            (before discounts):
            <base-e-i-value class="text-pink-500" :value="cashTargetACREPreDiscount" />
          </p>
            <div class="relative flex items-start">
                <div class="flex items-center h-5">
                    <input
                      id="target_ts"
                      v-model="target_ts"
                      name="target_ts"
                      type="checkbox"
                      class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
                    />
                </div>
            <div class="ml-2 text-sm">
                <label for="target_ts" class="text-gray-600">Show required cash for Timeline Splicing only</label>
            </div>
          </div>
          <target-cash-matrix
            :base-target="target_ts ? cashTargetTSPreDiscount : cashTargetACREPreDiscount"
            :current="cashOnHand"
            :targets="cashTargets"
            :means="cashMeans"
            class="my-2" />
          <template v-if="betterCubePossible">
            <p>Your best cube possible is pictured below (stone rearrangement possibly needed):</p>
            <artifacts-gallery :artifacts="bestPossibleCubeSet" class="mt-2 mb-3" />
          </template>
        </template>
      </collapsible-section>

      <hr />

      <collapsible-section
        section-title="Internal hatchery"
        :visible="isVisibleSection('internal_hatchery')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('internal_hatchery')"
      >
        <p class="mt-1">
          Active IHR:
          <span class="whitespace-nowrap">
            <span class="text-green-500">{{ formatWithThousandSeparators(onlineIHR, -1) }}</span>
            chickens/min
          </span>
          <!-- Force a space between the two nowrap spans to prevent the two being treated as a whole. -->
          {{ ' ' }}
          <span class="whitespace-nowrap">
            (<span class="text-green-500">{{
              formatWithThousandSeparators(onlineIHRPerHab, -1)
            }}</span>
            chickens/min/hab)
          </span>
        </p>
        <p>
          Offline IHR:
          <span class="text-green-500">{{ formatWithThousandSeparators(offlineIHR, -1) }}</span>
          chickens/min
        </p>
        <unfinished-researches :researches="internalHatcheryResearches" class="my-1" />
      </collapsible-section>

      <hr />

      <collapsible-section
        section-title="Artifacts"
        :visible="isVisibleSection('artifacts')"
        class="my-2 text-sm"
        @toggle="toggleSectionVisibility('artifacts')"
      >
        <artifacts-gallery :artifacts="artifacts" />
      </collapsible-section>
    </template>
  </main>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

import { eggIconPath, iconURL, UserBackupEmptyError, getLocalStorage, setLocalStorage } from 'lib';
import {
  bestPossibleCubeForEnlightenment,
  bestPossibleGussetForEnlightenment,
  calculateDroneValues,
  calculateFarmValue,
  calculateWDLevelsCost,
  earningBonusToFarmerRole,
  ei,
  farmCurrentWDLevel,
  farmEarningBonus,
  farmEarningRate,
  farmEggValue,
  farmEggValueResearches,
  farmHabs,
  farmHabSpaceResearches,
  farmHabSpaces,
  farmInternalHatcheryRates,
  farmInternalHatcheryResearches,
  farmMaxRCB,
  farmMaxRCBResearches,
  homeFarmArtifacts,
  nakedGangNickname as getNakedGangNickname,
  requestFirstContact,
  requiredWDLevelForEnlightenmentDiamond,
  researchPriceMultiplierFromArtifacts,
  researchPriceMultiplierFromResearches,
  calculateMaxFarmCostMissing,
  calculateTSCost,
  getColleggtibleBonuses,
  researchPriceFromColleggtibles,
} from '@/lib';
import { useSectionVisibility } from 'ui/composables/section_visibility';
import { formatPercentage, formatWithThousandSeparators, formatDurationAuto } from '@/utils';
import CollapsibleSection from '@/components/CollapsibleSection.vue';
import TrophyForecast from '@/components/TrophyForecast.vue';
import ArtifactsGallery from '@/components/ArtifactsGallery.vue';
import UnfinishedResearches from '@/components/UnfinishedResearches.vue';
import TargetCashMatrix from '@/components/TargetCashMatrix.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseEIValue from 'ui/components/BaseEIValue.vue';

// Note that timezone abbreviation may not work due to
// https://github.com/iamkun/dayjs/issues/1154, in which case the GMT offset is
// shown.
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);

const trophies = [
  { level: 1, name: 'Bronze', targetPopulation: 10e6 },
  { level: 2, name: 'Silver', targetPopulation: 50e6 },
  { level: 3, name: 'Gold', targetPopulation: 250e6 },
  { level: 4, name: 'Platinum', targetPopulation: 1e9 },
  { level: 5, name: 'Diamond', targetPopulation: 10e9 },
];

export default defineComponent({
  components: {
    CollapsibleSection,
    TrophyForecast,
    ArtifactsGallery,
    UnfinishedResearches,
    TargetCashMatrix,
    BaseInfo,
    BaseEIValue,
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
  },
  // This async component does not respond to playerId changes.
  /* eslint-disable vue/no-setup-props-destructure */
  async setup({ playerId }) {
    // Validate and sanitize player ID.
    if (!playerId.match(/^EI\d+$/i)) {
      throw new Error(
        `ID ${playerId} is not in the form EI1234567890123456; please consult "Where do I find my ID?"`
      );
    }
    playerId = playerId.toUpperCase();

    // Interval id used for refreshing lastRefreshedRelative.
    let refreshIntervalId: number | undefined;
    onBeforeUnmount(() => {
      clearInterval(refreshIntervalId);
    });

    const data = await requestFirstContact(playerId);
    if (!data.backup || !data.backup.game) {
      throw new UserBackupEmptyError(playerId);
    }
    const backup = data.backup;
    const nickname = backup.userName;
    const progress = backup.game;
    if (!progress) {
      throw new Error(`${playerId}: no game progress in backup`);
    }
    if (!backup.farms || backup.farms.length === 0) {
      throw new Error(`${playerId}: no farm info in backup`);
    }

    const farm = backup.farms[0]; // Home farm
    const egg = farm.eggType!;
    const eggIconURL = iconURL(eggIconPath(egg), 128);
    const enlightenmentEgg = ei.Egg.ENLIGHTENMENT;
    const enlightenmentEggIconURL = iconURL(eggIconPath(enlightenmentEgg), 128);
    const lastRefreshedTimestamp = farm.lastStepTime! * 1000;
    const lastRefreshed = dayjs(Math.min(lastRefreshedTimestamp, Date.now()));
    const currentTimestamp = ref(Date.now());
    const lastRefreshedRelative = ref(lastRefreshed.fromNow());
    const lastRefreshedPopulation = farm.numChickens! as number;
    const colleggtibles = getColleggtibleBonuses(backup);
    const currentPopulation = computed(
      () =>
        lastRefreshedPopulation +
        (offlineIHR / 60_000) * (currentTimestamp.value - lastRefreshedTimestamp)
    );
    const artifacts = homeFarmArtifacts(backup);
    // Cap existing trophy level at platinum for people doing a legit diamond
    // run after cheating it first.
    const existingTrophyLevel = Math.min(backup.game!.eggMedalLevel![18], 4);
    const existingTrophyLevelUncapped = backup.game!.eggMedalLevel![18];

    refreshIntervalId = setInterval(() => {
      currentTimestamp.value = Date.now();
      lastRefreshedRelative.value = lastRefreshed.fromNow();
    }, 200);

    // Members of the naked gang have their gussets (equipped or possessed) ignored.
    const nakedGangNickname = getNakedGangNickname(playerId);

    const habs = farmHabs(farm);
    const habSpaceResearches = farmHabSpaceResearches(farm);
    const habSpaces = farmHabSpaces(habs, habSpaceResearches, artifacts, colleggtibles);
    const totalHabSpace = Math.round(habSpaces.reduce((total, s) => total + s));
    const totalHabSpaceSufficient = totalHabSpace >= 1e10;
    const currentWDLevel = farmCurrentWDLevel(farm);
    const requiredWDLevel = requiredWDLevelForEnlightenmentDiamond(
      nakedGangNickname ? [] : artifacts, colleggtibles
    );
    const bestGusset = bestPossibleGussetForEnlightenment(backup, colleggtibles);
    const bestPossibleGusset = nakedGangNickname
      ? null
      : bestGusset;
    // check for t4l gusset + 3 t4 clarities
    const canNAH = computed(
      () =>
        bestGusset?.afxRarity === ei.ArtifactSpec.Rarity.LEGENDARY &&
        bestGusset.clarityEffect === 3
    );
    const showNAH = computed(() =>
      existingTrophyLevelUncapped == 5 || lastRefreshedPopulation >= 9_000_0000_000 || canNAH.value
    )
    const bestPossibleGussetSet = bestPossibleGusset ? [bestPossibleGusset] : [];
    const minimumRequiredWDLevel = bestPossibleGusset
      ? requiredWDLevelForEnlightenmentDiamond([bestPossibleGusset], colleggtibles)
      : requiredWDLevel;

    const earningBonus = farmEarningBonus(backup, farm, progress, artifacts);
    const farmerRole = earningBonusToFarmerRole(earningBonus);
    const farmValue = calculateFarmValue(backup, farm, progress, artifacts, colleggtibles);
    const cashOnHand = farm.cashEarned! - farm.cashSpent!;
    const eggValue = farmEggValue(farmEggValueResearches(farm), artifacts);
    const maxRCB = farmMaxRCB(farmMaxRCBResearches(farm, progress), artifacts);
    const {
      onlineBaseline: earningRateOnlineBaseline,
      onlineMaxRCB: earningRateOnlineMaxRCB,
      offline: earningRateOffline,
    } = farmEarningRate(backup, farm, progress, artifacts, colleggtibles);
    

    const droneValuesAtMaxRCB = calculateDroneValues(farm, progress, artifacts, {
      population: farm.numChickens! as number,
      farmValue,
      rcb: maxRCB,
    });
    const cashTargetPreDiscount =
      calculateWDLevelsCost(currentWDLevel, minimumRequiredWDLevel) *
          researchPriceMultiplierFromResearches(farm, progress);

    const cashTargetNAHPreDiscount =
      calculateWDLevelsCost(currentWDLevel, 25) *
          researchPriceMultiplierFromResearches(farm, progress);

    const cashTargetACREPreDiscount =
      calculateMaxFarmCostMissing(farm) *
      researchPriceMultiplierFromResearches(farm, progress);

    const cashTargetTSPreDiscount =
        calculateTSCost(farm) *
          researchPriceMultiplierFromResearches(farm, progress);

    const currentPriceMultiplier = researchPriceMultiplierFromArtifacts(artifacts) * researchPriceFromColleggtibles(colleggtibles);
    const bestPossibleCube = bestPossibleCubeForEnlightenment(backup, colleggtibles);
    const bestPossibleCubeSet = bestPossibleCube ? [bestPossibleCube] : [];
    const bestPriceMultiplier = researchPriceMultiplierFromArtifacts(bestPossibleCubeSet) * researchPriceFromColleggtibles(colleggtibles);
    const cashTargets = [
      { multiplier: 1, description: 'No research sale\nno artifacts' },
      { multiplier: 0.3, description: '70% research sale\n no artifacts' },
    ];
    if (currentPriceMultiplier < 1) {
      cashTargets.push(
        { multiplier: currentPriceMultiplier, description: 'No research sale\ncurrent artifacts' },
        {
          multiplier: currentPriceMultiplier * 0.3,
          description: '70% research sale\ncurrent artifacts',
        }
      );
    }
    const betterCubePossible = bestPriceMultiplier < currentPriceMultiplier;
    if (betterCubePossible) {
      cashTargets.push(
        { multiplier: bestPriceMultiplier, description: 'No research sale\nbest cube possible' },
        {
          multiplier: bestPriceMultiplier * 0.3,
          description: '70% research sale\nbest cube possible',
        }
      );
    }
    const calculateAndFormatDuration = (target: number, rate: number): string => {
      if (target <= 0) {
        return '-';
      }
      return formatDurationAuto(target / rate);
    };
    const calculateAndFormatNumDrones = (target: number, rate: number): string => {
      let count: number | string;
      if (target <= 0) {
        count = 0;
      } else if (rate === 0) {
        count = '\u221E';
      } else {
        count = Math.ceil(target / rate);
      }
      return `\u00D7${count}`;
    };
    const cashMeans = [
      {
        rate: earningRateOnlineMaxRCB * 2,
        description: 'Active earnings w/ max RCB, video 2x',
        calc: calculateAndFormatDuration,
      },
      {
        rate: earningRateOffline,
        description: 'Offline earnings',
        calc: calculateAndFormatDuration,
      },
      {
        rate: droneValuesAtMaxRCB.elite,
        description: 'Elite drone at max RCB',
        calc: calculateAndFormatNumDrones,
      },
    ];

    const internalHatcheryResearches = farmInternalHatcheryResearches(farm, progress);
    const {
      onlineRatePerHab: onlineIHRPerHab,
      onlineRate: onlineIHR,
      offlineRate: offlineIHR,
    } = farmInternalHatcheryRates(internalHatcheryResearches, artifacts, colleggtibles);

    const { isVisibleSection, toggleSectionVisibility } = useSectionVisibility();

    const TARGET_TS_LOCALSTORAGE_KEY = 'targetTs';

    const target_ts = ref(getLocalStorage(TARGET_TS_LOCALSTORAGE_KEY) === 'true');
      watch(target_ts, () => {
          setLocalStorage(TARGET_TS_LOCALSTORAGE_KEY, target_ts.value);
      });


    return {
      colleggtibles,
      nickname,
      lastRefreshed,
      lastRefreshedTimestamp,
      lastRefreshedRelative,
      egg,
      eggIconURL,
      enlightenmentEgg,
      enlightenmentEggIconURL,
      artifacts,
      lastRefreshedPopulation,
      trophies,
      existingTrophyLevel,
      existingTrophyLevelUncapped,
      currentPopulation,
      nakedGangNickname,
      habs,
      habSpaceResearches,
      totalHabSpace,
      totalHabSpaceSufficient,
      habSpaces,
      currentWDLevel,
      requiredWDLevel,
      bestPossibleGussetSet,
      minimumRequiredWDLevel,
      earningBonus,
      farmerRole,
      farmValue,
      cashOnHand,
      eggValue,
      maxRCB,
      earningRateOnlineBaseline,
      earningRateOnlineMaxRCB,
      earningRateOffline,
      droneValuesAtMaxRCB,
      cashTargetPreDiscount,
      cashTargetNAHPreDiscount,
      cashTargetACREPreDiscount,
      cashTargets,
      cashMeans,
      canNAH,
      showNAH,
      betterCubePossible,
      bestPossibleCubeSet,
      internalHatcheryResearches,
      onlineIHR,
      onlineIHRPerHab,
      offlineIHR,
      isVisibleSection,
      toggleSectionVisibility,
      formatWithThousandSeparators,
      formatPercentage,
      iconURL,
      cashTargetTSPreDiscount,
      target_ts
    };
  },
});
</script>
