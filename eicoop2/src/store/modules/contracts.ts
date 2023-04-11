import { GetterTree, Module, MutationTree } from 'vuex';

import { RootState } from '../types';
import { ei, rawContractList, SortedContractList } from '@/lib';

export interface State {
  list: SortedContractList;
}

const state: State = {
  list: new SortedContractList(rawContractList),
};

const getters: GetterTree<State, RootState> = {
  list(state) {
    return [...state.list];
  },

  deduplicatedList(state) {
    return state.list.deduplicated();
  },
};

const actions = {};

const mutations: MutationTree<State> = {
  addContract(state, contract: ei.IContract) {
    state.list.add(contract);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
