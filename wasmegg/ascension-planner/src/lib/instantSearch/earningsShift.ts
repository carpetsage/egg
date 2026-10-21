/**
 * How far a player's earnings artifacts are below the table's, in Clothed TE. Each TE is ×1.1 earnings
 * and Clothed TE is the earnings set's effects in the same log₁.₁ terms, so artifacts that earn 1.1^Δ
 * less are a table row Δ TE lower (table.ts `shiftedLookup`).
 *
 * The player's set is measured the way the table's was (buildTable/task.ts `cteBonusOf`): the
 * earnings artifacts, socketed from the whole lunar and shell stone pool.
 */
import type { ei } from 'lib';
import { cteFromArtifacts } from 'lib/virtue';
import { equippedArtifactsToLibArtifacts } from '@/lib/artifacts/utils';
import {
  buildLoadoutInputsFromBackup,
  seedFixedDeliveryFromAuto,
  socketEarningsStones,
  type AutoLoadoutInputs,
} from '@/auto/loadout';
import type { TableHeader } from './table';

/**
 * The artifacts and stones Chain Finder starts from for a save: its recommended earnings set, its
 * best delivery set as a fixed structure (what a table is built for), and its stones.
 */
export function chainFinderLoadoutFromBackup(backup: ei.IBackup): AutoLoadoutInputs {
  const inputs = buildLoadoutInputsFromBackup(backup);
  return { ...inputs, delivery: { mode: 'fixed', artifactIds: seedFixedDeliveryFromAuto(inputs) } };
}

/** Clothed TE of the earnings set socketed from the stone pool (artifacts only). */
export function earningsCTE(inputs: AutoLoadoutInputs): number {
  return cteFromArtifacts(equippedArtifactsToLibArtifacts(socketEarningsStones(inputs.earnings, inputs.stones)));
}

/**
 * Clothed TE the earnings artifacts are below the table's, to two places like the header's
 * `cteBonus`; 0 with no inputs. Never below 0: the tables are built on maxed artifacts.
 */
export function earningsShift(inputs: AutoLoadoutInputs | null, header: Pick<TableHeader, 'cteBonus'>): number {
  if (!inputs) return 0;
  return Math.max(0, Number((header.cteBonus - earningsCTE(inputs)).toFixed(2)));
}

/** Whether the inputs' fixed delivery set is the one the table was built with (any order). A table
 *  can't be adjusted for another: C3 buys different research for it. */
export function deliveryMatchesTable(inputs: AutoLoadoutInputs, header: Pick<TableHeader, 'delivery'>): boolean {
  if (!header.delivery || inputs.delivery.mode !== 'fixed') return true;
  const ids = (list: (string | null)[]) => list.filter((id): id is string => !!id).sort().join(',');
  return ids(inputs.delivery.artifactIds) === ids(header.delivery);
}
