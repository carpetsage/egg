<template>
  <div class="my-2">
    <p>
      Silos owned: <span class="text-green-500 font-medium">{{ silosOwned }}</span>
    </p>
    <p>
      Total away time:
      <span class="text-green-500 font-medium">{{ formatDuration(totalAwayTimeMinutes) }}</span>
    </p>
    <p v-if="nextSiloCost > 0">
      Next silo cost ({{ silosOwned + 1 }}):
      <span
        class="text-green-500 font-medium cursor-pointer hover:text-blue-600"
        @click.stop="setCashTarget?.(nextSiloCost)"
      >
        {{ formatEIValue(nextSiloCost) }}
      </span>
      <span
        v-if="addCashTarget"
        class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
        title="Add to target"
        @click.stop="addCashTarget(nextSiloCost)"
        >+</span
      >
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs, PropType, computed } from 'vue';
import { ei, formatEIValue, nextSiloCost, totalAwayTime, formatSiloDuration } from 'lib';

export default defineComponent({
  name: 'SilosSection',
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
    setCashTarget: {
      type: Function as PropType<(amount: number) => void>,
      required: false,
      default: undefined,
    },
    addCashTarget: {
      type: Function as PropType<(amount: number) => void>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const { backup } = toRefs(props);
    const silosOwned = computed(() => {
      return backup.value.farms?.[0]?.silosOwned || 0;
    });

    const nextCost = computed(() => nextSiloCost(silosOwned.value));

    const siloCapacityLevel = computed(() => {
      return backup.value.game?.epicResearch?.find(r => r.id === 'silo_capacity')?.level || 0;
    });

    const awayTimeMinutes = computed(() => totalAwayTime(silosOwned.value, siloCapacityLevel.value));

    return {
      silosOwned,
      nextSiloCost: nextCost,
      totalAwayTimeMinutes: awayTimeMinutes,
      formatDuration: formatSiloDuration,
      formatEIValue,
    };
  },
});
</script>
