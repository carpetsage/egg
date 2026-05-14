import { TE_BREAKPOINTS, countTEThresholdsPassed, getThresholdForTE } from '@/lib/truthEggs';

/**
 * Given a constant ELR, how many TE are earned in a given time?
 */
export function computeTEEarned(
  currentEggsDelivered: number,
  elrPerSecond: number,
  durationSeconds: number,
): { teEarned: number; finalEggsDelivered: number } {
  const finalEggsDelivered = currentEggsDelivered + elrPerSecond * durationSeconds;
  const startTE = countTEThresholdsPassed(currentEggsDelivered);
  const endTE = countTEThresholdsPassed(finalEggsDelivered);
  
  return {
    teEarned: endTE - startTE,
    finalEggsDelivered,
  };
}

/**
 * How long to earn N more TE at a constant ELR?
 */
export function timeToEarnTE(
  currentEggsDelivered: number,
  elrPerSecond: number,
  targetAdditionalTE: number,
): number {
  if (targetAdditionalTE <= 0) return 0;
  if (elrPerSecond <= 0) return Infinity;

  const currentTE = countTEThresholdsPassed(currentEggsDelivered);
  const targetTE = currentTE + targetAdditionalTE;
  
  // If target exceeds max TE per egg
  if (targetTE > TE_BREAKPOINTS.length) return Infinity;

  const targetThreshold = getThresholdForTE(targetTE);
  const needed = targetThreshold - currentEggsDelivered;
  
  return Math.max(0, needed / elrPerSecond);
}

/**
 * Given a variable ELR (changes at specific timestamps), track TE earned.
 */
export function computeTEEarnedVariableRate(
  currentEggsDelivered: number,
  elrSegments: { startTime: number; endTime: number; elrPerSecond: number }[],
): { teEarned: number; finalEggsDelivered: number } {
  let eggsDelivered = currentEggsDelivered;
  const startTE = countTEThresholdsPassed(currentEggsDelivered);

  for (const segment of elrSegments) {
    const duration = segment.endTime - segment.startTime;
    if (duration > 0) {
      eggsDelivered += segment.elrPerSecond * duration;
    }
  }

  const endTE = countTEThresholdsPassed(eggsDelivered);
  
  return {
    teEarned: endTE - startTE,
    finalEggsDelivered: eggsDelivered,
  };
}
