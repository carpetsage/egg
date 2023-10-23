/**
 * Format duration in the form of XdXhXm.
 * @param seconds - Duration to be formatted, in seconds.
 * @param trim - Whether to trim zero components (e.g. 1d0h5m to 1d5m).
 * @returns
 */
export function formatDuration(seconds: number, trim = false): string {
  if (seconds < 0) {
    return '-' + formatDuration(-seconds);
  }
  if (seconds < 60) {
    return trim ? '0m' : '0d0h0m';
  }
  if (!isFinite(seconds)) {
    return 'Forever';
  }
  if (seconds > 31_536_000_000) {
    return '>1000yr';
  }
  const yy = Math.floor(seconds / 31_536_000);
  seconds -= yy * 31536000;
  const dd = Math.floor(seconds / 86400);
  seconds -= dd * 86400;
  const hh = Math.floor(seconds / 3600);
  seconds -= hh * 3600;
  const mm = Math.floor(seconds / 60);
  let s = '';
  if (!trim || yy > 0) {
    s += `${yy}y`;
  }
  if (!trim || dd > 0) {
    s += `${dd}d`;
  }
  // leave out hours/seconds for durations > 1yr
  if (!trim || yy < 1) {
    if (!trim || hh > 0) {
      s += `${hh}h`;
    }
    if (!trim || mm > 0) {
      s += `${mm}m`;
    }
  }
  return s;
}
