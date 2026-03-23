<template>
  <div class="text-sm font-medium text-gray-500">
    <span class="mr-1.5">Expected Crafts Per Fuel Tank:</span>
  </div>

  <config-prompt />
  <loot-data-credit />

  <div v-for="m in t1LootDataByMission.slice(0, 10)" :key="m.missionId + m.target">
    <!-- Show target drop rate if user selected it or if target matches artifact -->
    <div>
      <mission-name :mission="m.mission" :target="m.target" />
    </div>

    <drop-rate :target="artifactProperties" :mission="m.mission" :level="m.mission.maxLevel" :total-crafts="m.expectedCrafts" :applicable-drops="m.applicableItems"
      :total-ships="m.sentShips" :not-enough-data="m.notEnoughData" :time-limited="m.timeLimited" :fuel-limited-ships="m.maxFuelShips" :hide-when-not-enough="true" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, isReactive, ref, toRefs } from 'vue';
import { StarIcon } from '@heroicons/vue/solid';

import {
  ei,
  getArtifactTierPropsFromId,
  getLocalStorage,
  getMissionTypeFromId,
  MissionType,
  getImageUrlFromId as id2url,
  afxMatchesTarget,
  fuelTankSizes,
  itemExpectedFullConsumption,
  MissionFuel
} from 'lib';
import { missionIds, missions, } from '@/lib/filter';

import { ItemMissionLootStore, getMissionLootData, getTierLootData, missionDataNotEnough, } from 'lib/loot';
import { config } from '@/store';
import { sum } from '@/utils';
import ConfigPrompt from '@/components/ConfigPrompt.vue';
import DropRate from '@/components/DropRate.vue';
import LootDataCredit from '@/components/LootDataCredit.vue';
import MissionName from '@/components/MissionName.vue';
import { Tier, Ingredient } from 'lib/artifacts/data-json';

const COLLAPSE_ARTIFACT_DROP_RATES_LOCALSTORAGE_KEY = 'expandArtifactDropRates';

