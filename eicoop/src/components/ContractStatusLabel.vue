<template>
  <div
    class="ml-4 mt-2 -mb-1 sm:shrink-0 flex items-center text-xs sm:text-sm font-medium uppercase"
    :class="colorClass"
  >
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" class="h-4 w-4 sm:h-5 sm:w-5 mr-1">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="iconPathD" />
    </svg>
    {{ labelText }}
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { ContractCompletionStatus } from '@/lib';
import { completionStatusFgColorClass } from '@/styles';

export default defineComponent({
  props: {
    status: {
      type: Number as PropType<ContractCompletionStatus>,
      required: true,
    },
  },
  setup(props) {
    const { status } = toRefs(props);
    const labelText = computed(() => {
      switch (status.value) {
        case ContractCompletionStatus.HasCompleted:
          return 'Completed';
        case ContractCompletionStatus.HasNoTimeLeft:
          return 'Out of time';
        case ContractCompletionStatus.IsOnTrackToFinish:
          return 'On track';
        case ContractCompletionStatus.IsNotOnTrackToFinish:
          return 'Not on track';
      }
      throw new Error(`the impossible happened: unexpected completion status: ${status.value}`);
    });
    const iconPathD = computed(() => {
      switch (status.value) {
        case ContractCompletionStatus.HasCompleted:
          return 'M5 13l4 4L19 7';
        case ContractCompletionStatus.HasNoTimeLeft:
          return 'M6 18L18 6M6 6l12 12';
        case ContractCompletionStatus.IsOnTrackToFinish:
          return 'M5 13l4 4L19 7';
        case ContractCompletionStatus.IsNotOnTrackToFinish:
          return 'M6 18L18 6M6 6l12 12';
      }
      throw new Error(`the impossible happened: unexpected completion status: ${status.value}`);
    });
    const colorClass = computed(() => completionStatusFgColorClass(status.value));
    return {
      labelText,
      iconPathD,
      colorClass,
    };
  },
});
</script>
