// ============================================================
// Path of Virtue Optimizer — Objective Function
// ============================================================
//

// ------------------------------------------------------------
// Poisson helpers
// ------------------------------------------------------------

/**
 * P(X >= k) where X ~ Poisson(lambda).
 * Returns the probability of accumulating AT LEAST k drops
 * when the expected number of drops is lambda.
 *
 * Uses the complementary CDF:
 *   P(X >= k) = 1 - sum_{x=0}^{k-1} e^{-λ} * λ^x / x!
 *
 * For k == 0 the result is trivially 1.0.
 */
export function poissonAtLeast(lambda: number, k: number): number {
  if (k <= 0) return 1.0;
  if (lambda <= 0) return 0.0;

  // Compute sum of Poisson PMF terms for x = 0 … k-1 in log space to
  // avoid underflow for large lambda or k.
  let logTerm = -lambda; // log(e^{-λ} * λ^0 / 0!)
  let cdf = Math.exp(logTerm); // P(X == 0)

  for (let x = 1; x < k; x++) {
    logTerm += Math.log(lambda) - Math.log(x);
    cdf += Math.exp(logTerm);
    // Early exit: if cdf is already negligibly close to 1 the complement
    // will round to 0, which is correct.
    if (cdf >= 1.0 - Number.EPSILON) return 0.0;
  }

  return Math.max(0, 1 - cdf);
}
