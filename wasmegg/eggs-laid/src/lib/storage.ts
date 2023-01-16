import localforage from 'localforage';

localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'rockets-tracker',
  version: 1,
  //   storeName: 'keyvaluepairs',
});

export async function getLocalForage<T>(key: string): Promise<T | null> {
  const prefix = `${window.location.pathname}_`;
  try {
    return await localforage.getItem<T>(prefix + key);
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function setLocalForage(key: string, val: unknown): Promise<void> {
  const prefix = `${window.location.pathname}_`;
  try {
    await localforage.setItem(prefix + key, val);
  } catch (err) {
    console.error(err);
  }
}
