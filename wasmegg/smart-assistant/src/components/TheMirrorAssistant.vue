<template>
  <div class="px-4 py-3 rounded-md text-yellow-700 bg-yellow-100 mb-4">
    <h2 class="text-sm font-medium underline mb-1">Important notes</h2>
    <ol class="list-decimal list-inside text-xs space-y-1">
      <li>
        This tool suggests optimal loadouts <span class="underline">during</span> mirroring sessions, but it is equally
        important to try to
        <span class="underline"
          >maximize your boost durations with Dilithium stones before activating boosts and switching to a mirroring
          set</span
        >. Dilithium stone setups are left out of the suggestions because optimization is rather obvious:
        <span class="underline">use as many of your best stones as possible</span>. However, in some cases there may be
        a conflict between using your best stone holders for the prestige set or for dilithium stones, and the superior
        combination ultimately depends on execution and cannot be optimized theoretically. This is a limitation to keep
        in mind.
      </li>
    </ol>
  </div>

  <div class="max-w-xs mx-auto px-3 sm:px-4 py-2 text-center bg-gray-50 rounded-xl shadow mb-4">
    <div class="flex items-center justify-center space-x-1 mx-4">
      <img
        :src="iconURL(hasProPermit ? 'egginc/pro_permit.png' : 'egginc/free_permit.png', 128)"
        class="h-4 flex-shrink-0"
      />
      <span class="font-serif truncate">{{ backup.userName }}</span>
    </div>
    <div class="flex flex-wrap items-center justify-center">
      <span class="flex whitespace-nowrap mr-1">
        <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="inline h-5 w-5" />
        <span class="text-sm text-yellow-500">{{ prophecyEggs }}</span>
      </span>
      <span class="flex whitespace-nowrap">
        <img :src="iconURL('egginc/egg_soul.png', 64)" class="inline h-5 w-5" />
        <span class="text-sm text-purple-500">{{ formatEIValue(soulEggs) }}</span>
      </span>
    </div>
    <div class="flex items-center justify-center text-sm space-x-0.5 -my-px">
      <span :style="{ color: nakedRole.color }">{{ formatEIValue(nakedEarningBonus * 100) }}%,</span>
      <span :style="{ color: nakedRole.color }">{{ nakedRole.name }}</span>
      <base-info
        v-tippy="{
          content:
            'This is the ‘naked’ earning bonus without artifacts. The label after the EB is the corresponding role used in the Egg, Inc. Discord server.',
        }"
      />
    </div>
    <div>
      <a
        :href="`/rockets-tracker/?playerId=${playerId}`"
        target="_blank"
        class="mt-0.5 block text-xs text-blue-500 hover:text-blue-600 underline"
        >View artifact collection progress and more on Rockets tracker</a
      >
    </div>
  </div>

  <div class="mb-4">
    <div class="text-center text-sm font-medium mb-2">Currently equipped on home farm</div>
    <div v-if="homeFarmIsEnlightenment" class="px-4 py-2 rounded-md text-sm text-green-700 bg-green-100 mb-2">
      You are on the enlightenment farm. If you are attempting an enlightenment trophy, check out
      <a href="/enlightenment/" target="_blank" class="text-green-800 underline">Enlightenment companion</a>
      instead for stats and suggestions.
    </div>
    <artifact-gallery :artifact-set="currentlyEquipped" :farm="homeFarm" />
  </div>

  <div class="my-6 bg-blue-100 p-4 rounded-lg shadow-inner">
    <div class="text-center text-sm font-medium mb-2">Artifacts to exclude from recommendations</div>
    <div class="text-xs mb-3 space-y-1">
      <p>
        You may want to exclude certain artifacts from recommendations, e.g. because you are already using a 3-slot
        legendary as a dilithium stone holder. Configure the exclusions here. All instances of a selected item will be
        excluded, and if the excluded artifact(s) have slotted stones, those will be excluded as well. Your unbound
        stones are not affected.
      </p>
    </div>
    <items-select v-model="itemsToExclude" />
  </div>
  <!-- <div v-if="showProPermitRecommendations" class="relative flex items-start mb-1">
    <div class="flex items-center h-5">
      <input
        id="only-show-lunarstige"
        v-model="onlyLunar"
        name="only-show-lunarstige"
        type="checkbox"
        class="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
      />
    </div>
    <label class="ml-2 text-sm" for="only-show-lunarstige"> Only show lunar-stige </label>
  </div> -->

  <div v-if="!hasProPermit" class="mb-4">
    <div v-if="suggestedForStandardMirror">
      <div class="text-center text-sm font-medium mb-2">Recommended setup for preloaded single-prestige</div>
      <div class="text-xs mb-2 space-y-1">
        <p>
          <strong>Preloaded single-prestige</strong> is a strategy where you pre-fill all habs with tachyon prism and
          boost beacon while leaving a little hab space for running chicken bonus, then run a single 10min set of 50x
          bird feed and 500x soul beacon to reap soul eggs.
        </p>
        <discord-strategy-link />
      </div>
      <artifact-gallery
        :strategy="PrestigeStrategy.STANDARD_PERMIT_SINGLE_PRELOAD"
        :artifact-set="suggestedForStandardMirror.artifactSet"
        :artifact-assembly-statuses="suggestedForStandardMirror.assemblyStatuses"
        :reference-set="currentlyEquipped"
        :is-enlightenment="false"
        :farm="homeFarm"
        :bird-feed-active="true"
        :soul-beacon-active="false"
      />
      <div class="mt-0.5 text-center text-xs text-gray-500">
        The optimized stat is &ldquo;<strong>SE gain</strong>&rdquo; in the sandbox.
      </div>
    </div>

    <div
      v-if="!showProPermitRecommendations"
      class="text-center text-sm my-4 text-pink-500 hover:text-pink-600 underline cursor-pointer"
      @click="showProPermitRecommendations = true"
    >
      Click to show recommendations for Pro Permit (in case you plan to upgrade)
    </div>
  </div>

  <div v-if="showProPermitRecommendations" class="space-y-3">
    <div class="text-center text-sm font-medium mb-2">
      Recommended setup for multi-prestige and all-in-one single-prestige
      <template v-if="!hasProPermit">
        <br />
        <span class="text-xs text-red-500">Requires Pro Permit</span>
      </template>
    </div>
    <artifact-gallery
      :strategy="PrestigeStrategy.PRO_PERMIT_MIRROR"
      :artifact-set="suggestedForProPermitMirror.artifactSet"
      :artifact-assembly-statuses="suggestedForProPermitMirror.assemblyStatuses"
      :reference-set="currentlyEquipped"
      :farm="homeFarm"
      :is-enlightenment="false"
      :bird-feed-active="true"
      :soul-beacon-active="true"
      :tachyon-prism-active="true"
      :boost-beacon-active="true"
    />
    <div>
      <div class="text-center text-sm font-medium mb-2">
        Recommended setup for Lunar mirror
        <template v-if="!hasProPermit">
          <br />
          <span class="text-xs text-red-500">Requires Pro Permit</span>
        </template>
      </div>
      <artifact-gallery
        :strategy="PrestigeStrategy.PRO_PERMIT_LUNAR_MIRROR"
        :artifact-set="suggestedForProPermitLunarMirror?.artifactSet"
        :artifact-assembly-statuses="suggestedForProPermitLunarMirror.assemblyStatuses"
        :reference-set="currentlyEquipped"
        :farm="homeFarm"
        :is-enlightenment="false"
        :bird-feed-active="true"
        :soul-beacon-active="true"
        :boost-beacon-active="true"
        :modifiers="modifiers"
      />
    </div>
  </div>

  <earning-bonus-planner :backup="backup" />
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';

