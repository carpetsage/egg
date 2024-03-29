<template>
  <div class="flex items-center justify-center mb-2 space-x-1">
    <img
      :key="config.isEnlightenment.toString()"
      :src="
        iconURL(
          config.isEnlightenment ? 'egginc/egg_enlightenment.png' : 'egginc/egg_universe.png',
          64
        )
      "
      class="inline h-5 w-5"
    />
    <span class="text-sm">{{ config.isEnlightenment ? 'Enlightenment' : 'Regular' }} farm</span>
  </div>

  <div class="grid grid-cols-4 gap-2 sm:gap-4">
    <div v-for="index of [0, 1, 2, 3]" :key="index">
      <artifact-display
        :artifact="build.artifacts[index]"
        :config="config"
        class="mx-auto"
        :style="{ maxWidth: '8rem' }"
      />
    </div>
  </div>

  <template v-if="build.hasDuplicates()">
    <div class="text-center text-lg text-red-500 mt-4 mb-2">
      Invalid build &mdash; same artifact family cannot be used more than once.
    </div>
  </template>

  <template v-else>
    <div v-if="!build.isEmpty()" class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4 mt-4">
      <template v-for="(artifact, artifactIndex) in build.artifacts" :key="artifactIndex">
        <div
          v-if="artifact.nonEmpty()"
          class="text-sm text-center p-2 pt-2.5 bg-dark-23 rounded-lg shadow-inner leading-snug space-y-1"
        >
          <div class="uppercase">
            <span>{{ artifact.name }}</span
            >{{ ' ' }}
            <span v-if="artifact.afxRarity > 0" :class="artifact.rarity">
              {{ artifact.rarity }}
            </span>
          </div>

          <div>
            <span class="EffectSize">{{ artifact.effectSize }}</span> {{ artifact.effectTarget }}
          </div>

          <div class="space-y-0.5">
            <div
              v-for="(stone, stoneIndex) in artifact.activeStones"
              :key="stoneIndex"
              class="flex flex-wrap items-center justify-center"
            >
              <span class="mr-1">
                <span class="EffectSize mr-1">{{ stone.effectSize }}</span>
                <span>{{ stone.effectTarget }}</span>
              </span>
              <span
                class="inline-flex items-center text-xs text-dark-60 whitespace-nowrap leading-normal"
                >(<img
                  class="inline h-3 w-3"
                  :src="iconURL('egginc-extras/icon_golden_egg.png', 64)"
                />{{ stoneSettingCost(artifact, stone).toLocaleString('en-US') }})</span
              >
            </div>
          </div>

          <template v-if="config.isEnlightenment">
            <!-- Enlightenment farm -->
            <div v-if="artifact.isEffectiveOnEnlightenment()">
              <img
                class="inline h-3.5 w-3.5 relative -top-px"
                :src="iconURL('egginc-extras/icon_lightning_green.png', 64)"
              />
              <span class="EffectSize text-xs uppercase"
                >{{ formatPercentage(artifact.clarityEffect) }} effective on enlightenment egg</span
              >
            </div>
            <div v-else>
              <img
                class="inline h-3.5 w-3.5 relative -top-px"
                :src="iconURL('egginc-extras/icon_warning.png', 64)"
              />
              <span class="Warning text-xs uppercase"
                >Not compatible with enlightenment egg
                <template v-if="artifact.afxRarity > 0">as configured</template></span
              >
            </div>
          </template>

          <template v-else>
            <!-- Regular farm -->
            <div v-if="!artifact.isEffectiveOnRegular()">
              <img
                class="inline h-3.5 w-4 pr-0.5 relative -top-px"
                :src="iconURL('egginc-extras/icon_warning.png', 64)"
              />
              <span class="Warning text-xs uppercase"
                >Not compatible with non-enlightenment egg</span
              >
            </div>
            <div v-if="artifact.hasClarityStones()">
              <img
                class="inline h-3.5 w-4 pr-0.5 relative -top-px"
                :src="iconURL('egginc-extras/icon_warning.png', 64)"
              />
              <span class="Warning text-xs uppercase"
                >Clarity stone not compatible with non-enlightenment egg</span
              >
            </div>
          </template>
        </div>
        <div v-else class="bg-dark-23 rounded-lg shadow-inner"></div>
      </template>
    </div>
    <div class="flex items-center justify-center mt-3 mb-2">
      <span class="text-sm">Total stone-setting costs:</span>
      <img class="inline h-3 w-3" :src="iconURL('egginc-extras/icon_golden_egg.png', 64)" />
      <span class="text-xs text-dark-60">{{
        aggregateStoneSettingCost(build).toLocaleString('en-US')
      }}</span>
    </div>
  </template>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ArtifactDisplay from '@/components/ArtifactDisplay.vue';

import {
  aggregateStoneSettingCost,
  Build,
  Config,
  formatPercentage,
  stoneSettingCost,
} from '@/lib';
import { iconURL } from 'lib';

export default defineComponent({
  components: {
    ArtifactDisplay,
  },
  props: {
    build: {
      type: Build,
      required: true,
    },
    config: {
      type: Config,
      required: true,
    },
  },
  setup() {
    return {
      stoneSettingCost,
      aggregateStoneSettingCost,
      formatPercentage,
      iconURL,
    };
  },
});
</script>

<style scoped>
.EffectSize {
  color: #1e9c11;
}

.Rare {
  color: #2d77ee;
}

.Epic {
  color: #b601ea;
}

.Legendary {
  color: #fc9901;
}

.Warning {
  color: #ffc601;
}
</style>
