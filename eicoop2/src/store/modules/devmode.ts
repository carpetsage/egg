import { ActionTree, Module, MutationTree } from 'vuex';

import { getLocalStorage, setLocalStorage } from '@/lib';

import { RootState } from '../types';

const DEVMODE_KEY = 'devmode';

export interface State {
  on: boolean;
}

const state: State = {
  on: getLocalStorage(DEVMODE_KEY, '') === 'true',
};

const getters = {};

const actions: ActionTree<State, RootState> = {
  enablePermanently({ commit, state }) {
    commit('enable');
    setLocalStorage(DEVMODE_KEY, state.on, '');
  },

  disableTemporarily({ commit }) {
    commit('disable');
  },
};

const mutations: MutationTree<State> = {
  enable(state) {
    state.on = true;
  },

  disable(state) {
    state.on = false;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
