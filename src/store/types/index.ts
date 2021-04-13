import * as contracts from '../modules/contracts';
import * as coopConfig from '../modules/coopConfig';
import * as coopSelector from '../modules/coopSelector';
import * as devmode from '../modules/devmode';
import * as theme from '../modules/theme';

export interface RootState {
  contracts: contracts.State;
  coopConfig: coopConfig.State;
  coopSelector: coopSelector.State;
  devmode: devmode.State;
  theme: theme.State;
}
