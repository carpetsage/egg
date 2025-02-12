import { eggName, eggValue, ei, formatEIValue, trimTrailingZeros } from './lib';

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

export function setSessionStorage(key: string, val: unknown, prefix?: string): void {
  if (prefix === undefined) {
    prefix = `${window.location.pathname}_`;
  }
  try {
    sessionStorage[prefix + key] = val;
  } catch (err) {
    console.error(err);
  }
}

export function iconURL(relpath: string, size: number | string = 'orig'): string {
  return `https://eggincassets.pages.dev/${size}/${relpath}`;
}

export function eggTooltip(egg: ei.Egg, custom_egg_id?: string | null): string {
  const value = eggValue(egg, custom_egg_id);
  const valueDisplay =
    value < 0.01
      ? value.toFixed(7)
      : value < 100
        ? trimTrailingZeros(value.toFixed(2))
        : formatEIValue(value, { trim: true });
  return `${eggName(egg, custom_egg_id)} Egg, value: ${valueDisplay}`;
}

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

// If the string is entirely HTML whitespace (and hence entirely collapsed by
// default), replace it with &nbsp; so that we have a select target.
export function renderNonempty(s: string): string {
  // ASCII whitespace in the HTML context is U+0009 TAB, U+000A LF, U+000C FF,
  // U+000D CR, or U+0020 SPACE.
  // https://developer.mozilla.org/en-US/docs/Glossary/Whitespace
  // http://infra.spec.whatwg.org/#ascii-whitespace
  return !s.match(/^[\t\n\f\r ]*$/) ? s : '\u00a0';
}
