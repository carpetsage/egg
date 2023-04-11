import { GetterTree, Module, MutationTree } from 'vuex';

import { RootState } from '../types';

type Notification = {
  id: number;
  key?: string;
  message: string;
};

export interface State {
  notifications: Notification[];
}

const state: State = {
  notifications: [],
};

const getters: GetterTree<State, RootState> = {};

const actions = {};

let index = 0;

const mutations: MutationTree<State> = {
  // Update existing notification if key already exists; add a new notification
  // otherwise.
  upsert(state, { message, key }: { message: string; key?: string }) {
    if (key) {
      for (const notification of state.notifications) {
        if (notification.key === key) {
          notification.message = message;
          return;
        }
      }
    }
    state.notifications.push({
      id: index,
      key,
      message,
    });
    index++;
  },

  dismiss(state, id: number) {
    state.notifications = state.notifications.filter(notification => notification.id !== id);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
} as Module<State, RootState>;
