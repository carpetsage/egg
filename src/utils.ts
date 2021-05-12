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

export function setLocalStorage(key: string, val: any, prefix?: string) {
  if (prefix === undefined) {
    prefix = `${window.location.pathname}_`;
  }
  try {
    localStorage[prefix + key] = val;
  } catch (err) {
    console.error(err);
  }
}

export function getSessionStorage(key: string, prefix?: string): string | undefined {
  if (prefix === undefined) {
    prefix = `${window.location.pathname}_`;
  }
  try {
    return sessionStorage[prefix + key];
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

export function setSessionStorage(key: string, val: any, prefix?: string) {
  if (prefix === undefined) {
    prefix = `${window.location.pathname}_`;
  }
  try {
    sessionStorage[prefix + key] = val;
  } catch (err) {
    console.error(err);
  }
}

export function iconURL(relpath: string, size: number | string = 'orig') {
  return `https://eggincassets.tcl.sh/${size}/${relpath}`;
}

export enum RoundingMode {
  Down = -1,
  Nearest = 0,
  Up = 1,
}

export function formatWithThousandSeparators(
  x: number,
  roundingMode = RoundingMode.Nearest
): string {
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
