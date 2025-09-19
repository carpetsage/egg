const TE_BREAKPOINTS = [
  5e7, // 50M
  1e9, // 1B
  1e10, // 10B
  7e10, // 70B
  5e11, // 500B
  2e12, // 2T
];

// TE-only pass count (<= 100q)
function countTETiersPassed(delivered: number) {
  let i = 0;
  while (i < TE_BREAKPOINTS.length && delivered >= TE_BREAKPOINTS[i]) i++;
  return i;
}

// Pending TE calculation per egg
export function pendingTruthEggs(delivered: number, earnedTE: number) {
  const tiersPassed = countTETiersPassed(delivered);

  if (earnedTE < TE_BREAKPOINTS.length) {
    // Only base matters until all base are earned
    return Math.max(0, tiersPassed - earnedTE);
  }
}

export function nextTruthEggThreshold(delivered: number) {
  const tiersPassed = countTETiersPassed(delivered);

  if (tiersPassed >= TE_BREAKPOINTS.length) {
    return Infinity;
  }

  return TE_BREAKPOINTS[tiersPassed];
}
