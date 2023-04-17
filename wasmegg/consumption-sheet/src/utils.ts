import { trimTrailingZeros } from 'lib';

export function formatFloat(x: number, opts?: { digits?: number; trim?: boolean }): string {
  const { digits = 0, trim = true } = opts ?? {};
  const s = x.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return digits > 0 && trim ? trimTrailingZeros(s) : s;
}
