<template>
  <template v-if="event.id !== 'app-update'">
    <div class="h-4 w-6.5 rounded-full" :class="event.bgClass">
      <img class="h-4 w-full object-contain" :src="iconURL(event.icon, 64)" />
    </div>
  </template>
  <template v-else>
    <div class="h-4 w-6.5 rounded-full bg-gray-500">
      <svg viewBox="0 0 448 512" class="h-4 w-full p-0.5 object-contain">
        <path
          fill="currentColor"
          d="M34.9 289.5l-22.2-22.2c-9.4-9.4-9.4-24.6 0-33.9L207 39c9.4-9.4 24.6-9.4 33.9 0l194.3 194.3c9.4 9.4 9.4 24.6 0 33.9L413 289.4c-9.5 9.5-25 9.3-34.3-.4L264 168.6V456c0 13.3-10.7 24-24 24h-32c-13.3 0-24-10.7-24-24V168.6L69.2 289.1c-9.3 9.8-24.8 10-34.3.4z"
          class="text-white"
        />
      </svg>
    </div>
  </template>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { iconURL } from 'lib';
import { EventType } from '@/events';

export default defineComponent({
  props: {
    event: {
      type: Object as PropType<EventType>,
      required: true,
    },
  },
  setup() {
    return {
      iconURL,
    };
  },
});
</script>
