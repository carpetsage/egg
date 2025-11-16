<template>
  <section class="my-4">
    <div class="text-center text-sm font-medium mb-2">Earning bonus planner</div>

    <div class="text-sm">
      Currently, ignoring artifact effects:<br />
      <span class="whitespace-nowrap" :style="{ color: currentNakedFarmerRole.color }"
        >{{ currentNakedFarmerRole.name }}, {{ formatEIValue(currentNakedEarningBonus * 100) }}%</span
      >&nbsp;
      <span class="inline-flex flex-wrap items-center">
        <span class="mr-1">at</span>
        <prophecy-eggs-soul-eggs-combo
          :prophecy-eggs="currentProphecyEggs"
          :soul-eggs="currentSoulEggs"
          :truth-eggs="currentTruthEggs"
        />
      </span>
    </div>

    <earning-bonus-target-selector v-model:selected-target="selectedTarget" :targets="targets" class="mt-1" />

    <fieldset
      v-if="currentSoulFoodLevel < maxSoulFoodLevel || currentProphecyBonusLevel < maxProphecyBonusLevel"
      class="mt-2 mb-3"
    >
      <div class="flex items-center mb-1">
        <caption class="flex-shrink-0 pr-3 bg-white text-sm font-medium">
          Epic research configurations
        </caption>
        <div class="flex-1 border-t-2 border-gray-200"></div>
      </div>

      <div v-if="currentSoulFoodLevel < maxSoulFoodLevel">
        <base-integer-input
          id="eb-planner-soul-food-level"
          v-model="configuredSoulFoodLevel"
          :min="currentSoulFoodLevel"
          :max="maxSoulFoodLevel"
        >
          <template #default="{ input, invalid, updateInput }">
            <div
              class="relative sm:max-w-xs border border-gray-300 rounded-md px-3 py-2 shadow-sm focus-within:ring-1 mt-4"
              :class="
                invalid
                  ? 'focus-within:ring-red-600 focus-within:border-red-600'
                  : 'focus-within:ring-blue-600 focus-within:border-blue-600'
              "
            >
              <label class="absolute -top-2 left-2 -mt-px inline-block px-1 bg-white text-xs font-medium text-gray-900"
                >Soul food level</label
              >
              <input
                :value="input"
                type="number"
                :min="currentSoulFoodLevel"
                :max="maxSoulFoodLevel"
                class="block w-full border-0 p-0 focus:ring-0 sm:text-sm pr-10"
                :class="invalid ? 'text-red-700' : 'text-gray-900'"
                @input="updateInput"
              />
              <div
                class="absolute right-0 top-0 bottom-0 px-3 py-2 sm:text-sm bg-gray-50 text-gray-500 rounded-r-md border-l border-gray-300 tabular-nums"
              >
                / {{ maxSoulFoodLevel }}
              </div>
            </div>
          </template>
        </base-integer-input>
        <div v-if="configuredSoulFoodLevel > currentSoulFoodLevel" class="text-xs mt-1">
          Upgrade cost from level {{ currentSoulFoodLevel }} to {{ configuredSoulFoodLevel }}:
          <span class="text-yellow-500">{{ configuredSoulFoodUpgradeCost.toLocaleString('en-US') }}</span>
          <img :src="iconURL('/egginc-extras/icon_golden_egg.png', 64)" class="inline h-3.5 w-3.5 relative -top-px" />
        </div>
      </div>

      <div v-if="currentProphecyBonusLevel < maxProphecyBonusLevel">
        <base-integer-input
          id="eb-planner-prophecy-bonus-level"
          v-model="configuredProphecyBonusLevel"
          :min="currentProphecyBonusLevel"
          :max="maxProphecyBonusLevel"
        >
          <template #default="{ input, invalid, updateInput }">
            <div
              class="relative sm:max-w-xs border border-gray-300 rounded-md px-3 py-2 shadow-sm focus-within:ring-1 mt-4"
              :class="
                invalid
                  ? 'focus-within:ring-red-600 focus-within:border-red-600'
                  : 'focus-within:ring-blue-600 focus-within:border-blue-600'
              "
            >
              <label class="absolute -top-2 left-2 -mt-px inline-block px-1 bg-white text-xs font-medium text-gray-900"
                >Prophecy bonus level</label
              >
              <input
                :value="input"
                type="number"
                :min="currentProphecyBonusLevel"
                :max="maxProphecyBonusLevel"
                class="block w-full border-0 p-0 focus:ring-0 sm:text-sm pr-10"
                :class="invalid ? 'text-red-700' : 'text-gray-900'"
                @input="updateInput"
              />
              <div
                class="absolute right-0 top-0 bottom-0 px-3 py-2 sm:text-sm bg-gray-50 text-gray-500 rounded-r-md border-l border-gray-300 tabular-nums"
              >
                / <span class="invisible">00</span>{{ maxProphecyBonusLevel }}
              </div>
            </div>
          </template>
        </base-integer-input>
        <div v-if="configuredProphecyBonusLevel > currentProphecyBonusLevel" class="text-xs mt-1">
          Upgrade cost from level {{ currentProphecyBonusLevel }} to {{ configuredProphecyBonusLevel }}:
          <span class="text-yellow-500">{{ configuredProphecyBonusUpgradeCost.toLocaleString('en-US') }}</span>
          <img :src="iconURL('/egginc-extras/icon_golden_egg.png', 64)" class="inline h-3.5 w-3.5 relative -top-px" />
        </div>
      </div>
    </fieldset>

    <fieldset class="border-b-2 border-gray-200 pb-3 mt-2">
      <div class="flex items-center mb-1">
        <caption class="flex-shrink-0 pr-3 bg-white text-sm font-medium">
          Artifact configurations
        </caption>
        <div class="flex-1 border-t-2 border-gray-200"></div>
      </div>

      <div class="relative flex items-start mb-1">
        <div class="flex items-center h-5">
          <input
            id="eb-planner-include-artifact-effects"
            v-model="includeArtifactEffects"
            name="eb-planner-include-artifact-effects"
            type="checkbox"
            class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
        </div>
        <label class="ml-2 text-sm" for="eb-planner-include-artifact-effects">Include artifact effects</label>
      </div>

      <book-selector
        v-model:selected-book="selectedBook"
        :owned-book-ids="ownedBookIds"
        :disabled="!includeArtifactEffects"
        :class="!includeArtifactEffects ? 'opacity-50' : null"
      />

      <stones-selector
        v-model:stone-counts="selectedProphecyStoneCounts"
        :stones="prophecyStones"
        :owned-stone-counts="ownedProphecyStoneCounts"
        :disabled="!includeArtifactEffects"
        class="mt-2"
        :class="!includeArtifactEffects ? 'opacity-50' : null"
      />

      <stones-selector
        v-model:stone-counts="selectedSoulStoneCounts"
        :stones="soulStones"
        :owned-stone-counts="ownedSoulStoneCounts"
        :disabled="!includeArtifactEffects"
        :class="!includeArtifactEffects ? 'opacity-50' : null"
      />

      <div v-if="totalSelectedStones > maxPossibleSlots" class="text-sm text-red-500">
        More stones ({{ totalSelectedStones }}) than max possible slots ({{ maxPossibleSlots }})!
      </div>
    </fieldset>

    <div v-if="earningBonusAsConfigured !== currentNakedEarningBonus" class="text-sm mt-2">
      EB as configured:
      <span :style="{ color: farmerRoleAsConfigured.color }">{{ formatEIValue(earningBonusAsConfigured * 100) }}%</span>
    </div>

    <div class="bg-yellow-100 p-4 rounded-lg shadow-inner my-3">
      <template v-if="combosToReachTarget.length > 0">
        <div class="text-sm -mt-1 mb-1">One of the following combos is required to reach the target:</div>
        <div class="relative flex items-start mb-2">
          <div class="flex items-center h-5">
            <input
              id="eb-planner-show-total-required"
              v-model="showTotalRequired"
              name="eb-planner-show-total-required"
              type="checkbox"
              class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
          </div>
          <label class="ml-2 text-sm" for="eb-planner-show-total-required"
            >Show total required instead of additional required</label
          >
        </div>

        <div class="grid gap-x-1 gap-y-0.5 tabular-nums" :style="{ gridTemplateColumns: 'repeat(auto-fill, 10rem)' }">
          <div v-for="(combo, index) in combosToReachTarget" :key="index">
            <div class="flex flex-wrap items-center">
              <prophecy-eggs-soul-eggs-combo
                v-if="showTotalRequired"
                :prophecy-eggs="currentProphecyEggs + combo.prophecyEggs"
                :show-prophecy-eggs="currentProphecyEggs + combo.prophecyEggs > 0"
                :prophecy-eggs-tooltip="`${combo.prophecyEggs} additional required`"
                :soul-eggs="currentSoulEggs + combo.soulEggs"
                :show-soul-eggs="currentSoulEggs + combo.soulEggs > 0"
                :soul-eggs-tooltip="`${formatEIValue(combo.soulEggs)} additional required`"
                :truth-eggs="currentTruthEggs"
              />
              <prophecy-eggs-soul-eggs-combo
                v-else
                :prophecy-eggs="combo.prophecyEggs"
                :show-prophecy-eggs="combo.prophecyEggs > 0"
                :prophecy-eggs-tooltip="`${currentProphecyEggs + combo.prophecyEggs} total`"
                :soul-eggs="combo.soulEggs"
                :show-soul-eggs="combo.soulEggs > 0"
                :soul-eggs-tooltip="`${formatEIValue(currentSoulEggs + combo.soulEggs)} total`"
                :truth-eggs="currentTruthEggs"
                :show-truth-eggs="false"
              />
            </div>
          </div>
        </div>
      </template>
      <div v-else class="text-sm">Already there!</div>
    </div>
  </section>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

