export function getLocalStorage(key: string, prefix?: string): string | undefined {
  if (prefix === undefined) {
    prefix = `${window.location.pathname}_`;
  }
  try {
    return localStorage[prefix + key];
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

export function getLocalStorageNoPrefix(key: string): string | undefined {
  return getLocalStorage(key, '');
}

export function setLocalStorage(key: string, val: unknown, prefix?: string): void {
  if (prefix === undefined) {
    prefix = `${window.location.pathname}_`;
  }
  try {
    localStorage[prefix + key] = val;
  } catch (err) {
    console.error(err);
  }
}

export function setLocalStorageNoPrefix(key: string, val: unknown): void {
  setLocalStorage(key, val, '');
}

export function deleteLocalStorage(key: string, prefix?: string): void {
  if (prefix === undefined) {
    prefix = `${window.location.pathname}_`;
  }
  try {
    localStorage.removeItem(prefix + key);
    delete localStorage[prefix + key];
  } catch (err) {
    console.error(err);
  }
}

export function deleteLocalStorageNoPrefix(key: string): void {
  deleteLocalStorage(key, '');
}

export function iconURL(relpath: string, size: number | string = 'orig', extension?: 'png' | 'svg' | 'webp'): string {
  if (extension) {
    relpath = relpath.replace(/\.[a-z]+$/, `.${extension}`);
  }
  // return `https://carpetsage.github.io/weirdassets/${size}/${relpath}`;
  // return `https://images.carpetsage.com/${size}/${relpath}`;:
  return `https://eggincassets.pages.dev/${size}/${relpath}`;
}

// Trim trailing zeros, and possibly the decimal point.
export function trimTrailingZeros(s: string): string {
  s = s.replace(/0+$/, '');
  if (s.endsWith('.')) {
    s = s.substring(0, s.length - 1);
  }
  return s;
}

export function titleCase(s: string): string {
  const title = s
    .toLowerCase()
    .split(/_|-| /)
    .map(x => (x.length > 3 ? x[0].toUpperCase() + x.substring(1) : x))
    .join(' ');
  return title[0].toUpperCase() + title.substring(1);
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
