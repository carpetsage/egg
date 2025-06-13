import { trimTrailingZeros } from 'lib';

export function formatFloat(x: number, decimals = 3): string {
  if (isNaN(x)) {
    return 'NaN';
  }
  if (x < 0) {
    return '-' + formatFloat(-x, decimals);
  }
  if (!isFinite(x)) {
    return 'infinity';
  }
  if (x < 1e8) {
    return trimTrailingZeros(x.toFixed(decimals));
  } else {
    return x.toExponential(decimals);
  }
}

export function formatPercentage(x: number, decimals?: number): string {
  return formatFloat(x * 100, decimals) + '%';
}