import {
  earningBonusToFarmerRole,
  ei,
  Farm,
  formatEIValue,
  getLocalStorage,
  getNumProphecyEggs,
  getNumSoulEggs,
  getNumTruthEggs,
  getProphecyBonusLevel,
  getSoulFoodLevel,
  iconURL,
  Inventory,
  setLocalStorage,
  soulPowerToFarmerRole,
} from 'lib';
import {
  maxProphecyBonusLevel,
  maxSoulFoodLevel,
  prophecyBonusUpgradeCost,
  prophecyStones,
  soulFoodUpgradeCost,
  soulStones,
  StoneCounts,
} from '@/lib';
import BaseIntegerInput from 'ui/components/BaseIntegerInput.vue';
import BookSelector from '@/components/BookSelector.vue';
import EarningBonusTargetSelector from '@/components/EarningBonusTargetSelector.vue';
import ProphecyEggsSoulEggsCombo from '@/components/ProphecyEggsSoulEggsCombo.vue';
import StonesSelector from '@/components/StonesSelector.vue';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;

type Combo = {
  prophecyEggs: number;
  soulEggs: number;
  truthEggs: number;
};

const INCLUDE_ARTIFACT_EFFECTS_LOCALSTORAGE_KEY = 'ebPlannerIncludeArtifactEffects';
const SHOW_TOTAL_REQUIRED_LOCALSTORAGE_KEY = 'ebPlannerShowTotalRequired';

