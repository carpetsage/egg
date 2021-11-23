<template>
  <div class="-mx-4 sm:mx-0 bg-gray-50 overflow-hidden sm:rounded-lg sm:shadow-md">
    <div class="bg-gray-100 px-4 py-4 border-b border-gray-200 sm:px-6">
      <div class="-ml-4 -mt-2 flex items-center justify-between flex-wrap sm:flex-nowrap">
        <div class="ml-4 mt-2 flex flex-wrap items-center space-x-1">
          <mission-name :mission="mission" :no-link="true" />
          <div
            v-tippy="{
              content:
                `FTL Drive Upgrades: <span class='text-green-200'>${config.epicResearchFTLLevel}/25</span><br>` +
                `Zero-g Quantum Containment: <span class='text-green-200'>${config.epicResearchZerogLevel}/10</span>`,
              allowHTML: true,
            }"
            class="inline-flex items-center text-sm"
          >
            ({{ configuredLevel }}<star-icon class="h-4 w-4 text-yellow-400" />,
            {{ mission.boostedCapacity(config) }} capacity,
            {{ mission.boostedDurationDisplay(config) }})
          </div>
        </div>
        <div class="ml-4 mt-2 flex-shrink-0">
          <share :id="mission.missionTypeId" />
        </div>
      </div>
    </div>

    <div class="px-4 py-4 sm:px-6 space-y-2">
      <config-prompt />
      <loot-data-credit />

      <div>
        <div class="flex sm:hidden items-center space-x-1.5">
          <select
            class="block focus:ring-green-500 focus:border-green-500 border-gray-300 rounded-md py-0.5 text-sm"
            :value="selectedLevel"
            @input="selectLevel"
          >
            <option v-for="levelLoot in loot.levels" :key="levelLoot.level">
              {{ levelLoot.level }}
            </option>
          </select>
          <star-icon class="h-5 w-5 text-yellow-400" />
        </div>
        <div class="hidden sm:block">
          <div class="border-b border-gray-200">
            <nav class="-mb-px flex space-x-2">
              <div
                v-for="levelLoot in loot.levels"
                :key="levelLoot.level"
                :class="[
                  levelLoot.level === selectedLevel
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer',
                  'group inline-flex items-center py-1 px-1 border-b-2 font-medium text-sm',
                ]"
                @click="selectedLevel = levelLoot.level"
              >
                {{ levelLoot.level }}<star-icon class="h-4 w-4 text-yellow-400" />
              </div>
            </nav>
          </div>
        </div>
      </div>

      <div class="flex rounded-md">
        <span
          class="inline-flex items-center text-xs px-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-500"
        >
          Sort by
        </span>
        <select
          v-model="sortBy"
          class="text-xs pr-8 py-1 rounded-none rounded-r-md text-gray-500 bg-white border-gray-300 focus:outline-none focus:ring-0 focus:ring-gray-300 focus:border-gray-300"
        >
          <option :value="ItemsSortBy.Family">Family</option>
          <option :value="ItemsSortBy.Quality">Quality</option>
          <option :value="ItemsSortBy.DropRate">Drop rate</option>
        </select>
      </div>

      <p v-if="tooLittleDataForSelectedLevel" class="text-xs text-gray-500">
        Too little data has been collected for this level; highly inaccurate drop rate estimates are
        not shown. Please consider
        <a
          href="https://ei.mikit.app/contribute_data"
          target="_blank"
          class="text-gray-500 hover:text-gray-700 underline"
          >contributing yours</a
        >.
      </p>

      <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
        <li
          v-for="itemLoot in sortedItemsLoot"
          :key="itemLoot.itemId"
          class="flex flex-wrap items-start text-sm"
        >
          <artifact-name
            class="w-full xs:w-auto xs:mr-1.5"
            :artifact="getArtifactTierPropsFromId(itemLoot.itemId)"
            :show-tier="true"
            :limit-width="true"
          />
          <drop-rate
            class="text-green-700 ml-5 xs:ml-auto"
            :mission="mission"
            :level="selectedLevel"
            :total-drops="selectedLevelLoot.totalDrops"
            :item-drops="itemLoot.counts"
            :is-artifact="artifactItemIds.includes(itemLoot.itemId)"
            :hide-when-not-enough="true"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRefs, watch } from 'vue';
