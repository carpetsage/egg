<template>
  <div class="Artifact relative h-full w-full bg-dark-20">
    <!-- transparent 128x128 image to ensure a background with appropriate size is always there -->
    <img
      class="h-full w-full"
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACAAQAAAADrRVxmAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAB3RJTUUH5QIPDA4JRrsP6QAAAAJ0Uk5TAAB2k804AAAAAmJLR0QAAd2KE6QAAAAYSURBVBgZYxgFo2AUjIJRMApGwSigMwAACIAAATZwqqYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjEtMDItMTVUMTI6MTQ6MDkrMDA6MDAyUXzCAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIxLTAyLTE1VDEyOjE0OjA5KzAwOjAwQwzEfgAAAABJRU5ErkJggg=="
    />
    <template v-if="artifact.nonEmpty()">
      <img class="absolute top-0 left-0 h-full w-full z-10" :src="iconURL(artifact.iconPath)" />
      <template v-for="(stone, index) in artifact.activeStones.slice().reverse()" :key="index">
        <img v-if="stone !== null" class="Stone z-20" :src="iconURL(stone.iconPath, 128)" />
      </template>
      <img
        v-if="artifact.afxRarity > 0"
        class="GlowingEffect absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        :class="artifact.rarity"
        :src="glowBackgroundImage(artifact.afxId, artifact.rarity)"
      />
      <img
        v-if="config.isEnlightenment && !artifact.isEffectiveOnEnlightenment()"
        class="Ineffective z-20"
        :src="iconURL('egginc-extras/icon_warning.png', 64)"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { iconURL } from 'lib';
import { Artifact, Config } from '@/lib';
import { ArtifactSpec } from '@/lib/proto';

export default defineComponent({
  props: {
    artifact: {
      type: Artifact,
      required: true,
    },
    config: {
      type: Config,
      required: true,
    },
  },
  setup() {
    const glowBackgroundImage = (afxId: ArtifactSpec.Name, rarity: string) => {
      const serial = (afxId % 21) + 1;
      return iconURL(
        `egginc-extras/glow/${rarity.toLowerCase()}-${serial.toString().padStart(2, '0')}.png`,
        256
      );
    };
    return {
      glowBackgroundImage,
      iconURL,
    };
  },
});
</script>

<style scoped>
.Artifact {
  border-radius: 15%;
}

img.Stone {
  position: absolute;
  bottom: 7%;
  height: 17%;
  width: 17%;
}

img.Stone:nth-child(3) {
  right: 7%;
}

img.Stone:nth-child(4) {
  right: 24%;
}

img.Stone:nth-child(5) {
  right: 41%;
}

img.GlowingEffect {
  height: 120%;
  width: 120%;
}

/* Try to color-correct the glow effects. */
img.GlowingEffect {
  filter: brightness(1.5);
}

img.Ineffective {
  position: absolute;
  top: 7%;
  right: 7%;
  height: 20%;
  width: 20%;
}
</style>
