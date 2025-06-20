<template>
  <template v-if="plainText">
    {{ artifact.name }}
    <template v-if="showTier"> (T{{ artifact.tier_number }}) </template>
    <template v-if="isArtifactLike(artifact) && artifact.afx_rarity > 0"> , {{ artifact.rarity }} </template>
  </template>

  <template v-else>
    <component
      :is="noLink ? 'div' : 'router-link'"
      :to="noLink ? undefined : { name: 'artifact', params: { artifactId: artifact.id } }"
    >
      <div class="flex">
        <div
          v-tippy="{
            content: `<img data-src='${iconURL('egginc/' + artifact.icon_filename, 256)}' class='h-32 w-32'>`,
            allowHTML: true,
          }"
          class="flex items-center"
        >
          <div class="flex-shrink-0 h-4 w-4">
            <img class="h-4 w-4" :src="iconURL('egginc/' + artifact.icon_filename, 32)" />
          </div>
          <div
            class="ml-1 flex text-sm"
            :class="[
              isArtifactLike(artifact) ? rarityFgClass500(artifact.afx_rarity) : null,
              artifact.available_from_missions || noAvailabilityMarker ? null : 'text-red-900 dagger',
            ]"
          >
            <span :class="limitWidth ? 'xs:max-w-xxxs inline-block truncate' : 'truncate'">{{ artifact.name }}</span>
            <template v-if="showTier">
              <span>&nbsp;(T{{ artifact.tier_number }})</span>
            </template>
            <template v-if="isArtifactLike(artifact) && artifact.afx_rarity > 0">
              <span>, {{ artifact.rarity }}</span>
            </template>
          </div>
        </div>
      </div>
    </component>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { rarityFgClass500 } from '@/utils';

import { iconURL } from 'lib';
import { AfxTier } from 'lib/artifacts/data';
import { ArtifactLike } from '@/lib';

export default defineComponent({
  props: {
    artifact: {
      type: Object as PropType<AfxTier | ArtifactLike>,
      required: true,
    },
    showTier: {
      type: Boolean,
      default: false,
    },
    plainText: {
      type: Boolean,
      default: false,
    },
    noLink: {
      type: Boolean,
      default: false,
    },
    noAvailabilityMarker: {
      type: Boolean,
      default: false,
    },
    // For mission view loot grid, where there's an extreme shortage of
    // horizontal space.
    limitWidth: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    return {
      iconURL,
      rarityFgClass500,
      isArtifactLike,
    };
  },
});

function isArtifactLike(x: AfxTier | ArtifactLike): x is ArtifactLike {
  return (x as ArtifactLike).afx_rarity !== undefined;
}
</script>
