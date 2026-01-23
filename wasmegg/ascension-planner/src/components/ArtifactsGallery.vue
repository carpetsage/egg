<template>
  <template v-if="empty">
    <div class="px-4 py-2 rounded-md w-max mx-auto text-center text-sm font-medium text-red-700 bg-red-100 mb-2">
      <template v-if="referenceSet">No recommendable artifact</template>
      <template v-else>No artifact equipped</template>
    </div>
  </template>
  <template v-else>
    <div v-if="alreadyOptimal" class="text-center text-sm font-medium text-yellow-500 mb-2">
      &#x1f389; Already optimal &#x1f389;
    </div>
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
    <div class="grid gap-4 text-xs" :style="{ gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))' }">
      <div
        v-for="(artifact, artifactIndex) in artifactSet.artifacts"
        :key="artifactIndex"
        class="px-4 py-4 bg-gray-50 shadow rounded-lg overflow-hidden text-center"
      >
        <div class="flex justify-center mb-2">
          <div
            class="h-32 w-32 relative rounded-full isolate"
            :class="rarityBgClass(artifact.afxRarity) || 'bg-gray-200'"
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
          </div>
        </div>
        <div class="font-medium mb-1">
          {{ artifact.name }} (T{{ artifact.afxLevel + 1 }})
          <span v-if="artifact.afxRarity > 0" :class="rarityFgClass(artifact.afxRarity)">
            {{ artifact.rarity }}
          </span>
        </div>
        <div>
          <span class="text-effect">{{ artifact.effectSize }}</span> {{ artifact.effectTarget }}
        </div>
        <div v-for="(stone, stoneIndex) in artifact.stones" :key="stoneIndex">
          <span class="text-effect">{{ stone.effectSize }}</span>
          {{ stone.effectTarget.replace(' on enlightenment egg farms', '') }}
        </div>
      </div>
    </div>
  </template>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import {
  iconURL,
  ArtifactSet,
  artifactSetEqual,
  ArtifactAssemblyStatus,
  ArtifactAssemblyStatusNonMissing,
  farmToSandboxURL,
  Farm,
} from 'lib';
import { ei } from '@/lib';

export default defineComponent({
  props: {
    artifactSet: {
      type: Object as PropType<ArtifactSet>,
      required: true,
    },
    farm: {
      type: Object as PropType<Farm>,
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
  },
  setup(props) {
    const { artifactSet, referenceSet, farm } = toRefs(props);
    const artifacts = computed(() => artifactSet.value?.artifacts ?? []);
    const empty = computed(() => artifactSet.value.artifacts.length === 0);
    const alreadyOptimal = computed(
      () =>
        !!referenceSet.value && artifactSetEqual(artifactSet.value as ArtifactSet, referenceSet.value as ArtifactSet)
    );
    const sandboxURL = computed(() =>
      farmToSandboxURL(farm.value as Farm, {
        artifactSet: artifactSet.value as ArtifactSet,
        birdFeedActive: false,
        tachyonPrismActive: false,
        soulBeaconActive: false,
        boostBeaconActive: false,
      })
    );
    const artifactAssemblyStatusClass = (status: ArtifactAssemblyStatusNonMissing): string => {
      switch (status) {
        case ArtifactAssemblyStatus.AWAITING_ASSEMBLY:
          return 'text-red-400';
        case ArtifactAssemblyStatus.ASSEMBLED:
          return 'text-blue-400';
        case ArtifactAssemblyStatus.EQUIPPED:
          return 'text-green-400';
      }
    };
    const artifactAssemblyStatusTooltip = (status: ArtifactAssemblyStatusNonMissing): string => {
      switch (status) {
        case ArtifactAssemblyStatus.AWAITING_ASSEMBLY:
          return 'Needs to be assembled';
        case ArtifactAssemblyStatus.ASSEMBLED:
          return 'Already in your inventory';
        case ArtifactAssemblyStatus.EQUIPPED:
          return 'Already equipped';
      }
    };
    const rarityFgClass = (afxRarity: ei.ArtifactSpec.Rarity): string => {
      switch (afxRarity) {
        case ei.ArtifactSpec.Rarity.COMMON:
          return '';
        case ei.ArtifactSpec.Rarity.RARE:
          return 'text-rare';
        case ei.ArtifactSpec.Rarity.EPIC:
          return 'text-epic';
        case ei.ArtifactSpec.Rarity.LEGENDARY:
          return 'text-legendary';
      }
    };
    const rarityBgClass = (afxRarity: ei.ArtifactSpec.Rarity): string => {
      switch (afxRarity) {
        case ei.ArtifactSpec.Rarity.COMMON:
          return '';
        case ei.ArtifactSpec.Rarity.RARE:
          return 'bg-rare';
        case ei.ArtifactSpec.Rarity.EPIC:
          return 'bg-epic';
        case ei.ArtifactSpec.Rarity.LEGENDARY:
          return 'bg-legendary';
      }
    };
    // Should probably bring back warnigns for useless artis
    // const warnings = computed(() =>
    //   artifacts.value.map(artifact => {
    //     if (hasNoEffect(artifact)) {
    //       return 'Has no clarity stone';
    //     }
    //     if (hasIneffectiveClarityStones(artifact)) {
    //       return 'Clarity stone redundant on Light of Eggendil';
    //     }
    //     return null;
    //   })
    // );
    return {
      artifacts,
      empty,
      sandboxURL,
      alreadyOptimal,
      rarityFgClass,
      rarityBgClass,
      artifactAssemblyStatusClass,
      artifactAssemblyStatusTooltip,
      ArtifactAssemblyStatus,
      iconURL,
    };
  },
});
</script>

<style scoped>
.text-rare {
  color: #2d77ee;
}

.text-epic {
  color: #b601ea;
}

.text-legendary {
  color: #fc9901;
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

.text-effect {
  color: #1e9c11;
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
  position: absolute;
  top: 7%;
  right: 7%;
  height: 17%;
  width: 17%;
  border-radius: 9999px;
  background-color: white;
}

img.Artifact__warning {
  position: absolute;
  top: 0;
  right: 0;
  height: 20%;
  width: 20%;
  filter: drop-shadow(0 1px 0 white) drop-shadow(0 -1px 0 white) drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white);
}
</style>