export default defineComponent({
  components: {
    MissionName,
    ConfigPrompt,
    DropRate,
    LootDataCredit,
    StarIcon,
  },
  props: {
    artifactId: {
      type: String,
      required: true,
    },
    maxWaitTime_seconds: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const { artifactId, maxWaitTime_seconds } = toRefs(props);

    const artifactProperties = computed(() => getArtifactTierPropsFromId(artifactId.value));
    const isArtifact = computed(
      () => artifactProperties.value.afx_type === ei.ArtifactSpec.Type.ARTIFACT
    );
    const afxId = computed(() => artifactProperties.value.afx_id);

    const loot = computed(() => getTierLootData(artifactId.value, config.value));

    const recursiveIngredients = computed(() => {

      const ingredients = new Set() as Set<string>;

      if (artifactProperties.value.recipe) {
        const queue = [artifactProperties.value];
        while (queue.length > 0) {
          const item = queue.shift()!;

          if (item.recipe === null) {
            continue;
          }

          for (const ingredient of item.recipe.ingredients) {
            ingredients.add(ingredient.id);
            queue.push(getArtifactTierPropsFromId(ingredient.id));
          }
        }
      }

      const t1Ingredients = expandArtifactIngredients(
        artifactProperties.value,
      );
      return { ingredients: ingredients, tier1s: t1Ingredients, };
    });

    const t1LootDataByMission = computed(() => {
      const data = [];
      const localRecursiveIngredients = recursiveIngredients.value;

      for (const mission of missions) {
        try {
          const fuelUse = mission.virtueFuels;

          const nonHumilityFuelUse = fuelUse.filter(x => x.egg !== ei.Egg.HUMILITY);

          const totalFuelUse = nonHumilityFuelUse.reduce((agg, current) => agg + current.amount, 0);

          let maximumNumberOfShipsSent = Math.floor(3.0 * maxWaitTime_seconds.value / mission.boostedDurationSeconds(config.value));
          let numberOfShipsPerFullTank = Infinity;

          if (totalFuelUse > 0) {
            numberOfShipsPerFullTank = Math.floor(fuelTankSizes[fuelTankSizes.length - 1] / totalFuelUse);

            maximumNumberOfShipsSent = Math.min(maximumNumberOfShipsSent, numberOfShipsPerFullTank);
          }

          const missionData = getMissionLootData(mission.missionTypeId);
          const maxLevelMissionData = missionData.levels[missionData.levels.length - 1];
          const missionCapacity = getMissionTypeFromId(missionData.missionId).boostedCapacity(config.value);

          for (const target of maxLevelMissionData.targets) {
            const targettedMissionItems = target.items;

            const expectedT1Counts = new Map();

            let expectedApplicableItems = [];

            for (const item of targettedMissionItems) {


              if (!localRecursiveIngredients.ingredients.has(item.itemId)) {
                continue;
              }

              const expectedDrops = Math.floor( sum(item.counts) / target.totalDrops * missionCapacity * maximumNumberOfShipsSent);
              const itemData = getArtifactTierPropsFromId(item.itemId);
              expectedApplicableItems.push(
                {icon_filename: itemData.icon_filename,count: expectedDrops,} as Ingredient
              );

              const expandedT1Drops = expandArtifactIngredients(
                itemData,
                new Set(localRecursiveIngredients.ingredients.keys()),
                expectedDrops);

              for (const [key, value] of expandedT1Drops) {
                if (expectedT1Counts.has(key)) {
                  expectedT1Counts.set(key, expectedT1Counts.get(key) + value)
                }
                else {
                  expectedT1Counts.set(key, value)
                }
              }
            }

            let minCrafts = Infinity;

            for (let [component, requiredCount] of localRecursiveIngredients.tier1s.entries()) {
              if (expectedT1Counts.has(component)) {
                minCrafts = Math.min(minCrafts, Math.floor(expectedT1Counts.get(component) / requiredCount))

              } else {
                minCrafts = 0;
              }
            }

            data.push({
              missionId: mission.missionTypeId,
              mission: mission,
              target: target.targetAfxId,
              notEnoughData: missionDataNotEnough(mission, target.totalDrops),
              expectedArtifacts: expectedT1Counts,
              sentShips: maximumNumberOfShipsSent,
              timeLimited: numberOfShipsPerFullTank > maximumNumberOfShipsSent,
              expectedCrafts: minCrafts,
              applicableItems: expectedApplicableItems,
              maxFuelShips: numberOfShipsPerFullTank,
            });
          }

        }
        catch (e) {
          console.log(e);
        }

      }

      return data.sort((mission1, mission2) => mission2.expectedCrafts - mission1.expectedCrafts);
    });

    const filteredMissions = computed(() => {
      let filtered: ItemMissionLootStore[] = [];

      console.log(t1LootDataByMission.value);

      const baseMissions = loot.value.missions;

      // Filter by ship visibility
      return baseMissions.filter(x => config.value.shipVisibility[x.afxShip]);
    });
    const theMissions = computed(() =>


      filteredMissions.value.map(missionLoot => {
        const missionId = missionLoot.missionId;
        const mission = getMissionTypeFromId(missionId);
        let maxExpectedDropsPerDay = 0;
        let selectedExpectedDropsPerDay = 0;
        for (const levelLoot of missionLoot.levels) {
          const totalDrops = levelLoot.totalDrops;
          if (
            missionDataNotEnough(mission, totalDrops) ||
            mission.durationTypeName == 'Tutorial' ||
            !(targetIsSelected(missionLoot.targetAfxId) || afxMatchesTarget(afxId.value, missionLoot.targetAfxId))
          ) {
            continue;
          }
          const shipLevels = { ...config.value.shipLevels };
          shipLevels[mission.shipType] = levelLoot.level;
          const customConfig = {
            ...config.value,
            shipLevels,
          };
          const missionCapacity = mission.boostedCapacity(customConfig);
          const missionDurationDays = mission.boostedDurationSeconds(customConfig) / 86400;
          const itemTotalDrops = sum(levelLoot.counts);
          const expectedDropsPerMission = totalDrops > 0 ? (itemTotalDrops / totalDrops) * missionCapacity : 0;
          const expectedDropsPerDay = expectedDropsPerMission / missionDurationDays;
          if (expectedDropsPerDay > maxExpectedDropsPerDay) {
            maxExpectedDropsPerDay = expectedDropsPerDay;
          }
          if (levelIsSelected(mission, levelLoot.level)) {
            selectedExpectedDropsPerDay = expectedDropsPerDay;
          }
        }
        return {
          missionId,
          mission,
          loot: missionLoot,
          maxExpectedDropsPerDay,
          selectedExpectedDropsPerDay,
        };
      })
    );

    const sortedMissions = computed(() =>
      [...theMissions.value]
        .filter(m => showShip(m.mission, afxId.value, m.loot))
        .sort((m1, m2) => {
          // Missions with better expected drops per day come first.
          // Sort by drop rate of selected star levels if there is data, else use max expected drops
          const m2expected =
            m2.selectedExpectedDropsPerDay > 0 ? m2.selectedExpectedDropsPerDay : m2.maxExpectedDropsPerDay;
          const m1expected =
            m1.selectedExpectedDropsPerDay > 0 ? m1.selectedExpectedDropsPerDay : m1.maxExpectedDropsPerDay;
          let cmp = m2expected - m1expected;
          if (cmp !== 0) {
            return cmp;
          }
          cmp = m1.mission.shipType - m2.mission.shipType;
          if (cmp !== 0) {
            return cmp;
          }
          return m1.mission.durationType - m2.mission.durationType;
        })
    );
    const targetIsSelected = (artifact: ei.ArtifactSpec.Name) => config.value.targets[artifact];
    const levelIsSelected = (mission: MissionType, level: number) =>
      config.value.shipLevels[mission.shipType] === level;
    // show if not tutorial ship and (user selected the target or target matches selected arti) and there are any drops of it
    const showShip = (mission: MissionType, afxId: ei.ArtifactSpec.Name, missionLoot: ItemMissionLootStore) =>
      mission.durationTypeName != 'Tutorial' &&
      (targetIsSelected(missionLoot.targetAfxId) || afxMatchesTarget(afxId, missionLoot.targetAfxId)) &&
      missionLoot.levels.some(x => x.totalDrops > 0);
    return {
      ei,
      config,
      artifactProperties,
      isArtifact,
      afxMatchesTarget,
      afxId,
      loot,
      id2url,
      getMissionTypeFromId,
      sortedMissions,
      getArtifactTierPropsFromId,
      levelIsSelected,
      targetIsSelected,
      t1LootDataByMission,
    };
  },
});

function expandArtifactIngredients(item: Tier, applicableItems: Set<string> | undefined = undefined, expansionMultiplier: number = 1,): Map<string, number> {

  const items = new Map();

  if (item.afx_level === ei.ArtifactSpec.Level.INFERIOR && (applicableItems === undefined || applicableItems.has(item.id))) {
    items.set(item.id, expansionMultiplier);
    return items;
  }

  if (!item.recipe) {
    return items;
  }

  for (let ingredient of item.recipe.ingredients) {
    if (applicableItems !== undefined && !applicableItems.has(ingredient.id)) {
      continue;
    }

    const recursiveMap = expandArtifactIngredients(getArtifactTierPropsFromId(ingredient.id), applicableItems, expansionMultiplier * ingredient.count);
    for (let [key, value] of recursiveMap.entries()) {
      if (items.has(key)) {
        items.set(key, items.get(key) + value);
      }
      else {
        items.set(key, value);
      }
    }
  }

  return items;

}
</script>
