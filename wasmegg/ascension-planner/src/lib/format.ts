/**
 * Formatting utility functions.
 * Pure functions for converting values to display strings.
 */

/**
 * Format a large number with suffixes (K, M, B, T, etc.) or scientific notation.
 *
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 *
 * @example
 * formatNumber(1234) // "1.23K"
 * formatNumber(1234567890) // "1.23B"
 * formatNumber(1e20) // "1.00e+20"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (value === 0) return '0';
  if (!isFinite(value)) return '∞';

  if (value < 1000) {
    return value.toFixed(decimals);
  }

  const suffixes = ['', 'K', 'M', 'B', 'T', 'q', 'Q', 's', 'S', 'o', 'N', 'd', 'U', 'D'];
  const magnitude = Math.floor(Math.log10(Math.abs(value)) / 3);

  if (magnitude >= suffixes.length) {
    return value.toExponential(decimals);
  }

  const scaled = value / Math.pow(1000, magnitude);
  return scaled.toFixed(decimals) + suffixes[magnitude];
}

/**
 * Format a multiplier for display.
 *
 * @param value - The multiplier value (1.0 = no change)
 * @param asPercent - If true, show as percentage change (e.g., "+50%")
 * @returns Formatted string
 *
 * @example
 * formatMultiplier(2.5) // "2.50x"
 * formatMultiplier(1.5, true) // "+50.0%"
 * formatMultiplier(0.8, true) // "-20.0%"
 */
export function formatMultiplier(value: number, asPercent: boolean = false): string {
  if (asPercent) {
    const percent = (value - 1) * 100;
    return (percent >= 0 ? '+' : '') + percent.toFixed(1) + '%';
  }
  return value.toFixed(2) + 'x';
}

/**
 * Format a duration in seconds to human-readable form.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "5.2h", "3.5d")
 *
 * @example
 * formatDuration(45) // "45s"
 * formatDuration(3600) // "1.0h"
 * formatDuration(86400) // "1.0d"
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '∞';

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  if (days > 999) {
    return '>999d';
  }

  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Format a percentage value.
 *
 * @param value - The decimal value (0.5 = 50%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 *
 * @example
 * formatPercent(0.5) // "50%"
 * formatPercent(0.333, 1) // "33.3%"
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return (value * 100).toFixed(decimals) + '%';
}

/**
 * Parse a number from a string, handling scientific notation and suffixes.
 *
 * @param str - The string to parse
 * @returns Parsed number, or NaN if invalid
 *
 * @example
 * parseNumber("1.5K") // 1500
 * parseNumber("2.5e6") // 2500000
 */
export function parseNumber(str: string): number {
  // Case-sensitive suffix multipliers (q = quadrillion, Q = quintillion)
  const suffixMultipliers: Record<string, number> = {
    k: 1e3,
    K: 1e3,
    m: 1e6,
    M: 1e6,
    b: 1e9,
    B: 1e9,
    t: 1e12,
    T: 1e12,
    q: 1e15,  // quadrillion (lowercase)
    Q: 1e18,  // quintillion (uppercase)
    s: 1e21,
    S: 1e24,
    o: 1e27,
    N: 1e30,
    d: 1e33,
    U: 1e36,
    D: 1e39,
  };

  const trimmed = str.trim();
  const lastChar = trimmed.slice(-1);

  if (suffixMultipliers[lastChar] !== undefined) {
    const numPart = parseFloat(trimmed.slice(0, -1));
    return numPart * suffixMultipliers[lastChar];
  }

  return parseFloat(str);
}
