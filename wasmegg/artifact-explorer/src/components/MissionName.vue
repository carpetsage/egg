<template>
  <component
    :is="noLink ? 'div' : 'router-link'"
    :to="noLink ? undefined : { name: 'mission', params: { missionId: mission.missionTypeId } }"
  >
    <div class="flex">
      <div
        v-tippy="{
          content: `<img data-src='${iconURL(
            mission.shipIconPath,
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
        <span class="ml-1 text-sm">{{ mission.name }}</span>
      </div>
    </div>
  </component>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { iconURL, MissionType } from 'lib';
import { durationBorderClass } from '@/utils';

export default defineComponent({
  props: {
    mission: {
      type: Object as PropType<MissionType>,
      required: true,
    },
    noLink: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    return {
      iconURL,
      durationBorderClass,
    };
  },
});
</script>
