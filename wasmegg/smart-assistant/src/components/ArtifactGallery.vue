<!-- Largely duplicated from rockets-tracker/src/components/ArtifactGallery.vue -->
<template>
  <template v-if="empty">
    <div class="px-4 py-2 rounded-md w-max mx-auto text-center text-sm font-medium text-red-700 bg-red-100 mb-2">
      <template v-if="referenceSet">No recommendable artifact</template>
      <template v-else>No artifact equipped</template>
    </div>
  </template>

  <template v-else>
    <div v-if="alreadyOptimal" class="text-center text-sm font-medium text-yellow-500">
      &#x1f389; Already optimal &#x1f389;
    </div>
    <div class="grid grid-cols-max-2 sm:grid-cols-max-4 justify-center">
      <div v-for="(artifact, artifactIndex) in artifactSet.artifacts" :key="artifactIndex">
        <tippy
          tag="div"
          class="h-32 w-32 mx-2 my-2 relative rounded-full isolate"
          :class="artifactRarityBgClass(artifact.afxRarity) || 'bg-gray-200'"
        >
          <img class="absolute top-0 left-0 h-full w-full z-10" :src="iconURL(artifact.iconPath, 256)" />
          <img
            v-for="(stone, stoneIndex) in artifact.stones.slice().reverse()"
            :key="stoneIndex"
            class="Artifact__stone z-20"
            :src="iconURL(stone.iconPath, 128)"
          />
          <svg
            v-if="artifactAssemblyStatuses"
            v-tippy="{
              content: artifactAssemblyStatusTooltip(artifactAssemblyStatuses[artifactIndex]),
            }"
            class="Artifact__status z-20 cursor-help"
            :class="artifactAssemblyStatusClass(artifactAssemblyStatuses[artifactIndex])"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <!-- Heroicon name: solid/check-circle -->
            <path
              v-if="
                artifactAssemblyStatuses[artifactIndex] === ArtifactAssemblyStatus.EQUIPPED ||
                artifactAssemblyStatuses[artifactIndex] === ArtifactAssemblyStatus.ASSEMBLED
              "
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
            <!-- Heroicon name: solid/plus-circle -->
            <path
              v-if="artifactAssemblyStatuses[artifactIndex] === ArtifactAssemblyStatus.AWAITING_ASSEMBLY"
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clip-rule="evenodd"
            />
          </svg>

          <template #content>
            <div class="space-y-2">
              <div>
                <div class="font-medium">
                  <img :src="iconURL(artifact.iconPath)" class="inline h-4 w-4 relative -top-px" />
                  {{ artifact.name }} (T{{ artifact.tierNumber }})
                  <span v-if="artifact.afxRarity > 0" :class="artifactRarityFgClass(artifact.afxRarity)">
                    {{ artifact.rarity }}
                  </span>
                </div>
                <div>
                  <span class="text-green-300">{{ artifact.effectSize }}</span>
                  {{ artifact.effectTarget }}
                </div>
              </div>

              <div v-for="(stone, stoneIndex) in artifact.stones" :key="stoneIndex">
                <div>
                  <img :src="iconURL(stone.iconPath)" class="inline h-4 w-4 relative -top-px" />
                  {{ stone.name }} (T{{ stone.tierNumber }})
                </div>
                <div>
                  <span class="text-green-300">{{ stone.effectSize }}</span>
                  {{ stone.effectTarget }}
                </div>
              </div>
            </div>
          </template>
        </tippy>
      </div>
    </div>
    <div v-if="multiplier !== undefined" class="text-center text-xs my-2">
      <div>
        Virtual earnings multiplier from artifacts and colleggtibles:
        <span class="text-green-500 font-medium">&times;{{ trimTrailingZeros(multiplier.toFixed(3)) }}</span>
        <template v-if="referenceMultiplier !== undefined && !alreadyOptimal">
          {{ ' ' }}
          <span class="whitespace-nowrap text-gray-700"
            >(compared to
            <span class="text-yellow-500 font-medium"
              >&times;{{ trimTrailingZeros(referenceMultiplier.toFixed(3)) }}</span
            >
            from currently equipped)</span
          >
        </template>
      </div>
      <div>
        Soul eggs gain multiplier from artifacts and colleggtibles:
        <span class="text-green-500 font-medium">&times;{{ trimTrailingZeros((multiplier ** 0.21).toFixed(3)) }}</span>
        <template v-if="referenceMultiplier !== undefined && !alreadyOptimal">
          {{ ' ' }}
          <span class="whitespace-nowrap text-gray-700"
            >(compared to
            <span class="text-yellow-500 font-medium"
              >&times;{{ trimTrailingZeros((referenceMultiplier ** 0.21).toFixed(3)) }}</span
            >
            from currently equipped)</span
          >
        </template>
      </div>
      <div v-if="hasStones" class="text-purple-500 font-medium">Stones may be arbitrarily rearranged.</div>
    </div>
    <div class="mt-1 text-center text-xs text-gray-500">Hover over / click on each artifact to show details</div>
  </template>

  <div class="mt-0.5 text-center">
    <a :href="sandboxURL" target="_blank" class="block text-xs text-blue-500 hover:text-blue-600">
      <span class="underline">
        <template v-if="!empty">Tweak this set in the sandbox</template>
        <template v-else>Tweak in the sandbox</template>
      </span>
      <svg class="inline h-3 w-3 relative -top-px ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import {
  ArtifactSet,
  ei,
  Farm,
  farmToSandboxURL,
  iconURL,
  trimTrailingZeros,
  allModifiersFromColleggtibles,
  defaultModifiers,
} from 'lib';