export default defineComponent({
  components: {
    BaseIntegerInput,
    BookSelector,
    EarningBonusTargetSelector,
    ProphecyEggsSoulEggsCombo,
    StonesSelector,
  },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
  },
  setup(props) {
    const { backup } = toRefs(props);
    const currentProphecyEggs = computed(() => getNumProphecyEggs(backup.value));
    const currentSoulEggs = computed(() => getNumSoulEggs(backup.value));
    const currentTruthEggs = computed(() => getNumTruthEggs(backup.value));
    const currentSoulFoodLevel = computed(() => getSoulFoodLevel(backup.value));
    const currentProphecyBonusLevel = computed(() => getProphecyBonusLevel(backup.value));
    const currentNakedEarningBonus = computed(
      () =>
        currentSoulEggs.value *
        earningBonusPerSoulEgg({
          numProphecyEggs: currentProphecyEggs.value,
          numTruthEggs: currentTruthEggs.value,
          soulFoodLevel: currentSoulFoodLevel.value,
          prophecyBonusLevel: currentProphecyBonusLevel.value,
          artifactSoulEggBonus: 0,
          artifactProphecyEggBonus: 0,
        })
    );
    const currentNakedFarmerRole = computed(() => earningBonusToFarmerRole(currentNakedEarningBonus.value));

    const configuredSoulFoodLevel = ref(currentSoulFoodLevel.value);
    const configuredProphecyBonusLevel = ref(currentProphecyBonusLevel.value);
    const configuredSoulFoodUpgradeCost = computed(() =>
      soulFoodUpgradeCost(currentSoulFoodLevel.value, configuredSoulFoodLevel.value)
    );
    const configuredProphecyBonusUpgradeCost = computed(() =>
      prophecyBonusUpgradeCost(currentProphecyBonusLevel.value, configuredProphecyBonusLevel.value)
    );

    const includeArtifactEffects = ref(getLocalStorage(INCLUDE_ARTIFACT_EFFECTS_LOCALSTORAGE_KEY) === 'true');
    watch(includeArtifactEffects, () =>
      setLocalStorage(INCLUDE_ARTIFACT_EFFECTS_LOCALSTORAGE_KEY, includeArtifactEffects.value)
    );
    const inventory = computed(() => new Inventory(backup.value.artifactsDb!));
    const homeFarmArtifactSet = computed(() => new Farm(backup.value, backup.value.farms![0]).artifactSet);
    const ownedBookIds = computed(() => {
      const ids = <string[]>[];
      for (const level of [Level.INFERIOR, Level.LESSER, Level.NORMAL, Level.GREATER]) {
        const item = inventory.value.getItem({ name: Name.BOOK_OF_BASAN, level });
        if (item.haveCommon > 0) {
          ids.push(`${item.id}:common`);
        }
        if (item.haveRare > 0) {
          ids.push(`${item.id}:rare`);
        }
        if (item.haveEpic > 0) {
          ids.push(`${item.id}:epic`);
        }
        if (item.haveLegendary > 0) {
          ids.push(`${item.id}:legendary`);
        }
      }
      return ids;
    });
    const selectedBook = ref(
      (() => {
        const artifacts = homeFarmArtifactSet.value.artifacts;
        for (const artifact of artifacts) {
          if (artifact.afxId === Name.BOOK_OF_BASAN) {
            return artifact.host;
          }
        }
        return null;
      })()
    );
    const maxPossibleSlots = computed(() => (selectedBook.value ? selectedBook.value.slots + 9 : 12));
    const ownedStoneCounts = (afxId: Name) => {
      const counts = <StoneCounts>[0, 0, 0];
      for (const level of [Level.INFERIOR, Level.LESSER, Level.NORMAL]) {
        counts[level as 0 | 1 | 2] = inventory.value.getItem({
          name: afxId,
          level,
        }).haveCommon;
      }
      return counts;
    };
    const equippedStoneCounts = (afxId: Name) => {
      const artifacts = homeFarmArtifactSet.value.artifacts;
      const counts = <StoneCounts>[0, 0, 0];
      for (const artifact of artifacts) {
        for (const stone of artifact.stones) {
          if (stone.afxId === afxId) {
            counts[stone.afxLevel as 0 | 1 | 2]++;
          }
        }
      }
      return counts;
    };
    const ownedProphecyStoneCounts = computed(() => ownedStoneCounts(Name.PROPHECY_STONE));
    const selectedProphecyStoneCounts = ref(equippedStoneCounts(Name.PROPHECY_STONE));
    const ownedSoulStoneCounts = computed(() => ownedStoneCounts(Name.SOUL_STONE));
    const selectedSoulStoneCounts = ref(equippedStoneCounts(Name.SOUL_STONE));
    const totalSelectedStones = computed(() =>
      [...selectedProphecyStoneCounts.value, ...selectedSoulStoneCounts.value].reduce((sum, count) => sum + count)
    );
    const artifactSoulEggBonus = computed(() =>
      soulStones
        .map((stone, index) => selectedSoulStoneCounts.value[index] * stone.effectDelta)
        .reduce((sum, delta) => sum + delta)
    );
    const artifactProphecyEggBonus = computed(
      () =>
        (selectedBook.value?.effectDelta ?? 0) +
        prophecyStones
          .map((stone, index) => selectedProphecyStoneCounts.value[index] * stone.effectDelta)
          .reduce((sum, delta) => sum + delta)
    );

    const earningBonusAsConfigured = computed(
      () =>
        currentSoulEggs.value *
        earningBonusPerSoulEgg({
          numProphecyEggs: currentProphecyEggs.value,
          numTruthEggs: currentTruthEggs.value,
          soulFoodLevel: configuredSoulFoodLevel.value,
          prophecyBonusLevel: configuredProphecyBonusLevel.value,
          artifactSoulEggBonus: includeArtifactEffects.value ? artifactSoulEggBonus.value : 0,
          artifactProphecyEggBonus: includeArtifactEffects.value ? artifactProphecyEggBonus.value : 0,
        })
    );
    const farmerRoleAsConfigured = computed(() => earningBonusToFarmerRole(earningBonusAsConfigured.value));

    const targets = computed(() => {
      const currentRank = Math.floor(Math.log10(currentNakedEarningBonus.value));
      return [1, 2, 3, 4, 5, 6].map(i => soulPowerToFarmerRole(currentRank + i));
    });
    const selectedTarget = ref(targets.value[0]);
    const targetSoulPower = computed(() => selectedTarget.value.oom);
    const combosToReachTarget = computed((): Combo[] => {
      const currentPE = currentProphecyEggs.value;
      const currentSE = currentSoulEggs.value;
      const currentTE = currentTruthEggs.value;
      const soulFood = configuredSoulFoodLevel.value;
      const prophecyBonus = configuredProphecyBonusLevel.value;
      const targetEB = 10 ** targetSoulPower.value;
      const artifactSEBonus = includeArtifactEffects.value ? artifactSoulEggBonus.value : 0;
      const artifactPEBonus = includeArtifactEffects.value ? artifactProphecyEggBonus.value : 0;
      const combos = <Combo[]>[];
      let additionalPE = 0;
      while (true) {
        const additionalSE =
          targetEB /
            earningBonusPerSoulEgg({
              numProphecyEggs: currentPE + additionalPE,
              numTruthEggs: currentTE,
              soulFoodLevel: soulFood,
              prophecyBonusLevel: prophecyBonus,
              artifactSoulEggBonus: artifactSEBonus,
              artifactProphecyEggBonus: artifactPEBonus,
            }) -
          currentSE;
        if (additionalPE > 0 || additionalSE > 0) {
          combos.push({ prophecyEggs: additionalPE, soulEggs: Math.max(additionalSE, 0), truthEggs: currentTE });
        }
        if (additionalSE <= 0) {
          break;
        }
        additionalPE++;
      }
      return combos.reverse();
    });
    const showTotalRequired = ref(getLocalStorage(SHOW_TOTAL_REQUIRED_LOCALSTORAGE_KEY) === 'true');
    watch(showTotalRequired, () => setLocalStorage(SHOW_TOTAL_REQUIRED_LOCALSTORAGE_KEY, showTotalRequired.value));

    return {
      currentProphecyEggs,
      currentSoulEggs,
      currentTruthEggs,
      currentSoulFoodLevel,
      currentProphecyBonusLevel,
      currentNakedEarningBonus,
      currentNakedFarmerRole,
      maxSoulFoodLevel,
      maxProphecyBonusLevel,
      configuredSoulFoodLevel,
      configuredProphecyBonusLevel,
      configuredSoulFoodUpgradeCost,
      configuredProphecyBonusUpgradeCost,
      includeArtifactEffects,
      ownedBookIds,
      selectedBook,
      maxPossibleSlots,
      prophecyStones,
      ownedProphecyStoneCounts,
      selectedProphecyStoneCounts,
      soulStones,
      ownedSoulStoneCounts,
      selectedSoulStoneCounts,
      totalSelectedStones,
      earningBonusAsConfigured,
      farmerRoleAsConfigured,
      targets,
      selectedTarget,
      targetSoulPower,
      combosToReachTarget,
      showTotalRequired,
      formatEIValue,
      iconURL,
    };
  },
});

function earningBonusPerSoulEgg({
  numProphecyEggs,
  numTruthEggs,
  soulFoodLevel,
  prophecyBonusLevel,
  artifactSoulEggBonus,
  artifactProphecyEggBonus,
}: {
  numProphecyEggs: number;
  numTruthEggs: number;
  soulFoodLevel: number;
  prophecyBonusLevel: number;
  artifactSoulEggBonus: number;
  artifactProphecyEggBonus: number;
}): number {
  const teBonus = 1.01 ** numTruthEggs;
  const soulEggBonus = 0.1 + soulFoodLevel * 0.01 + artifactSoulEggBonus;
  const prophecyEggBonus = 0.05 + prophecyBonusLevel * 0.01 + artifactProphecyEggBonus;
  return soulEggBonus * (1 + prophecyEggBonus) ** numProphecyEggs * teBonus;
}
</script>
