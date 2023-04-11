import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from '@/lib';
import { ActionTree, Module, MutationTree } from 'vuex';

import { RootState } from '../types';

const SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY = 'sitewideNavFirstUsed';

export interface State {
  open: boolean;
  used: boolean;
}

const state: State = {
  open: false,
  used: getLocalStorageNoPrefix(SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY) !== undefined,
};

const getters = {};

const actions: ActionTree<State, RootState> = {
  open({ commit, state }) {
    commit('open');
    if (!state.used) {
      commit('setUsed');
      setLocalStorageNoPrefix(SITEWIDE_NAV_FIRST_USED_LOCALSTORAGE_KEY, Date.now());
    }
  },

  close({ commit }) {
    commit('close');
  },
};

const mutations: MutationTree<State> = {
  open(state) {
    state.open = true;
  },

  close(state) {
    state.open = false;
  },

  setUsed(state) {
    state.used = true;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
