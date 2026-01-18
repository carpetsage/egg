import { trimTrailingZeros } from '@/lib';

export enum RoundingMode {
  Down = -1,
  Nearest = 0,
  Up = 1,
}

export function formatWithThousandSeparators(x: number, roundingMode = RoundingMode.Nearest): string {
  let rounded: number;
  switch (roundingMode) {
    case RoundingMode.Down:
      rounded = Math.floor(x);
      break;
    case RoundingMode.Nearest:
      rounded = Math.round(x);
      break;
    case RoundingMode.Up:
      rounded = Math.ceil(x);
      break;
  }
  return rounded.toLocaleString('en-US');
}

export function formatPercentage(x: number, maxDecimals = 2): string {
  const s = (x * 100).toFixed(maxDecimals);
  return trimTrailingZeros(s) + '%';
}
