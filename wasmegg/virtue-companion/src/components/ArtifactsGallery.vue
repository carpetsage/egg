<template>
  <div class="grid gap-4 text-xs" :style="{ gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))' }">
    <div
      v-for="(artifact, artifactIndex) in artifacts.toSorted((a, b) => a.afxId - b.afxId)"
      :key="artifactIndex"
      class="px-4 py-4 bg-gray-50 shadow rounded-lg overflow-hidden text-center"
    >
      <div class="flex justify-center mb-2">
        <div class="h-32 w-32 relative rounded-full" :class="rarityBgClass(artifact.afxRarity) || 'bg-gray-200'">
          <img class="absolute top-0 left-0 h-full w-full z-10" :src="iconURL(artifact.iconPath, 256)" />
          <img
            v-for="(stone, stoneIndex) in artifact.stones.slice().reverse()"
            :key="stoneIndex"
            class="Artifact__stone z-20"
            :src="iconURL(stone.iconPath, 128)"
          />
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

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { iconURL } from 'lib';
import { Artifact } from '@/lib/types';
import { ei } from '@/lib';

export default defineComponent({
  props: {
    artifacts: {
      type: Array as PropType<Artifact[]>,
      required: true,
    },
  },
  setup() {
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
      rarityFgClass,
      rarityBgClass,
      // warnings,
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

img.Artifact__warning {
  position: absolute;
  top: 0;
  right: 0;
  height: 20%;
  width: 20%;
  filter: drop-shadow(0 1px 0 white) drop-shadow(0 -1px 0 white) drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white);
}
</style>
