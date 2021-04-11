import { ActionTree, Module, MutationTree } from 'vuex';

import { getLocalStorage, setLocalStorage } from '@/utils';

import { RootState } from '../types';

const PREFIX = 'coopConfig-';
const SHOW_CONFIG_KEY = 'showConfig';
const SHOW_ROLE_COLUMN_KEY = 'showRoleColumn';

export interface State {
  showConfig: boolean;
  showRoleColumn: boolean;
}

const state: State = {
  showConfig: getLocalStorage(SHOW_CONFIG_KEY, PREFIX) !== 'false',
  showRoleColumn: getLocalStorage(SHOW_ROLE_COLUMN_KEY, PREFIX) !== 'false',
};

const getters = {};

const actions: ActionTree<State, RootState> = {
  toggleShowConfig({ commit, state }) {
    commit('toggleShowConfig');
    setLocalStorage(SHOW_CONFIG_KEY, state.showConfig, PREFIX);
  },

  toggleShowRoleColumn({ commit, state }) {
    commit('toggleShowRoleColumn');
    setLocalStorage(SHOW_ROLE_COLUMN_KEY, state.showRoleColumn, PREFIX);
  },
};

const mutations: MutationTree<State> = {
  toggleShowConfig(state) {
    state.showConfig = !state.showConfig;
  },

  toggleShowRoleColumn(state) {
    state.showRoleColumn = !state.showRoleColumn;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
