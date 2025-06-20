<template>
  <div class="flex flex-col h-screen">
    <div class="flex-grow overflow-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="divide-y">
          <tr class="divide-x">
            <th
              scope="col"
              rowspan="2"
              class="sticky top-0 z-10 sm:left-0 px-4 py-1 text-left text-xs font-medium text-gray-500 bg-gray-50"
            >
              <div class="flex items-center justify-center cursor-pointer" @click="toggleSort(SortBy.Item)">
                Item<sort-arrow :direction="sortButtonDirection(SortBy.Item)" />
              </div>
            </th>

            <th
              scope="col"
              rowspan="2"
              class="sticky top-0 px-4 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50"
            >
              <div class="flex items-center justify-center cursor-pointer" @click="toggleSort(SortBy.Tier)">
                Tier<sort-arrow :direction="sortButtonDirection(SortBy.Tier)" />
              </div>
            </th>

            <th
              scope="col"
              rowspan="2"
              class="sticky top-0 px-4 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50"
            >
              <div class="flex items-center justify-center cursor-pointer" @click="toggleSort(SortBy.Quality)">
                Base quality<sort-arrow :direction="sortButtonDirection(SortBy.Quality)" />
              </div>
            </th>

            <th
              scope="col"
              rowspan="2"
              class="sticky top-0 px-4 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50"
            >
              <div class="flex items-center justify-center cursor-pointer" @click="toggleSort(SortBy.OddsMultiplier)">
                Odds multiplier<sort-arrow :direction="sortButtonDirection(SortBy.OddsMultiplier)" />
              </div>
            </th>

            <th
              v-for="ship in ships"
              :key="ship"
              v-tippy="{
                content: `
                  <div>
                    <img data-src='${iconURL(shipIconPath(ship), 256)}' class='h-16 w-16 mx-auto'>
                    <div class='text-center'>${shipName(ship)}<div>
                  </div>`,
                allowHTML: true,
              }"
              scope="col"
              colspan="3"
              class="sticky top-0 px-4 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50"
            >
              {{ shipAbbrevName(ship) }}
            </th>

            <th
              scope="col"
              rowspan="2"
              class="sticky top-0 px-4 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50"
              @click="toggleSort(SortBy.Value)"
            >
              <div class="flex items-center justify-center cursor-pointer">
                Value<sort-arrow :direction="sortButtonDirection(SortBy.Value)" />
              </div>
            </th>

            <th
              scope="col"
              colspan="4"
              class="sticky top-0 px-4 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50 cursor-pointer"
              @click="toggleSort(SortBy.CraftingPrice)"
            >
              <div class="flex items-center justify-center">
                Crafting price<sort-arrow :direction="sortButtonDirection(SortBy.CraftingPrice)" />
              </div>
            </th>
          </tr>

          <tr class="divide-x">
            <th
              v-for="mission in missions"
              :key="mission.missionTypeId"
              v-tippy="{
                content:
                  `${mission.name}, ` +
                  `${mission.params.minQuality.toFixed(1)} - ${mission.maxBoostedMaxQuality().toFixed(1)}`,
              }"
              class="sticky top-6 px-2 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 cursor-pointer"
            >
              <router-link :to="{ name: 'mission', params: { missionId: mission.missionTypeId } }">
                {{ missionAbbrevType(mission) }}
              </router-link>
            </th>

            <th class="sticky top-6 px-2 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50 border">Base</th>

            <th
              class="sticky top-6 px-2 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200"
            >
              Low
            </th>
            <th class="sticky top-6 px-2 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50 border">
              Domain
            </th>

            <th
              class="sticky top-6 px-2 py-1 text-center text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200"
            >
              Curve
            </th>
          </tr>
        </thead>

        <tbody class="divide-y">
          <tr v-for="artifact in sortedArtifacts" :key="`${artifact.id}:${artifact.rarity}`" class="divide-x">
            <td class="sm:sticky left-0 px-4 py-1 whitespace-nowrap text-sm text-gray-500 bg-white">
              <artifact-name :artifact="artifact" />
            </td>

            <td class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500">
              {{ artifact.tier_number }}
            </td>

            <td class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500">
              {{ artifact.params.baseQuality }}
            </td>

            <td class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500">
              {{ formatSmallFloat(artifact.params.oddsMultiplier) }}
            </td>

            <template v-for="(mission, i) in missions" :key="i">
              <td
                v-if="
                  artifact.params.baseQuality >= mission.params.minQuality &&
                  artifact.params.baseQuality <= mission.maxBoostedMaxQuality()
                "
                v-tippy="{
                  content: `${mission.name}<br>${artifact.name}, ${artifact.rarity}`,
                  allowHTML: true,
                }"
                class="px-2 py-1 whitespace-nowrap text-center text-sm text-gray-500 bg-green-300"
              >
                &check;
              </td>
              <td
                v-else
                v-tippy="{
                  content: `${mission.name}<br>${artifact.name}, ${artifact.rarity}`,
                  allowHTML: true,
                }"
                class="px-2 py-1 whitespace-nowrap text-center text-sm bg-gray-300"
              ></td>
            </template>

            <td class="px-4 py-1 whitespace-nowrap text-center text-sm text-gray-500">
              {{ artifact.params.value.toFixed(1) }}
            </td>

            <td
              class="px-4 py-1 whitespace-nowrap text-center text-sm"
              :class="[craftable(artifact) ? 'text-gray-500' : 'text-gray-300']"
            >
              {{ artifact.params.craftingPrice.toFixed(2) }}
            </td>

            <td
              class="px-4 py-1 whitespace-nowrap text-center text-sm"
              :class="[craftable(artifact) ? 'text-gray-500' : 'text-gray-300']"
            >
              {{ artifact.params.craftingPriceLow.toFixed(2) }}
            </td>

            <td
              class="px-4 py-1 whitespace-nowrap text-center text-sm"
              :class="[craftable(artifact) ? 'text-gray-500' : 'text-gray-300']"
            >
              {{ artifact.params.craftingPriceDomain }}
            </td>

            <td
              class="px-4 py-1 whitespace-nowrap text-center text-sm"
              :class="[craftable(artifact) ? 'text-gray-500' : 'text-gray-300']"
            >
              {{ artifact.params.craftingPriceCurve }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';

import {
  ei,
  iconURL,
  MissionType,
  spaceshipIconPath as shipIconPath,
  spaceshipList as ships,
  spaceshipName as shipName,
} from 'lib';
import Spaceship = ei.MissionInfo.Spaceship;
import DurationType = ei.MissionInfo.DurationType;
import Rarity = ei.ArtifactSpec.Rarity;
import { artifacts, cmpArtifacts, missions } from '@/lib';
import { SortDirection } from '@/types';

import ArtifactName from '@/components/ArtifactName.vue';
import SortArrow from '@/components/SortArrow.vue';

enum SortBy {
  Item,
  Tier,
  Quality,
  OddsMultiplier,
  Value,
  CraftingPrice,
}

export default defineComponent({
  components: {
    ArtifactName,
    SortArrow,
  },
  setup() {
    const sortBy = ref(SortBy.Quality);
    const sortAscending = ref(true);
    const toggleSort = (criterion: SortBy) => {
      if (sortBy.value === criterion) {
        sortAscending.value = !sortAscending.value;
      } else {
        sortBy.value = criterion;
        sortAscending.value = true;
      }
    };
    const sortButtonDirection = (criterion: SortBy): SortDirection => {
      if (sortBy.value === criterion) {
        return sortAscending.value ? SortDirection.Ascending : SortDirection.Descending;
      }
      return SortDirection.Unsorted;
    };
    const sortedArtifacts = computed(() =>
      [...artifacts].sort((a1, a2) => {
        let cmp = 0;
        switch (sortBy.value) {
          case SortBy.Item:
            cmp = cmpArtifacts(a1, a2);
            break;
          case SortBy.Tier:
            cmp = a1.tier_number - a2.tier_number;
            break;
          case SortBy.Quality:
            break;
          case SortBy.OddsMultiplier:
            cmp = a1.params.oddsMultiplier - a2.params.oddsMultiplier;
            break;
          case SortBy.Value:
            cmp = a1.params.value - a2.params.value;
            break;
          case SortBy.CraftingPrice:
            cmp = a1.params.craftingPrice - a2.params.craftingPrice;
            break;
          default: {
            const unreachable: never = sortBy.value;
            throw new Error(`unhandled sortBy: ${unreachable}`);
          }
        }
        // Quality is always used as tie breaker.
        if (cmp === 0) {
          cmp = a1.params.baseQuality - a2.params.baseQuality;
        }
        return sortAscending.value ? cmp : -cmp;
      })
    );
    const craftable = (artifact: (typeof artifacts)[number]) =>
      artifact.craftable && artifact.afx_rarity === Rarity.COMMON;
    return {
      ships,
      missions,
      sortedArtifacts,
      SortBy,
      sortButtonDirection,
      toggleSort,
      craftable,
      shipName,
      shipAbbrevName,
      shipIconPath,
      missionAbbrevType,
      iconURL,
      formatSmallFloat,
    };
  },
});

function shipAbbrevName(ship: Spaceship): string {
  switch (ship) {
    case Spaceship.CHICKEN_ONE:
      return 'C1';
    case Spaceship.CHICKEN_NINE:
      return 'C9';
    case Spaceship.CHICKEN_HEAVY:
      return 'CH';
    case Spaceship.BCR:
      return 'BCR';
    case Spaceship.MILLENIUM_CHICKEN:
      return 'QC';
    case Spaceship.CORELLIHEN_CORVETTE:
      return 'CHC';
    case Spaceship.GALEGGTICA:
      return 'G';
    case Spaceship.CHICKFIANT:
      return 'D';
    case Spaceship.VOYEGGER:
      return 'V';
    case Spaceship.HENERPRISE:
      return 'H';
    case Spaceship.ATREGGIES:
      return 'A';
  }
}

function missionAbbrevType(mission: MissionType): string {
  switch (mission.durationType) {
    case DurationType.SHORT:
      return 'SH';
    case DurationType.LONG:
      return 'ST';
    case DurationType.EPIC:
      return 'EX';
  }
  return '';
}

function formatSmallFloat(x: number): string {
  if (x === 0) {
    return '0';
  }
  if (x >= 1) {
    const s = x.toFixed(2);
    return s.replace(/\.?0+$/, '');
  }
  const s = x.toPrecision(2);
  return s.replace(/0+$/, '');
}
</script>
