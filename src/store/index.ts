import { InjectionKey } from 'vue';
import { createStore, createLogger, Store } from 'vuex';

import { RootState } from './types';
import contracts from './modules/contracts';
import coopConfig from './modules/coopConfig';
import coopSelector from './modules/coopSelector';
import devmode from './modules/devmode';
import theme from './modules/theme';

export const key: InjectionKey<Store<RootState>> = Symbol();

export const store = createStore<RootState>({
  modules: {
    contracts,
    coopConfig,
    coopSelector,
    devmode,
    theme,
  },
  strict: import.meta.env.DEV,
  plugins: import.meta.env.DEV ? [createLogger()] : [],
});
