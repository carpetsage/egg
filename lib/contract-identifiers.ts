/**
 * Static, build-time-generated set of contract identifiers that the
 * egg-fresh client should resolve via /ei_ctx/get_contracts_info for
 * colleggtible bonuses.
 *
 * Background: the game API no longer populates `LocalContract.contract`
 * in the backup payload. The egg-fresh client calls
 * `requestContractsInfo` to fill in the resolved `Contract` for selected
 * contracts — but most tools only need the colleggtible subset. Resolving
 * the entire archive would burn auth-worker quota for no benefit.
 *
 * This file consumes the JSON emitted by the `contract-identifiers`
 * command in `periodicals/main.go`, which cross-references
 * `data/contracts.json` (which contracts use a customEggId) against
 * `data/customeggs.json` (which identifiers are known custom eggs). The
 * output is a small JSON file checked into the repo; regenerate it with
 * `cd periodicals && make contract-identifiers` (or by running any
 * periodicals-fetching command, which auto-regenerates).
 */

import contractIdentifiers from './contract-identifiers.json';

interface ContractIdentifiersJson {
  colleggtible: string[];
}

const data = contractIdentifiers as ContractIdentifiersJson;

export const COLLEGGTIBLE_CONTRACT_IDENTIFIERS: ReadonlySet<string> = new Set(data.colleggtible);