import {
  AllModifiersFromCollegtibles,
  ArtifactSet,
  earningBonusToFarmerRole,
  ei,
  Farm,
  formatEIValue,
  getLocalStorage,
  getNakedEarningBonus,
  getNumProphecyEggs,
  getNumSoulEggs,
  iconURL,
  requestFirstContact,
  setLocalStorage,
  UserBackupEmptyError,
} from 'lib';

import { PrestigeStrategy, suggestArtifactSet } from '@/lib';
import BaseInfo from 'ui/components/BaseInfo.vue';
import ArtifactGallery from '@/components/ArtifactGallery.vue';
import DiscordStrategyLink from '@/components/DiscordStrategyLink.vue';
import EarningBonusPlanner from '@/components/EarningBonusPlanner.vue';
import ItemsSelect from '@/components/ItemsSelect.vue';
import { isListOfItemIds, ItemSelectSpec } from '@/lib/select';
import { notNull } from '@/lib/utils';

const EXCLUDED_ITEM_IDS_LOCALSTORAGE_KEY = 'excludedItemIds';
const SHOW_ONLY_LUNAR_LOCALSTORAGE_KEY = 'onlyShowLunarstige';

export default defineComponent({
  components: {
    ArtifactGallery,
    BaseInfo,
    DiscordStrategyLink,
    EarningBonusPlanner,
    ItemsSelect,
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
  },
  // This async component does not respond to playerId changes.

  async setup({ playerId }) {
    const itemsToExclude = ref<ItemSelectSpec[]>(loadItemsToExclude());
    const itemIdsToExclude = computed(() => itemsToExclude.value.map(entry => entry.id).filter(notNull));
    watch(itemIdsToExclude, val => {
      setLocalStorage(EXCLUDED_ITEM_IDS_LOCALSTORAGE_KEY, JSON.stringify(val));
    });
    const data: ei.IEggIncFirstContactResponse = await requestFirstContact(playerId);
    if (!data.backup || !data.backup.game) {
      throw new UserBackupEmptyError(playerId);
    }
    const backup = data.backup;
    if (!backup.farms || backup.farms.length === 0) {
      throw new Error(`${backup.eiUserId}: no farm info in backup`);
    }
    if (!backup.artifactsDb) {
      throw new Error(`${playerId}: no artifacts database in backup`);
    }
    const modifiers = AllModifiersFromCollegtibles(backup);
    const hasProPermit = data.backup.game.permitLevel === 1;
    const showProPermitRecommendations = ref(hasProPermit);
    const prophecyEggs = getNumProphecyEggs(backup);
    const soulEggs = getNumSoulEggs(backup);
    const nakedEarningBonus = getNakedEarningBonus(backup);
    const nakedRole = earningBonusToFarmerRole(nakedEarningBonus);
    const homeFarm = new Farm(backup, backup.farms[0]);
    const homeFarmIsEnlightenment = homeFarm.egg === ei.Egg.ENLIGHTENMENT;
    const currentlyEquipped = homeFarm.artifactSet;
    const suggestedForStandardMirror = computed(() =>
      hasProPermit
        ? null
        : suggestArtifactSet(backup, PrestigeStrategy.STANDARD_PERMIT_MIRROR, {
            excludedIds: itemIdsToExclude.value,
          })
    );
    const suggestedForProPermitMirror = computed(() =>
      suggestArtifactSet(backup, PrestigeStrategy.PRO_PERMIT_MIRROR, {
        excludedIds: itemIdsToExclude.value,
      })
    );
    const suggestedForProPermitLunarMirror = computed(() =>
      suggestArtifactSet(backup, PrestigeStrategy.PRO_PERMIT_LUNAR_MIRROR, {
        excludedIds: itemIdsToExclude.value,
      })
    );

    return {
      backup,
      hasProPermit,
      showProPermitRecommendations,
      prophecyEggs,
      soulEggs,
      nakedEarningBonus,
      nakedRole,
      homeFarm,
      homeFarmIsEnlightenment,
      currentlyEquipped,
      suggestedForProPermitLunarMirror,
      suggestedForProPermitMirror,
      suggestedForStandardMirror,
      itemsToExclude,
      PrestigeStrategy,
      modifiers,
      hasGusset,
      iconURL,
      formatEIValue,
    };
  },
});

function loadItemsToExclude(): ItemSelectSpec[] {
  const defaultList = [{ id: null, rowid: uuidv4() }];
  const s = getLocalStorage(EXCLUDED_ITEM_IDS_LOCALSTORAGE_KEY);
  if (!s) {
    return defaultList;
  }
  let ids: unknown;
  try {
    ids = JSON.parse(s);
  } catch (err) {
    console.error(`failed to parse ${EXCLUDED_ITEM_IDS_LOCALSTORAGE_KEY}: ${s}: ${err}`);
    return defaultList;
  }
  if (!isListOfItemIds(ids)) {
    console.error(`${EXCLUDED_ITEM_IDS_LOCALSTORAGE_KEY} is invalid: ${s}`);
    return defaultList;
  }
  if (ids.length === 0) {
    return defaultList;
  }
  return ids.map(id => ({ id, rowid: uuidv4() }));
}

function hasGusset(set: ArtifactSet): boolean {
  return set.artifacts.some(artifact => artifact.afxId === ei.ArtifactSpec.Name.ORNATE_GUSSET);
}
</script>

<style lang="postcss" scoped>
strong {
  @apply font-medium underline;
}
</style>
