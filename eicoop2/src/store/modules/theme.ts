import { Module, MutationTree } from 'vuex';

import { RootState } from '../types';

export interface State {
  darkThemeOn: boolean;
}

const state: State = {
  darkThemeOn: false,
};

const getters = {};

const actions = {};

const mutations: MutationTree<State> = {
  setDarkTheme(state) {
    state.darkThemeOn = true;
  },

  setLightTheme(state) {
    state.darkThemeOn = false;
  },

  toggle(state) {
    state.darkThemeOn = !state.darkThemeOn;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
