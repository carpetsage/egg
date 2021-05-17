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

export function iconURL(relpath: string, size: number | string = 'orig'): string {
  return `https://eggincassets.tcl.sh/${size}/${relpath}`;
}

// Trim trailing zeros, and possibly the decimal point.
export function trimTrailingZeros(s: string): string {
  s = s.replace(/0+$/, '');
  if (s.endsWith('.')) {
    s = s.substring(0, s.length - 1);
  }
  return s;
}
