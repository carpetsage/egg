import { trimTrailingZeros } from 'lib';

export function formatFloat(x: number, decimals = 3): string {
  return trimTrailingZeros(x.toFixed(decimals));
}

export function formatPercentage(x: number, decimals?: number): string {
  return formatFloat(x * 100, decimals) + '%';
}
