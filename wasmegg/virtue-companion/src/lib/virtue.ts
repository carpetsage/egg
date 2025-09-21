export const TE_BREAKPOINTS = [
  5e7, // 50M
  1e9, // 1B
  1e10, // 10B
  7e10, // 70B
  5e11, // 500B
  2e12, // 2T
  7e12, // 7T
  2e13, // 20T
  6e13, // 60T
  1.5e14, // 150T
  5e14, // 500T
  1.5e15, // 1.5q
  4e15, // 4q
  1e16, // 10q
  2.5e16, // 25q
  5e16, // 50q
  1e17, // 100q
];

const BASE_COUNT = TE_BREAKPOINTS.length;
const TAIL_START = 1e17; // 100q
const q = 1e15; // 1q

// Base-only pass count (<= 100q)
function countBasePassed(delivered: number) {
  let i = 0;
  while (i < BASE_COUNT && delivered >= TE_BREAKPOINTS[i]) i++;
  return i;
}

// Extra passes *after* 100q following +50q, +60q, +70q... pattern
function countTailPassed(delivered: number) {
  if (delivered < TAIL_START) return 0;
  let count = 0;
  let current = TAIL_START; // last threshold hit
  let inc = 50 * q; // next increment (+50q)
  while (current + inc <= delivered) {
    current += inc;
    count++;
    inc += 10 * q; // increment grows by +10q each step
    if (!Number.isFinite(current) || !Number.isFinite(inc)) break;
  }
  return count;
}

// Pending TE calculation per egg
export function pendingTruthEggs(delivered: number, earnedTE: number) {
  const basePassed = countBasePassed(delivered);

  if (earnedTE < BASE_COUNT) {
    // Only base matters until all base are earned
    return Math.max(0, basePassed - earnedTE);
  }

  // All base earned — any extra pending comes from tail beyond 100q
  const tailPassed = countTailPassed(delivered);
  return tailPassed;
}

export function nextTruthEggThreshold(delivered: number) {
  const tiersPassed = countBasePassed(delivered) + countTailPassed(delivered);

  if (tiersPassed >= 99) {
    return Infinity;
  }

  return TE_BREAKPOINTS[tiersPassed];
}
