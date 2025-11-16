<template>
  <template v-if="mission">
    <div class="-mt-2">
      <div class="flex items-center justify-center text-sm">
        <span>{{ mission.shipName }}&nbsp;</span>
        <span :class="missionDurationTypeFgClass(mission)">{{ mission.durationTypeName }}</span>
      </div>
      <mission-star-levels :mission="completedMission || mission" class="justify-center my-1" />
      <div class="text-xs mt-2">
        <div class="grid gap-x-1 grid-cols-max-2 justify-center tabular-nums">
          <div class="text-right font-medium">Launched:</div>
          <div v-tippy="{ content: mission.launchTime?.fromNow() }">
            {{ mission.launchTime?.format('YYYY-MM-DD HH:mm:ss') }}
          </div>
          <div class="text-right font-medium">
            <template v-if="mission.returnTime?.isBefore(now())">Returned:</template>
            <template v-else>Returns:</template>
          </div>
          <div v-tippy="{ content: mission.returnTime?.fromNow() }">
            {{ mission.returnTime?.format('YYYY-MM-DD HH:mm:ss') }}
          </div>
        </div>
        <div class="grid gap-x-1 grid-cols-max-2 justify-center">
          <div class="text-right font-medium">Duration:</div>
          <div>{{ mission.durationDisplay }}</div>
          <div class="text-right font-medium">Capacity:</div>
          <div>{{ mission.capacity }}</div>
          <div class="text-right font-medium">Fuel:</div>
          <div>
            <img
              v-for="fuel in mission.isVirtue ? mission.virtueFuels : mission.fuels"
              :key="fuel.egg"
              v-tippy="{ content: `${fuel.amountDisplay} ${eggName(fuel.egg)}` }"
              class="inline h-4 w-4 align-text-top"
              :src="iconURL(fuel.eggIconPath, 64)"
            />
          </div>
          <div class="text-right font-medium mt-0.5">Sensor target:</div>
          <div
            class="text-center text-xs text-white rounded-full w-max px-1.5 py-0.5 mx-auto bg-gray-400 font-semibold"
          >
            {{ mission.sensorTarget || 'None' }}
          </div>
        </div>
      </div>
    </div>
  </template>

  <div v-if="completeMissionResponse && lootSections.length > 0" class="mt-3">
    <template v-for="[title, titleBgClass, items] in lootSections" :key="title">
      <div
        class="text-center text-xs text-white rounded-full w-max px-2 py-0.5 mx-auto mt-2 mb-1"
        :class="titleBgClass"
      >
        {{ title }} ({{ itemsCount(items) }})
      </div>
      <div class="sm:max-w-lg flex flex-wrap justify-center mx-auto">
        <div v-for="item in items" :key="item.key" class="border-box h-10 w-10 p-1">
          <tippy
            tag="a"
            :href="`/artifact-explorer/#/artifact/${item.tierProps.id}/`"
            target="_blank"
            class="relative block h-full w-full rounded-full"
            :class="artifactRarityBgClass(item.afxRarity) || 'bg-gray-200'"
          >
            <img :src="iconURL(`egginc/${item.tierProps.icon_filename}`, 128)" class="h-full w-full" />
            <div
              v-if="item.count > 1"
              class="absolute bottom-0 -right-1 h-3 w-3 ring-white ring-1 rounded-full bg-gray-400"
            >
              <img :src="numberBadgeURL(item.count)" class="h-3 w-3" />
            </div>

            <template #content>
              <div>
                <div class="font-medium space-x-1">
                  <img
                    :src="iconURL(`egginc/${item.tierProps.icon_filename}`, 128)"
                    class="inline h-4 w-4 relative -top-px"
                  />
                  <span>{{ item.tierProps.name }} (T{{ item.tierProps.tier_number }})</span>
                  <span v-if="item.afxRarity > 0" :class="artifactRarityFgClass(item.afxRarity)">
                    {{ item.effect?.rarity }}
                  </span>
                  <span>&times; {{ item.count }}</span>
                </div>
                <div v-if="item.effect">
                  <span class="text-green-300">{{ item.effect.effect_size }}</span>
                  {{ item.effect.effect_target }}
                </div>
                <div v-if="showDev">
                  Quality:
                  <span class="text-green-300">{{ item.tierProps.quality.toFixed(1) }}</span>
                </div>
              </div>
            </template>
          </tippy>
        </div>
      </div>
    </template>
    <div class="mt-2 text-xs text-gray-500 text-center">
      Hover mouse over an item to show details.<br />
      Click to open the relevant
      <a href="/artifact-explorer/" target="_blank" class="underline">artifact explorer</a>
      page.<br />
      Click / double click on mobile.
    </div>
  </div>
  <div v-else-if="loading" class="mt-3">
    <base-loading>
      <span class="text-sm -ml-1">Retrieving mission data...</span>
    </base-loading>
  </div>
  <div v-else-if="error" class="mt-3 text-center text-red-500 text-sm">Failed to retrieve mission data.</div>

  <div v-if="showDev && mission" class="mt-2">
    <div class="text-center text-xs font-medium my-2">Dev</div>
    <div class="text-xs">
      <div>
        <span class="font-medium">user_id:&nbsp;</span>
        <span class="cursor-pointer" @click="copyUserId"
          ><code>{{ userId }}</code></span
        >
      </div>
      <div class="truncate">
        <span class="font-medium">mission_id:&nbsp;</span>
        <span class="cursor-pointer" @click="copyMissionId"
          ><code>{{ missionId }}</code></span
        >
      </div>
    </div>
  </div>

  <!-- Dev mode is activated or deactivated by clicking on an invisible active
  area in the bottom right corner of the modal. -->
  <div class="absolute bottom-0 right-0 pb-2.5 pr-2.5">
    <div class="h-5 w-5" @click="showDev = !showDev"></div>
  </div>

  <button
    class="absolute left-0 top-1/2 transform -translate-y-1/2 pl-2 rounded-md text-gray-400 focus:outline-none z-10"
    :class="hasPrev ? 'hover:text-gray-500' : 'opacity-30 cursor-not-allowed'"
    :disabled="!hasPrev"
    @click="hasPrev && $emit('prev')"
  >
    <!-- Heroicon name: outline/chevron-left -->
    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
  </button>

  <button
    class="absolute right-0 top-1/2 transform -translate-y-1/2 pr-2 rounded-md text-gray-400 focus:outline-none z-10"
    :class="hasNext ? 'hover:text-gray-500' : 'opacity-30 cursor-not-allowed'"
    :disabled="!hasNext"
    @click="hasNext && $emit('next')"
  >
    <!-- Heroicon name: outline/chevron-right -->
    <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, Ref, ref, toRefs, watch } from 'vue';
