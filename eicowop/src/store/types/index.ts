import * as contracts from '../modules/contracts';
import * as coopSelector from '../modules/coopSelector';
import * as devmode from '../modules/devmode';
import * as history from '../modules/history';
import * as notifications from '../modules/notifications';
import * as sitewideNav from '../modules/sitewideNav';
import * as theme from '../modules/theme';

export interface RootState {
  contracts: contracts.State;
  coopSelector: coopSelector.State;
  devmode: devmode.State;
  history: history.State;
  notifications: notifications.State;
  sitewideNav: sitewideNav.State;
  theme: theme.State;
}
