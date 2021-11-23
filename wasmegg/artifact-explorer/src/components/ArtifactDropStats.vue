<template>
  <template v-if="sortedMissions.length > 0">
    <div class="text-sm font-medium text-gray-500">
      <span class="mr-1.5">Available from the following missions:</span>
      <button class="font-normal underline" @click="expand = !expand">
        <template v-if="expand">Collapse</template><template v-else>Expand</template>
      </button>
    </div>

    <template v-if="expand">
      <config-prompt />
      <loot-data-credit />

      <div v-for="m in sortedMissions" :key="m.missionId">
        <div>
          <mission-name :mission="m.mission" />
        </div>
        <ul class="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3 mt-1">
          <li v-for="levelLoot in m.loot.levels" :key="levelLoot.level" class="text-sm">
            <span
              class="inline-flex items-center tabular-nums"
              :class="levelIsSelected(m.mission, levelLoot.level) ? 'text-green-700' : null"
              >{{ levelLoot.level }}<star-icon class="h-4 w-4 text-yellow-400" />:</span
            >&nbsp;
            <drop-rate
              :mission="m.mission"
              :level="levelLoot.level"
              :total-drops="levelLoot.totalDrops"
              :item-drops="levelLoot.counts"
              :is-artifact="isArtifact"
              :highlight="levelIsSelected(m.mission, levelLoot.level)"
            />
          </li>
        </ul>
      </div>
    </template>
  </template>
  <div v-else class="text-sm font-medium text-gray-500">Not available from missions :(</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRefs } from 'vue';
import { StarIcon } from '@heroicons/vue/solid';

import {
  ei,
  getArtifactTierPropsFromId,
  getLocalStorage,
  getMissionTypeFromId,
  MissionType,
} from 'lib';
import { getTierLootData, missionDataNotEnough } from '@/lib';
import { config } from '@/store';
import { sum } from '@/utils';
import ConfigPrompt from '@/components/ConfigPrompt.vue';
import DropRate from '@/components/DropRate.vue';
import LootDataCredit from '@/components/LootDataCredit.vue';
import MissionName from '@/components/MissionName.vue';

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
  },
  setup(props) {
    const { artifactId } = toRefs(props);
    const isArtifact = computed(
      () => getArtifactTierPropsFromId(artifactId.value).afx_type === ei.ArtifactSpec.Type.ARTIFACT
    );
    const expand = ref(getLocalStorage(COLLAPSE_ARTIFACT_DROP_RATES_LOCALSTORAGE_KEY) !== 'true');
    const loot = computed(() => getTierLootData(artifactId.value));
    const missions = computed(() =>
      loot.value.missions.map(missionLoot => {
        const missionId = missionLoot.missionId;
        const mission = getMissionTypeFromId(missionId);
        let maxExpectedDropsPerDay = 0;
        for (const levelLoot of missionLoot.levels) {
          const totalDrops = levelLoot.totalDrops;
          if (missionDataNotEnough(mission, totalDrops)) {
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
          const expectedDropsPerMission =
            totalDrops > 0 ? (itemTotalDrops / totalDrops) * missionCapacity : 0;
          const expectedDropsPerDay = expectedDropsPerMission / missionDurationDays;
          if (expectedDropsPerDay > maxExpectedDropsPerDay) {
            maxExpectedDropsPerDay = expectedDropsPerDay;
          }
        }
        return {
          missionId,
          mission,
          loot: missionLoot,
          maxExpectedDropsPerDay,
        };
      })
    );
    const sortedMissions = computed(() =>
      [...missions.value].sort((m1, m2) => {
        // Missions with better expected drops per day come first.
        let cmp = m2.maxExpectedDropsPerDay - m1.maxExpectedDropsPerDay;
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
    const levelIsSelected = (mission: MissionType, level: number) =>
      config.value.shipLevels[mission.shipType] === level;
    return {
      isArtifact,
      expand,
      loot,
      getMissionTypeFromId,
      sortedMissions,
      levelIsSelected,
    };
  },
});
</script>
