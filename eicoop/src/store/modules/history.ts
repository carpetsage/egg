import { ActionTree, Module, MutationTree } from 'vuex';

import { ei } from '@/lib';
import { getLocalStorage, setLocalStorage } from '@/utils';

import { RootState } from '../types';

const MAX_COOP_ENTRIES = 5;

const PREFIX = 'history-';
const COOPS_KEY = 'coops';

export interface HistoryCoopEntry {
  contractId: string;
  contractName: string;
  contractEgg: ei.Egg;
  coopCode: string;
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
        })
      )
    ),
    PREFIX
  );
}

const state: State = {
  coops: loadCoopsFromLocalStorage(),
};

const getters = {};

const actions: ActionTree<State, RootState> = {
  addCoop({ commit, state }, newEntry: HistoryCoopEntry) {
    commit('addCoop', newEntry);
    persistCoopsToLocalStorage(state.coops);
  },
};

const mutations: MutationTree<State> = {
  addCoop(state, newEntry: HistoryCoopEntry) {
    // Remove existing matching entries.
    let i = 0;
    while (i < state.coops.length) {
      const entry = state.coops[i];
      if (entry.contractId === newEntry.contractId && entry.coopCode === newEntry.coopCode) {
        state.coops.splice(i, 1);
      } else {
        i++;
      }
    }
    state.coops.unshift(newEntry);
    while (state.coops.length > MAX_COOP_ENTRIES) {
      state.coops.pop();
    }
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
