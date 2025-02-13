import { useContractsStore } from './contracts';
import { useCoopSelectorStore } from './coopSelector';
import { useDevmodeStore } from './devmode';
import { useHistoryStore } from './history';
import { useNotificationsStore } from './notifications';
import { useSitewideNavStore } from './sitewideNav';
import { useThemeStore } from './theme';

const store = {
  contracts: useContractsStore(),
  coopSelector: useCoopSelectorStore(),
  devmode: useDevmodeStore(),
  history: useHistoryStore(),
  notifications: useNotificationsStore(),
  sitewideNav: useSitewideNavStore(),
  theme: useThemeStore(),
};

export default store;
