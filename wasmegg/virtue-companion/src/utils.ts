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

export function formatDurationAuto(seconds: number): string {
  if (seconds < 0) {
    return '-' + formatDurationAuto(-seconds);
  }
  // More than 10 years is forever
  if (!isFinite(seconds) || seconds > 315_360_000) {
    return '>10y';
  }

  if (seconds < 60) {
    // Less than 1 minute
    return Math.round(seconds) + 's';
  } else if (seconds < 3600) {
    // Less than 1 hour, show minutes and seconds
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m${secs}s` : `${mins}m`;
  } else if (seconds < 86400) {
    // Less than 1 day, show hours and minutes (no seconds)
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  } else {
    // 1 day or more, show days and hours (no minutes/seconds)
    const days = Math.floor(seconds / 86400);
    const hours = Math.round((seconds % 86400) / 3600);
    return hours > 0 ? `${days}d${hours}h` : `${days}d`;
  }
}
