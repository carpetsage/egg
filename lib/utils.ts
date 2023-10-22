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

export function iconURL(
  relpath: string,
  size: number | string = 'orig',
  extension?: 'png' | 'svg' | 'webp'
): string {
  if (extension) {
    relpath = relpath.replace(/\.[a-z]+$/, `.${extension}`);
  }
  if (/icon_dilithium_bulb/.test(relpath)) {
    return 'https://imagedelivery.net/3eHDWErDPIKAYL6ofL-Kwg/f9be3c0a-0bac-483f-b0b2-143356ccd800/public';
  }
  else if (/sub_icon/.test(relpath)) {
    return 'https://imagedelivery.net/3eHDWErDPIKAYL6ofL-Kwg/3b23e937-69ad-42e4-0034-841d6d494600/public';
  }
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

export function titleCase(s: string): string {
  return s.toLowerCase().split(/_|-| /).map(x => x[0].toUpperCase() + x.substring(1)).join(' ');
}
