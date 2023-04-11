import { ActionTree, Module, MutationTree } from 'vuex';

import { RootState } from '../types';

export interface State {
  showModal: boolean;
  selectedContractId: string;
}

const state: State = {
  showModal: false,
  selectedContractId: '',
};

const getters = {};

const actions: ActionTree<State, RootState> = {
  selectContractAndShow({ commit }, contractId: string) {
    commit('selectContract', contractId);
    commit('show');
  },
};

const mutations: MutationTree<State> = {
  show(state) {
    state.showModal = true;
  },

  hide(state) {
    state.showModal = false;
  },

  toggle(state) {
    state.showModal = !state.showModal;
  },

  selectContract(state, contractId: string) {
    state.selectedContractId = contractId;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