import Rarity = ei.ArtifactSpec.Rarity;
import {
  ArtifactAssemblyStatus,
  ArtifactAssemblyStatusNonMissing,
  artifactSetEqual,
  artifactSetVirtualEarningsMultiplier,
  PrestigeStrategy,
} from '@/lib';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    strategy: {
      type: Number as PropType<PrestigeStrategy | undefined>,
      default: undefined,
    },
    artifactSet: {
      type: Object as PropType<ArtifactSet>,
      required: true,
    },
    referenceSet: {
      type: Object as PropType<ArtifactSet | undefined>,
      default: undefined,
    },
    artifactAssemblyStatuses: {
      type: Array as PropType<ArtifactAssemblyStatusNonMissing[] | undefined>,
      default: undefined,
    },
    farm: {
      type: Object as PropType<Farm>,
      required: true,
    },
    isEnlightenment: {
      type: Boolean as PropType<boolean | undefined>,
      default: undefined,
    },
    birdFeedActive: {
      type: Boolean,
      default: false,
    },
    tachyonPrismActive: {
      type: Boolean,
      default: false,
    },
    soulBeaconActive: {
      type: Boolean,
      default: false,
    },
    boostBeaconActive: {
      type: Boolean,
      default: false,
    },
    includeColleggtibles: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const {
      strategy,
      artifactSet,
      referenceSet,
      farm,
      isEnlightenment,
      birdFeedActive,
      tachyonPrismActive,
      soulBeaconActive,
      boostBeaconActive,
      includeColleggtibles,
    } = toRefs(props);
    // Type casting because somehow protected props are lost during toRefs.
    const empty = computed(() => artifactSet.value.artifacts.length === 0);
    const alreadyOptimal = computed(
      () =>
        !!referenceSet.value && artifactSetEqual(artifactSet.value as ArtifactSet, referenceSet.value as ArtifactSet)
    );
    const modifiers = computed(() =>
      includeColleggtibles.value ? allModifiersFromColleggtibles(farm.value.backup) : defaultModifiers
    );
    const multiplier = computed(() =>
      strategy.value !== undefined
        ? artifactSetVirtualEarningsMultiplier(
            farm.value as Farm,
            artifactSet.value as ArtifactSet,
            strategy.value,
            modifiers.value
          )
        : undefined
    );
    const referenceMultiplier = computed(() =>
      strategy.value !== undefined && referenceSet.value !== undefined
        ? artifactSetVirtualEarningsMultiplier(
            farm.value as Farm,
            referenceSet.value as ArtifactSet,
            strategy.value,
            modifiers.value
          )
        : undefined
    );
    const hasStones = computed(() => artifactSet.value.artifacts.some(artifact => artifact.stones.length > 0));
    const sandboxURL = computed(() =>
      farmToSandboxURL(farm.value as Farm, {
        isEnlightenment: isEnlightenment.value,
        artifactSet: artifactSet.value as ArtifactSet,
        birdFeedActive: birdFeedActive.value,
        tachyonPrismActive: tachyonPrismActive.value,
        soulBeaconActive: soulBeaconActive.value,
        boostBeaconActive: boostBeaconActive.value,
      })
    );
    return {
      empty,
      alreadyOptimal,
      multiplier,
      referenceMultiplier,
      hasStones,
      sandboxURL,
      ArtifactAssemblyStatus,
      artifactRarityFgClass,
      artifactRarityBgClass,
      artifactAssemblyStatusClass,
      artifactAssemblyStatusTooltip,
      iconURL,
      trimTrailingZeros,
    };
  },
});

