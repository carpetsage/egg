<!-- eslint-disable vue/first-attribute-linebreak -->
<template>
  <tippy class="text-gray-900 dark:text-gray-100">
    <span :class="completionStatusFgColorClass(completionStatus)">{{ formatDuration(expectedTimeToComplete) }}</span>
    expected
    <template v-if="expectedTimeToComplete > 0" #content>
      <p>
        Expected to complete at
        <span :class="completionStatusFgColorClass(completionStatus)">
          {{ expectedFinalCompletionDate.format('YYYY-MM-DD HH:mm') }} </span
        >.
      </p>
      <template v-if="grade">
        <p>
          Predicted total time take for contract completion:
          <span :class="completionStatusFgColorClass(completionStatus)">
            {{ formatDuration(expectedFinalCompletionDate.unix() - startDate.unix()) }}
          </span>
        </p>
      </template>
      <br />
      <p>This is an estimate based on the current laying rate (see FAQ below)</p>
    </template>
  </tippy>
  /
  <tippy class="text-gray-900 dark:text-gray-100">
    {{ formatDuration(max(status.secondsRemaining, 0)) }} remaining
    <template #content>
      {{ status.secondsRemaining > 0 ? 'Expires' : 'Expired' }} at
      {{ status.expirationTime.format('YYYY-MM-DD HH:mm') }}
    </template>
  </tippy>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import { CoopStatus, eggIconPath, formatEIValue, formatDuration } from '@/lib';
import { completionStatusFgColorClass, completionStatusBgColorClass } from '@/styles';
import { eggTooltip } from '@/utils';
import { ContractCompletionStatus } from '../lib/contract';
import { Dayjs } from 'dayjs';

export default defineComponent({
  components: {
    Tippy,
  },
  props: {
    offline: {
      type: Boolean,
      required: true,
    },
    completionStatus: {
      type: Object as PropType<ContractCompletionStatus>,
      required: true,
    },
    expectedFinalCompletionDate: {
      type: Object as PropType<Dayjs>,
      required: true,
    },
    expectedTimeToComplete: {
      type: Number,
      required: true,
    },
    status: {
      type: Object as PropType<CoopStatus>,
      required: true,
    },
  },
  setup(props) {
    const { expectedFinalCompletionDate, status } = toRefs(props);

    const contract = computed(() => status.value.contract!);
    const grade = computed(() => status.value.grade || 5);

    const gradeSpec = computed(() => contract.value.gradeSpecs![grade.value - 1]);
    const startDate = expectedFinalCompletionDate.value.subtract(gradeSpec.value.lengthSeconds!);
    const egg = computed(() => contract.value.egg!);
    const league = computed(() => status.value.league);
    const leagueStatus = computed(() => status.value.leagueStatus!);
    const anyPlayerPrivate = computed(() => status.value.contributors.find(c => !c.farmShared) != null);
    const openings = computed(() => Math.max((contract.value.maxCoopSize || 0) - status.value.contributors.length, 0));

    return {
      contract,
      egg,
      league,
      grade,
      leagueStatus,
      anyPlayerPrivate,
      openings,
      startDate,
      formatEIValue,
      formatDuration,
      completionStatusFgColorClass,
      completionStatusBgColorClass,
      eggIconPath,
      eggTooltip,
      max: Math.max,
    };
  },
});
</script>
