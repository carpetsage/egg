import { ei } from 'lib/proto';
import { getArtifact } from '@/lib/artifacts/data';
import type { AutoLoadoutInputs } from './types';

/** How one delivery slot is shown in the editor. */
export type DeliverySlotView =
  /** This artifact will be used (or was picked by the user). */
  | { kind: 'artifact'; artifactId: string }
  /**
   * One of several owned tiers/rarities of the same family, none better on both effect and stone
   * slots (e.g. T4R vs. T3E metronome). H1 picks based on research and stones.
   */
  | { kind: 'choice'; artifactIds: string[] }
  /** A stone holder: more owned holders than free slots, so H1 picks `pick` of these. */
  | { kind: 'holder'; artifactIds: string[]; pick: number }
  | { kind: 'empty' };

/**
 * What the editor shows for the delivery set — read straight off the candidate pool, with no ELR
 * search and no research levels. Target families come first, one slot each; the slots they leave
 * free show the stone holders.
 */
export function deliveryCandidatesBySlot(inputs: AutoLoadoutInputs): DeliverySlotView[] {
  const views: DeliverySlotView[] = [];

  if (inputs.delivery.mode === 'fixed') {
    for (const id of inputs.delivery.artifactIds.slice(0, 4)) {
      views.push(id ? { kind: 'artifact', artifactId: id } : { kind: 'empty' });
    }
  } else {
    const byFamily = new Map<number, string[]>();
    const holders: string[] = [];
    for (const c of inputs.delivery.candidates) {
      const afx = getArtifact(c.artifactId);
      if (!afx) continue;
      if (!c.isTarget) {
        holders.push(c.artifactId);
        continue;
      }
      if (!byFamily.has(afx.afxId)) byFamily.set(afx.afxId, []);
      byFamily.get(afx.afxId)!.push(c.artifactId);
    }

    const familyOrder = [
      ei.ArtifactSpec.Name.QUANTUM_METRONOME,
      ei.ArtifactSpec.Name.INTERSTELLAR_COMPASS,
      ei.ArtifactSpec.Name.ORNATE_GUSSET,
    ];
    const families = [...byFamily.keys()].sort((a, b) => familyOrder.indexOf(a) - familyOrder.indexOf(b));
    for (const all of families.map(f => byFamily.get(f)!)) {
      // Only real trade-offs are uncertain: drop any candidate another one beats or matches on both
      // effect and stone slots (same rule as `buildDeliveryPoolFromBackup`'s Pareto filter). The
      // search would never pick it, and a hand-edited candidate list can contain one (e.g. a T4L
      // and a T4R metronome).
      const ids = [...new Set(all)].filter(a => {
        const A = getArtifact(a)!;
        return !all.some(b => {
          const B = getArtifact(b)!;
          return (
            b !== a &&
            B.effectDelta >= A.effectDelta &&
            B.slots >= A.slots &&
            (B.effectDelta > A.effectDelta || B.slots > A.slots)
          );
        });
      });
      // Highest tier first, then rarity, so the more likely pick reads first.
      ids.sort((a, b) => {
        const A = getArtifact(a)!;
        const B = getArtifact(b)!;
        return B.tier - A.tier || B.rarity - A.rarity;
      });
      views.push(ids.length === 1 ? { kind: 'artifact', artifactId: ids[0] } : { kind: 'choice', artifactIds: ids });
    }

    const free = Math.max(0, 4 - views.length);
    if (holders.length <= free) {
      for (const id of holders) views.push({ kind: 'artifact', artifactId: id });
    } else {
      for (let i = 0; i < free; i++) views.push({ kind: 'holder', artifactIds: holders, pick: free });
    }
  }

  while (views.length < 4) views.push({ kind: 'empty' });
  return views.slice(0, 4);
}

/** Number of delivery slots whose artifact isn't known until H1. */
export function countUncertainDeliverySlots(inputs: AutoLoadoutInputs): number {
  return deliveryCandidatesBySlot(inputs).filter(v => v.kind === 'choice' || v.kind === 'holder').length;
}

/** Fixed-mode artifact ids seeded from the auto view: the first (highest-tier) option of each slot. */
export function seedFixedDeliveryFromAuto(inputs: AutoLoadoutInputs): (string | null)[] {
  const used = new Set<string>();
  return deliveryCandidatesBySlot(inputs).map(view => {
    if (view.kind === 'artifact') return view.artifactId;
    if (view.kind === 'choice' || view.kind === 'holder') {
      const id = view.artifactIds.find(a => !used.has(a)) ?? null;
      if (id) used.add(id);
      return id;
    }
    return null;
  });
}

/** One-line summary for a collapsed editor, e.g. "Earnings 4/4 · Delivery: 1 uncertain slot · Custom". */
export function summarizeLoadoutInputs(inputs: AutoLoadoutInputs, customized: boolean): string {
  const earnings = inputs.earnings.filter(s => s.artifactId).length;
  let delivery: string;
  if (inputs.delivery.mode === 'fixed') {
    delivery = 'chosen manually';
  } else {
    const uncertain = countUncertainDeliverySlots(inputs);
    delivery = uncertain === 0 ? 'from inventory' : `${uncertain} uncertain slot${uncertain === 1 ? '' : 's'}`;
  }
  return `Earnings ${earnings}/4 · Delivery: ${delivery}${customized ? ' · Custom' : ''}`;
}