import { StarIcon } from '@heroicons/vue/solid';

import {
  allPossibleTiers,
  ei,
  getArtifactTierPropsFromId,
  getLocalStorage,
  getMissionTypeFromId,
  setLocalStorage,
} from 'lib';
import { cmpArtifactTiers, getMissionLootData, missionDataNotEnough } from '@/lib';
import { config } from '@/store';
import { sum } from '@/utils';
import ArtifactName from '@/components/ArtifactName.vue';
import ConfigPrompt from '@/components/ConfigPrompt.vue';
import DropRate from '@/components/DropRate.vue';
import LootDataCredit from '@/components/LootDataCredit.vue';
import MissionName from '@/components/MissionName.vue';
import Share from '@/components/Share.vue';

enum ItemsSortBy {
  Family = 'family',
  Quality = 'quality',
  DropRate = 'dropRate',
}

const MISSION_ITEMS_SORT_BY_LOCALSTORAGE_KEY = 'missionItemsSortBy';

function isItemsSortyBy(s: string): s is ItemsSortBy {
  return Object.values(ItemsSortBy).includes(s as ItemsSortBy);
}

function loadItemsSortBy(): ItemsSortBy {
  const s = getLocalStorage(MISSION_ITEMS_SORT_BY_LOCALSTORAGE_KEY);
  if (!s || !isItemsSortyBy(s)) {
    return ItemsSortBy.Family;
  }
  return s;
}

// List of item ids of artifacts only, excluding stones and ingredients.
const artifactItemIds = allPossibleTiers
  .filter(t => t.afx_type === ei.ArtifactSpec.Type.ARTIFACT)
  .map(t => t.id);

export default defineComponent({
  components: {
    ArtifactName,
    ConfigPrompt,
    DropRate,
    LootDataCredit,
    MissionName,
    Share,
    StarIcon,
  },
  props: {
    missionId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { missionId } = toRefs(props);
    const mission = computed(() => getMissionTypeFromId(missionId.value));
    const configuredLevel = computed(() => config.value.shipLevels[mission.value.shipType]);
    const selectedLevel = ref(configuredLevel.value);
    watch(configuredLevel, (current, prev) => {
      if (selectedLevel.value === prev) {
        selectedLevel.value = current;
      }
    });
    const sortBy = ref(loadItemsSortBy());
    watch(sortBy, () => {
      setLocalStorage(MISSION_ITEMS_SORT_BY_LOCALSTORAGE_KEY, sortBy.value);
    });
    const loot = computed(() => getMissionLootData(missionId.value));
    const selectedLevelLoot = computed(() => loot.value.levels[selectedLevel.value]);
    const tooLittleDataForSelectedLevel = computed(() =>
      missionDataNotEnough(mission.value, selectedLevelLoot.value.totalDrops)
    );
    const selectLevel = (event: Event) => {
      selectedLevel.value = parseInt((event.target! as HTMLSelectElement).value);
    };
    const sortedItemsLoot = computed(() =>
      [...selectedLevelLoot.value.items].sort((i1, i2) => {
        const item1 = getArtifactTierPropsFromId(i1.itemId);
        const item2 = getArtifactTierPropsFromId(i2.itemId);
        let cmp = 0;
        switch (sortBy.value) {
          case ItemsSortBy.Quality:
            cmp = item1.quality - item2.quality;
            break;
          case ItemsSortBy.DropRate:
            // Higher drop rates first.
            cmp = sum(i2.counts) - sum(i1.counts);
            break;
        }
        if (cmp !== 0) {
          return cmp;
        }
        return cmpArtifactTiers(item1, item2);
      })
    );
    return {
      mission,
      configuredLevel,
      selectedLevel,
      ItemsSortBy,
      sortBy,
      loot,
      selectedLevelLoot,
      tooLittleDataForSelectedLevel,
      selectLevel,
      sortedItemsLoot,
      config,
      getArtifactTierPropsFromId,
      artifactItemIds,
    };
  },
});
</script>
