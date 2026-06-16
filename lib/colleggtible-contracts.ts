/**
 * Static, build-time-generated set of colleggtible contracts.
 *
 * Background: the game API no longer populates `LocalContract.contract`
 * in the backup payload. Rather than calling `/ei_ctx/get_contracts_info`
 * to resolve just the colleggtible subset, we ship the colleggtible slice
 * of `contracts.json` and decode the contract protos locally.
 *
 * This file consumes the JSON emitted by the `colleggtible-contracts`
 * command in `periodicals/main.go`, which cross-references
 * `data/contracts.json` against `data/customeggs.json`. The output is
 * checked into the repo; regenerate it with
 * `cd periodicals && make colleggtible-contracts` (or by running any
 * periodicals-fetching command, which auto-regenerates).
 */

import colleggtibleContracts from './colleggtible-contracts.json';
import { ei } from './proto';
import { decodeMessage } from './api/decode';

interface ColleggtibleContractStore {
  id: string;
  proto: string;
}

const data = colleggtibleContracts as ColleggtibleContractStore[];

export const COLLEGGTIBLE_CONTRACT_MAP: ReadonlyMap<string, ei.IContract> = (() => {
  const map = new Map<string, ei.IContract>();
  for (const store of data) {
    if (!store.id || !store.proto) {
      continue;
    }
    try {
      const contract = decodeMessage(ei.Contract, store.proto, true) as ei.IContract;
      if (contract.identifier) {
        map.set(contract.identifier, contract);
      }
    } catch {
      // Tolerant of malformed entries; skip them.
    }
  }
  return map;
})();

export const COLLEGGTIBLE_CONTRACT_IDENTIFIERS: ReadonlySet<string> = new Set(
  COLLEGGTIBLE_CONTRACT_MAP.keys()
);
