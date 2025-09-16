<template>
  <div class="grid justify-center" :class="mini ? 'grid-cols-max-4' : 'grid-cols-max-2 sm:grid-cols-max-4'">
    <div v-for="(artifact, artifactIndex) in artifactSet.artifacts" :key="artifactIndex">
      <tippy
        tag="div"
        class="relative rounded-full isolate"
        :class="[
          mini ? 'h-16 w-16 mx-1 my-1' : 'h-32 w-32 mx-2 my-2',
          artifactRarityBgClass(artifact.afxRarity) || 'bg-gray-200',
        ]"
      >
        <img class="absolute top-0 left-0 h-full w-full z-10" :src="iconURL(artifact.iconPath, 256)" />
        <img
          v-for="(stone, stoneIndex) in artifact.stones.slice().reverse()"
          :key="stoneIndex"
          class="Artifact__stone z-20"
          :src="iconURL(stone.iconPath, 128)"
        />

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
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { Tippy } from 'vue-tippy';

import { ArtifactSet, iconURL } from 'lib';
import { artifactRarityBgClass, artifactRarityFgClass } from '@/utils';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    artifactSet: {
      type: Object as PropType<ArtifactSet>,
      required: true,
    },
    // If mini is true, the gallery is at half size.
    // Used in the slotted stones tooltip.
    mini: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    return {
      artifactRarityFgClass,
      artifactRarityBgClass,
      iconURL,
    };
  },
});
</script>

<style scoped>
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
</style>