function artifactRarityFgClass(afxRarity: Rarity): string {
  switch (afxRarity) {
    case Rarity.COMMON:
      return '';
    case Rarity.RARE:
      return 'text-rare';
    case Rarity.EPIC:
      return 'text-epic';
    case Rarity.LEGENDARY:
      return 'text-legendary';
  }
}

function artifactRarityBgClass(afxRarity: Rarity): string {
  switch (afxRarity) {
    case Rarity.COMMON:
      return '';
    case Rarity.RARE:
      return 'bg-rare';
    case Rarity.EPIC:
      return 'bg-epic';
    case Rarity.LEGENDARY:
      return 'bg-legendary';
  }
}

function artifactAssemblyStatusClass(status: ArtifactAssemblyStatusNonMissing): string {
  switch (status) {
    case ArtifactAssemblyStatus.AWAITING_ASSEMBLY:
      return 'text-red-400';
    case ArtifactAssemblyStatus.ASSEMBLED:
      return 'text-blue-400';
    case ArtifactAssemblyStatus.EQUIPPED:
      return 'text-green-400';
  }
}

function artifactAssemblyStatusTooltip(status: ArtifactAssemblyStatusNonMissing): string {
  switch (status) {
    case ArtifactAssemblyStatus.AWAITING_ASSEMBLY:
      return 'Needs to be assembled';
    case ArtifactAssemblyStatus.ASSEMBLED:
      return 'Already in your inventory';
    case ArtifactAssemblyStatus.EQUIPPED:
      return 'Already equipped';
  }
}
</script>

<style lang="postcss" scoped>
.text-rare {
  @apply text-blue-500;
}

.text-epic {
  @apply text-purple-500;
}

.text-legendary {
  @apply text-yellow-500;
}

.bg-rare {
  background: radial-gradient(#b3ffff, #b3ffff, #6ab6ff);
}

.bg-epic {
  background: radial-gradient(#ff40ff, #ff40ff, #c03fe2);
}

.bg-legendary {
  background: radial-gradient(#fffe41, #fffe41, #eeab42);
}

img.Artifact__stone {
  position: absolute;
  bottom: 7%;
  height: 17%;
  width: 17%;
  filter: drop-shadow(0 1px 0 white) drop-shadow(0 -1px 0 white) drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white);
}

img.Artifact__stone:nth-child(2) {
  right: 7%;
}

img.Artifact__stone:nth-child(3) {
  right: 24%;
}

img.Artifact__stone:nth-child(4) {
  right: 41%;
}

svg.Artifact__status {
  @apply absolute rounded-full bg-white;
  top: 7%;
  right: 7%;
  height: 17%;
  width: 17%;
}
</style>
