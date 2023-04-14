import { allPossibleTiers, iconURL } from 'lib';

import { getLocalForage, setLocalForage } from './storage';
import { webpSupported } from './webp';

const TIMEOUT = 5000;

// Returns a data URL on success.
async function downloadIcon(url: string): Promise<string> {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), TIMEOUT);
  let blob: Blob;
  try {
    const resp = await fetch(url, {
      mode: 'cors',
      signal: controller.signal,
    });
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`GET ${url}: HTTP ${resp.status}`);
    }
    blob = await resp.blob();
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`GET ${url}: timeout after ${TIMEOUT}ms.`);
    } else {
      throw new Error(`GET ${url}: ${e}`);
    }
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`error reading ${url}: ${reader.error}`));
    reader.readAsDataURL(blob);
  });
}

export async function loadIcon(url: string): Promise<{ dataURL: string; error: Error | null }> {
  const key = new URL(url).pathname;
  const stored = await getLocalForage<string>(key);
  if (stored !== null) {
    return { dataURL: stored, error: null };
  }
  let dataURL: string;
  try {
    dataURL = await downloadIcon(url);
  } catch (err) {
    console.error(err);
    return { dataURL: '', error: err instanceof Error ? err : new Error(`${err}`) };
  }
  await setLocalForage(key, dataURL);
  return { dataURL, error: null };
}

export async function loadAllIcons(): Promise<void> {
  const results = await Promise.all(
    allPossibleTiers.map(tier => loadIcon(afxIconURL('egginc/' + tier.icon_filename)))
  );
  const numErrors = results.reduce((n, result) => n + (result.error !== null ? 1 : 0), 0);
  if (numErrors > 0) {
    throw new Error(`failed to load ${numErrors} icons`);
  }
}

export async function loadStoredIcon(url: string): Promise<string> {
  const key = new URL(url).pathname;
  const stored = await getLocalForage<string>(key);
  if (stored !== null) {
    return stored;
  }
  throw new Error(`${url} not found in local store`);
}

export function afxIconURL(iconPath: string): string {
  return iconURL(iconPath, 256, webpSupported ? 'webp' : 'png');
}
