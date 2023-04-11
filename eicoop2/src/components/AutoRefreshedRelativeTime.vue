<template>
  <slot
    :relative-time="relativeTime"
    :reference-time-formatted="referenceTimeFormatted"
    :trigger-refresh="triggerRefresh"
  ></slot>
</template>

<script lang="ts">
import { defineComponent, inject, toRefs } from 'vue';
import { Dayjs } from 'dayjs';

import { refreshCallbackKey } from '@/symbols';
import { useAutoRefreshedRelativeTime } from '@/composables/relative_time';

export default defineComponent({
  props: {
    referenceTime: {
      type: Dayjs,
      required: true,
    },
    withoutSuffix: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { referenceTime, withoutSuffix } = toRefs(props);
    const triggerRefresh = inject(refreshCallbackKey, () => {
      window.location.reload();
    });
    const { relativeTime, referenceTimeFormatted } = useAutoRefreshedRelativeTime(referenceTime, {
      withoutSuffix: withoutSuffix.value,
    });
    return {
      relativeTime,
      referenceTimeFormatted,
      triggerRefresh,
    };
  },
});
</script>