import { Tippy } from 'vue-tippy';
import copyTextToClipboard from 'copy-text-to-clipboard';
import hotkeys from 'hotkeys-js';

import { eggName, ei, iconURL, Mission } from 'lib';
import { getCompletedMission, Loot, LootItem } from '@/lib';
import { artifactRarityBgClass, artifactRarityFgClass, missionDurationTypeFgClass } from '@/utils';
import BaseLoading from 'ui/components/BaseLoading.vue';
import MissionStarLevels from '@/components/MissionStarLevels.vue';

import Type = ei.ArtifactSpec.Type;
import { numberBadgeURL } from '@/badges';
import dayjs from 'dayjs';

export default defineComponent({
  components: {
    BaseLoading,
    MissionStarLevels,
    Tippy,
  },
  props: {
    userId: {
      type: String,
      required: true,
    },
    mission: {
      type: Object as PropType<Mission | null>,
      default: null,
    },
    hasPrev: {
      type: Boolean,
      default: false,
    },
    hasNext: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    prev: () => true,
    next: () => true,
  },
  setup(props, { emit }) {
    const { userId, mission, hasPrev, hasNext, active } = toRefs(props);
    const missionId = computed(() => mission.value?.id);
    const missionComplete = computed(() => mission.value?.statusIsComplete || false);

    const completeMissionResponse: Ref<ei.ICompleteMissionResponse | null> = ref(null);
    const loading = ref(false);
    const error: Ref<Error | null> = ref(null);

    const completedMission: Ref<Mission | null> = computed(() => {
      const m = completeMissionResponse.value?.info;
      return m ? new Mission(m) : null;
    });
    const lootItems: Ref<LootItem[]> = computed(() => {
      const m = completeMissionResponse.value;
      return m ? new Loot(m).itemsSortedByQuality : [];
    });
    const lootItemsByType = (type: Type) => lootItems.value.filter(it => it.tierProps.afx_type === type);
    const lootSections: Ref<[string, string, LootItem[]][]> = computed(() => {
      const sections: [string, string, LootItem[]][] = [
        ['Artifacts', 'bg-blue-500', lootItemsByType(Type.ARTIFACT)],
        ['Eggfinity stones', 'bg-fuchsia-500', lootItemsByType(Type.STONE)],
        ['Ingredients', 'bg-gray-500', lootItemsByType(Type.INGREDIENT)],
        ['Stone fragments', 'bg-gray-500', lootItemsByType(Type.STONE_INGREDIENT)],
      ];
      return sections.filter(([, , items]) => items.length > 0);
    });
    const itemsCount = (items: LootItem[]) => items.reduce((sum, item) => sum + item.count, 0);

    const retrieveCompleteMissionResponse = async () => {
      completeMissionResponse.value = null;
      error.value = null;
      if (missionId.value && missionComplete.value) {
        loading.value = true;
        const uid = userId.value;
        const mid = missionId.value;
        let response;
        try {
          response = await getCompletedMission(uid, mid);
          loading.value = false;
        } catch (err) {
          console.error(err);
          loading.value = false;
          error.value = err instanceof Error ? err : new Error(`${err}`);
          return;
        }
        if (userId.value === uid && missionId.value === mid) {
          // Props didn't get updated while the request was in progress.
          completeMissionResponse.value = response;
        }
      }
    };
    watch(
      [userId, missionId],
      async () => {
        await retrieveCompleteMissionResponse();
      },
      {
        immediate: true,
      }
    );

    watch(
      active,
      () => {
        if (active.value) {
          hotkeys('left', () => hasPrev.value && emit('prev'));
          hotkeys('right', () => hasNext.value && emit('next'));
        } else {
          hotkeys.unbind('left');
          hotkeys.unbind('right');
        }
      },
      {
        immediate: true,
      }
    );

    const showDev = ref(false);
    const copyUserId = () => {
      copyTextToClipboard(userId.value);
    };
    const copyMissionId = () => {
      if (missionId.value) {
        copyTextToClipboard(missionId.value);
      }
    };

    return {
      missionId,
      missionComplete,
      completeMissionResponse,
      loading,
      error,
      completedMission,
      lootSections,
      eggName,
      itemsCount,
      missionDurationTypeFgClass,
      artifactRarityFgClass,
      artifactRarityBgClass,
      iconURL,
      numberBadgeURL,
      showDev,
      copyUserId,
      copyMissionId,
      now: () => dayjs(),
    };
  },
});
</script>
