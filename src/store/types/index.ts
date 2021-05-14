import * as contracts from '../modules/contracts';
import * as coopSelector from '../modules/coopSelector';
import * as devmode from '../modules/devmode';
import * as history from '../modules/history';
import * as theme from '../modules/theme';

export interface RootState {
  contracts: contracts.State;
  coopSelector: coopSelector.State;
  devmode: devmode.State;
  history: history.State;
  theme: theme.State;
}
