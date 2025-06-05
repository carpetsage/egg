<template>
  <div class="relative h-[16px] w-[73px]">
    <div class="absolute top-0 left-0 w-[292px] flex justify-center space-x-3 scale-[.25] origin-top-left">
      <div v-for="(artifact, artifactIndex) in artifactSet.artifacts" :key="artifactIndex">
        <tippy
          tag="div"
          class="relative h-16 w-16 rounded-full isolate"
          :class="artifactRarityBgClass(artifact.afxRarity)"
        >
          <base-icon :icon-rel-path="artifact.iconPath" :size="128" class="absolute top-0 left-0 h-full w-full z-10" />
          <base-icon
            v-for="(stone, stoneIndex) in artifact.stones.slice().reverse()"
            :key="stoneIndex"
            :icon-rel-path="stone.iconPath"
            :size="64"
            class="stone z-20"
          />

          <template #content>
            <div class="space-y-2">
              <div
                class="relative h-16 w-16 mx-auto rounded-full isolate"
                :class="artifactRarityBgClass(artifact.afxRarity)"
              >
                <base-icon
                  :icon-rel-path="artifact.iconPath"
                  :size="128"
                  class="absolute top-0 left-0 h-full w-full z-10"
                />
                <base-icon
                  v-for="(stone, stoneIndex) in artifact.stones.slice().reverse()"
                  :key="stoneIndex"
                  :icon-rel-path="stone.iconPath"
                  :size="64"
                  class="stone z-20"
                />
              </div>

              <div>
                <div class="font-medium">
                  <base-icon
                    :icon-rel-path="artifact.iconPath"
                    :size="128"
                    class="inline-block align-middle h-4 w-4 relative -top-px"
                  />
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
                  <base-icon
                    :icon-rel-path="stone.iconPath"
                    :size="64"
                    class="inline-block align-middle h-4 w-4 relative -top-px"
                  />
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
  </div>
</template>

<script setup lang="ts">
import { Tippy } from 'vue-tippy';

import { ArtifactSet, ei } from 'lib';

import BaseIcon from 'ui/components/BaseIcon.vue';

defineProps<{ artifactSet: ArtifactSet }>();

function artifactRarityFgClass(afxRarity: ei.ArtifactSpec.Rarity): string {
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
}

function artifactRarityBgClass(afxRarity: ei.ArtifactSpec.Rarity): string {
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
}
</script>

<style scoped>
@reference '../index.css';
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

::v-deep(picture.stone) {
  position: absolute;
  bottom: 7%;
  height: 17%;
  width: 17%;
  filter: drop-shadow(0 1px 0 white) drop-shadow(0 -1px 0 white) drop-shadow(1px 0 0 white) drop-shadow(-1px 0 0 white);
}

::v-deep(picture.stone:nth-child(2)) {
  right: 7%;
}

::v-deep(picture.stone:nth-child(3)) {
  right: 24%;
}

::v-deep(picture.stone:nth-child(4)) {
  right: 41%;
}
</style>
