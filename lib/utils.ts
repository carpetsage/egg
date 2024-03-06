export function getLocalStorage(
  key: string,
  prefix?: string,
): string | undefined {
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
  return getLocalStorage(key, "");
}

export function setLocalStorage(
  key: string,
  val: unknown,
  prefix?: string,
): void {
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
  setLocalStorage(key, val, "");
}

export function iconURL(
  relpath: string,
  size: number | string = "orig",
  extension?: "png" | "svg" | "webp",
): string {
  if (extension) {
    relpath = relpath.replace(/\.[a-z]+$/, `.${extension}`);
  }
  if (/icon_dilithium_bulb/.test(relpath)) {
    return `https://imagedelivery.net/3eHDWErDPIKAYL6ofL-Kwg/${size}/egginc/b_icon_dilithium_bulb.png/public`;
  } else if (/sub_icon/.test(relpath)) {
    return `https://imagedelivery.net/3eHDWErDPIKAYL6ofL-Kwg/${size}/egginc/sub_icon.png/public`;
  } else if (/atreggies/.test(relpath)) {
    return `https://imagedelivery.net/3eHDWErDPIKAYL6ofL-Kwg/${size}/${relpath}/public`;
  }
  return `https://eggincassets.tcl.sh/${size}/${relpath}`;
}

// Trim trailing zeros, and possibly the decimal point.
export function trimTrailingZeros(s: string): string {
  s = s.replace(/0+$/, "");
  if (s.endsWith(".")) {
    s = s.substring(0, s.length - 1);
  }
  return s;
}

export function titleCase(s: string): string {
  const title = s.toLowerCase().split(/_|-| /).map((x) =>
    x.length > 3 ? x[0].toUpperCase() + x.substring(1) : x
  ).join(" ");
  return title[0].toUpperCase() + title.substring(1);
}
