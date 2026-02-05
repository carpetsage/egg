<template>
  <div class="space-y-4">
    <!-- Step Header with Metrics -->
    <step-header
      :step="step"
      :previous-steps="previousSteps"
      :initial-data="initialData"
      :arrival-time="arrivalTime"
      :departure-time="departureTime"
    />

    <div class="text-sm text-gray-600">
      <p class="font-medium text-gray-900 mb-2">Silos</p>
      <p>Purchase silos to extend your away time.</p>
    </div>

    <!-- Silos Display + Total Away Time -->
    <div class="flex gap-4 items-center">
      <!-- Silo Slots -->
      <div class="grid grid-cols-5 gap-2 flex-shrink-0">
        <div
          v-for="index in 10"
          :key="index"
          class="relative border-2 rounded-lg p-2 w-12 h-12 flex items-center justify-center transition-all"
          :class="
            index <= siloCount
              ? 'border-purple-300 bg-purple-50'
              : 'border-dashed border-gray-300 bg-gray-50'
          "
        >
          <div v-if="index <= siloCount" class="text-center">
            <img :src="siloIconUrl" class="w-8 h-8" alt="Silo" />
          </div>
          <div v-else class="text-center">
            <span class="text-gray-300 text-lg">○</span>
          </div>
          <div class="absolute -top-1 -right-1 text-xs text-gray-400">#{{ index }}</div>
        </div>
      </div>

      <!-- Total Away Time -->
      <div class="flex-1 bg-purple-50 rounded-lg p-4 text-center">
        <p class="text-sm text-gray-600 mb-1">Total Away Time</p>
        <p class="text-3xl font-bold text-purple-700">{{ formatSiloDuration(totalAwayTimeMinutes) }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ siloCount }} silo{{ siloCount !== 1 ? 's' : '' }} × {{ minutesPerSilo }}m each
        </p>
        <p v-if="siloCapacityLevel > 0" class="text-xs text-purple-600 mt-1">
          (60m base + {{ siloCapacityLevel * 6 }}m from Silo Capacity Lv{{ siloCapacityLevel }})
        </p>
      </div>
    </div>

    <!-- Silo Capacity Epic Research (read-only from player data) -->
    <div class="bg-gray-50 rounded-lg p-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-700">Silo Capacity (Epic Research)</p>
          <p class="text-xs text-gray-500">+6 minutes per silo per level</p>
        </div>
        <div class="text-right">
          <span class="text-lg font-medium text-gray-900">Level {{ siloCapacityLevel }}/20</span>
        </div>
      </div>
      <div class="mt-2 text-xs text-gray-500">
        Bonus: <span class="font-medium text-purple-600">+{{ siloCapacityLevel * 6 }}m</span> per silo
        ({{ minutesPerSilo }}m total per silo)
      </div>
    </div>

    <!-- Buy Next Silo Button -->
    <div v-if="siloCount < 10" class="flex items-center gap-4">
      <button
        class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        @click="buySilo"
      >
        <img :src="siloIconUrl" class="w-6 h-6" alt="Silo" />
        <span>Buy Silo #{{ siloCount + 1 }}</span>
        <span class="text-purple-200">·</span>
        <span class="font-medium">{{ formatEIValue(nextCost) }}</span>
      </button>
    </div>
    <div v-else class="text-center text-sm text-gray-500 py-2">
      Maximum silos reached (10/10)
    </div>

    <!-- Purchase Log -->
    <div v-if="purchaseLog.length > 0" class="border border-gray-200 rounded-lg">
      <div class="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <p class="text-sm font-medium text-gray-700">Purchase Log</p>
        <button
          class="text-xs text-red-500 hover:text-red-700 transition-colors"
          @click="undoLastPurchase"
        >
          Undo Last
        </button>
      </div>
      <div class="max-h-48 overflow-y-auto">
        <div
          v-for="(entry, index) in purchaseLog"
          :key="index"
          class="px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-700">#{{ index + 1 }}</span>
            <span class="text-gray-600">
              Bought Silo {{ entry.siloNumber }}
            </span>
          </div>
          <div class="text-right">
            <span class="text-gray-500">{{ formatEIValue(entry.cost) }}</span>
            <span class="text-xs text-gray-400 ml-2">
              → {{ formatSiloDuration(entry.awayTimeAfter) }}
            </span>
          </div>
        </div>
      </div>
      <div class="px-3 py-2 bg-gray-50 border-t border-gray-200 text-sm">
        <span class="text-gray-600">Total Cost:</span>
        <span class="font-medium text-gray-900 ml-1">{{ formatEIValue(totalCost) }}</span>
      </div>
    </div>

    <!-- Fuel Tank (available on all eggs) -->
    <!-- Hidden for now --><fuel-tank v-if="false" :step="step" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import { formatEIValue, nextSiloCost, totalAwayTime, formatSiloDuration, awayTimePerSilo } from 'lib';
import type { AscensionStep, InitialData } from '@/types';
import FuelTank from '@/components/FuelTank.vue';
import StepHeader from '@/components/StepHeader.vue';

interface PurchaseLogEntry {
  siloNumber: number;
  cost: number;
  awayTimeBefore: number;
  awayTimeAfter: number;
}

export default defineComponent({
  components: {
    FuelTank,
    StepHeader,
  },
  props: {
    step: {
      type: Object as PropType<AscensionStep>,
      required: true,
    },
    previousSteps: {
      type: Array as PropType<AscensionStep[]>,
      default: () => [],
    },
    initialData: {
      type: Object as PropType<InitialData>,
      default: undefined,
    },
    arrivalTime: {
      type: Number,
      default: undefined,
    },
    departureTime: {
      type: Number,
      default: undefined,
    },
  },
  setup(props) {
    const siloIconUrl = import.meta.env.BASE_URL + 'static/img/silo.png';

    // Start with 1 silo for free
    const siloCount = ref(1);
    const purchaseLog = ref<PurchaseLogEntry[]>([]);

    // Silo Capacity epic research: +6 minutes per level, max 20 levels (from player data)
    const siloCapacityLevel = computed(() => props.initialData?.epicResearch?.siloCapacity || 0);

    const nextCost = computed(() => nextSiloCost(siloCount.value));

    const minutesPerSilo = computed(() =>
      awayTimePerSilo(siloCapacityLevel.value)
    );

    const totalAwayTimeMinutes = computed(() =>
      totalAwayTime(siloCount.value, siloCapacityLevel.value)
    );

    // Note: siloCapacityLevel is already a computed, so .value is correct

    const totalCost = computed(() =>
      purchaseLog.value.reduce((sum, entry) => sum + entry.cost, 0)
    );

    const buySilo = () => {
      if (siloCount.value >= 10) return;

      const cost = nextSiloCost(siloCount.value);
      const awayTimeBefore = totalAwayTime(siloCount.value, siloCapacityLevel.value);

      siloCount.value++;

      const awayTimeAfter = totalAwayTime(siloCount.value, siloCapacityLevel.value);

      purchaseLog.value.push({
        siloNumber: siloCount.value,
        cost,
        awayTimeBefore,
        awayTimeAfter,
      });
    };

    const undoLastPurchase = () => {
      if (purchaseLog.value.length === 0) return;
      purchaseLog.value.pop();
      siloCount.value = Math.max(1, siloCount.value - 1);
    };

    return {
      siloIconUrl,
      siloCount,
      siloCapacityLevel,
      purchaseLog,
      nextCost,
      minutesPerSilo,
      totalAwayTimeMinutes,
      totalCost,
      buySilo,
      undoLastPurchase,
      formatEIValue,
      formatSiloDuration,
    };
  },
});
</script>
