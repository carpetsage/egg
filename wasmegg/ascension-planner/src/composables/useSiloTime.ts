/**
 * Composable for Silo Time calculations.
 * Calculates total offline/away time based on silos owned and silo capacity epic research.
 */

import { computed, type ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useInitialStateStore } from '@/stores/initialState';
import { useSilosStore, awayTimePerSilo, totalAwayTime, formatSiloTime, MAX_SILOS, nextSiloCost } from '@/stores/silos';

/**
 * Input for silo time calculation.
 */
export interface SiloTimeInput {
  siloCount: number;
  siloCapacityLevel: number;
}

/**
 * Output from silo time calculation.
 */
export interface SiloTimeOutput {
  siloCount: number;
  maxSilos: number;
  siloCapacityLevel: number;
  minutesPerSilo: number;
  totalMinutes: number;
  totalHours: number;
  formatted: string;
  canBuyMore: boolean;
  nextSiloCost: number;
}

/**
 * Composable that provides reactive silo time calculations.
 * Automatically recomputes when silos or epic research changes.
 */
export function useSiloTime(): {
  input: ComputedRef<SiloTimeInput>;
  output: ComputedRef<SiloTimeOutput>;
} {
  const initialStateStore = useInitialStateStore();
  const silosStore = useSilosStore();

  const { siloCount } = storeToRefs(silosStore);
  const { epicResearchLevels } = storeToRefs(initialStateStore);

  // Build the calculation input reactively
  const input = computed<SiloTimeInput>(() => ({
    siloCount: siloCount.value,
    siloCapacityLevel: epicResearchLevels.value['silo_capacity'] || 0,
  }));

  // Calculate output reactively
  const output = computed<SiloTimeOutput>(() => {
    const { siloCount, siloCapacityLevel } = input.value;
    const minutesPerSilo = awayTimePerSilo(siloCapacityLevel);
    const totalMinutes = totalAwayTime(siloCount, siloCapacityLevel);

    return {
      siloCount,
      maxSilos: MAX_SILOS,
      siloCapacityLevel,
      minutesPerSilo,
      totalMinutes,
      totalHours: totalMinutes / 60,
      formatted: formatSiloTime(totalMinutes),
      canBuyMore: siloCount < MAX_SILOS,
      nextSiloCost: nextSiloCost(siloCount),
    };
  });

  return {
    input,
    output,
  };
}
