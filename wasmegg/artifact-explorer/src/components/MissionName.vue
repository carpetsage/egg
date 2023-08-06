<template>
  <component
    :is="noLink ? 'div' : 'router-link'"
    :to="noLink ? undefined : { name: 'mission', params: { missionId: mission.missionTypeId } }"
  >
    <div class="flex">
      <div
        v-tippy="{
          content: `<img data-src='${iconURL( mission.shipIconPath,
            256
          )}' class='h-36 w-36 p-1.5 rounded-full border-2 ${durationBorderClass(
            mission.durationType
          )}'>`,
          allowHTML: true,
        }"
        class="flex items-center"
      >
        <div class="flex-shrink-0 h-5 w-5">
          <img
            class="h-5 w-5 p-px rounded-full border"
            :class="durationBorderClass(mission.durationType)"
            :src="iconURL(mission.shipIconPath, 32)"
          />
        </div>
        <span class="ml-1 text-sm">{{ mission.name }}
        <template v-if="target !== undefined">
          <img v-if="target !== 10000" class="inline-flex h-6 w-6" :src="id2url(Number(target), 32)" :alt="ei.ArtifactSpec.Name[target]" />
        </template>
        </span>
      </div>
    </div>
  </component>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { ei, getTargetName, iconURL, MissionType, getImageUrlFromId as id2url} from 'lib';
import { durationBorderClass } from '@/utils';

export default defineComponent({
  props: {
    mission: {
      type: Object as PropType<MissionType>,
      required: true,
    },
    target: {
      type: Object as PropType<ei.ArtifactSpec.Name>,
      required: false,
      default: undefined,
    },
    noLink: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    return {
      ei,
      iconURL,
      id2url,
      getTargetName,
      durationBorderClass,
    };
  },
});
</script>
