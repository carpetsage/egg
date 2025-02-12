import { defineStore } from 'pinia';
import { ei, getLocalStorage, setLocalStorage } from '@/lib';

const MAX_COOP_ENTRIES = 5;

const PREFIX = 'history-';
const COOPS_KEY = 'coops';

export interface HistoryCoopEntry {
  contractId: string;
  contractName: string;
  contractEgg: ei.Egg;
  customEggId?: string | null;
  coopCode: string;
  grade?: string;
}

export interface State {
  coops: HistoryCoopEntry[];
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x != null;
}

function isHistoryCoopEntry(x: unknown): x is HistoryCoopEntry {
  return (
    isObject(x) &&
    x.contractId !== undefined &&
    x.contractName !== undefined &&
    x.contractEgg !== undefined &&
    x.coopCode !== undefined
  );
}

function loadCoopsFromLocalStorage(): HistoryCoopEntry[] {
  try {
    const stored = getLocalStorage(COOPS_KEY, PREFIX);
    const parsed = JSON.parse(stored || '[]');
    if (!Array.isArray(parsed)) {
      throw new Error(`${PREFIX}-${COOPS_KEY}: not an array: ${stored}`);
    }
    const entries: HistoryCoopEntry[] = [];
    for (const entry of parsed) {
      if (isHistoryCoopEntry(entry)) {
        entries.push(entry);
      } else {
        console.warn(`${PREFIX}-${COOPS_KEY}: not a valid HistoryCoopEntry: ${entry}`);
      }
    }
    return entries;
  } catch (e) {
    console.warn(e);
    return [];
  }
}

function persistCoopsToLocalStorage(coops: HistoryCoopEntry[]) {
  setLocalStorage(
    COOPS_KEY,
    JSON.stringify(
      coops.map(
        // Strip unnecessary fields, if any.
        (e: HistoryCoopEntry): HistoryCoopEntry => ({
          contractId: e.contractId,
          contractName: e.contractName,
          contractEgg: e.contractEgg,
          coopCode: e.coopCode,
          customEggId: e.customEggId,
        })
      )
    ),
    PREFIX
  );
}

export const useHistoryStore = defineStore('history', {
  state: (): State => ({
    coops: loadCoopsFromLocalStorage(),
  }),
  actions: {
    persistCoop(newEntry: HistoryCoopEntry) {
      this.addCoop(newEntry);
      persistCoopsToLocalStorage(this.coops);
    },
    addCoop(newEntry: HistoryCoopEntry) {
      // Remove existing matching entries.
      let i = 0;
      while (i < this.coops.length) {
        const entry = this.coops[i];
        if (entry.contractId === newEntry.contractId && entry.coopCode === newEntry.coopCode) {
          this.coops.splice(i, 1);
        } else {
          i++;
        }
      }
      this.coops.unshift(newEntry);
      while (this.coops.length > MAX_COOP_ENTRIES) {
        this.coops.pop();
      }
    },
  },
});

export default useHistoryStore;
