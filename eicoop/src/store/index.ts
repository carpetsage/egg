import { InjectionKey } from 'vue';
import { createStore, createLogger, Store } from 'vuex';

import { RootState } from './types';
import contracts from './modules/contracts';
import coopSelector from './modules/coopSelector';
import devmode from './modules/devmode';
import history from './modules/history';
import notifications from './modules/notifications';
import theme from './modules/theme';

export type { HistoryCoopEntry } from './modules/history';

export const key: InjectionKey<Store<RootState>> = Symbol();

export const store = createStore<RootState>({
  modules: {
    contracts,
    coopSelector,
    devmode,
    history,
    notifications,
    theme,
  },
  strict: import.meta.env.DEV,
  plugins: import.meta.env.DEV ? [createLogger()] : [],
});
