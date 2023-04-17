import localforage from 'localforage';

localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'inventory-visualizer',
  version: 1,
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
