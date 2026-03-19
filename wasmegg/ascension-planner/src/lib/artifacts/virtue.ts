import { ei } from 'lib/proto';
import {
  Artifact,
  ArtifactSet,
  Inventory,
  recommendArtifactSet,
  Strategy,
  contenderToArtifactSet,
  newItem,
} from 'lib/artifacts';
import { allModifiersFromColleggtibles, maxModifierFromColleggtibles } from 'lib/collegtibles';
import { getNumTruthEggs } from 'lib/earning_bonus';
import {
  eggValueMultiplier,
  awayEarningsMultiplier,
  researchPriceMultiplierFromArtifacts,
} from 'lib/artifacts/virtue_effects';
import { EquippedArtifact } from './types';
import { libArtifactToEquippedArtifact } from './utils';
import {
  calculateArtifactModifiers,
  createEmptyLoadout,
} from './calculator';
import { calculateLayRate } from '@/calculations/layRate';
import {
  calculateShippingCapacity,
  calculateMaxVehicleSlots,
  calculateMaxTrainLength,
} from '@/calculations/shippingCapacity';
import { calculateEffectiveLayRate } from '@/calculations/effectiveLayRate';
import { calculateHabCapacity_Full } from '@/calculations/habCapacity';
import { getArtifact, getStone, artifactOptions } from './data';
import { InventoryItem } from 'lib/artifacts';
import { VehicleSlot } from '@/types';

/**
 * Get the optimal artifact set for earnings (Clothed TE).
 */
export function getOptimalEarningsSet(backup: ei.IBackup): EquippedArtifact[] {
  if (!backup.artifactsDb) {
    return createEmptyLoadout();
  }

  const inventory = new Inventory(backup.artifactsDb, { virtue: true });

  const libArtifacts: Artifact[] = [];
  const db = backup.artifactsDb?.virtueAfxDb;
  if (db && db.inventoryItems && db.activeArtifacts?.slots) {
    const itemIdToArtifact = new Map(db.inventoryItems.map(item => [item.itemId!, item.artifact!]));
    for (const slot of db.activeArtifacts.slots) {
      if (slot.occupied && slot.itemId !== undefined && slot.itemId !== null) {
        const artifact = itemIdToArtifact.get(slot.itemId);
        if (artifact && artifact.spec) {
          libArtifacts.push(
            new Artifact(
              newItem(artifact.spec),
              (artifact.stones || []).map(s => newItem(s))
            )
          );
        }
      }
    }
  }
  const equipped = new ArtifactSet(libArtifacts, false);

  const strategy =
    backup.game?.permitLevel === 1 ? Strategy.PRO_PERMIT_VIRTUE_CTE : Strategy.STANDARD_PERMIT_VIRTUE_CTE;

  const contender = recommendArtifactSet(backup, strategy);
  const { artifactSet } = contenderToArtifactSet(contender, equipped, inventory);

  return artifactSet.artifacts.map(libArtifactToEquippedArtifact);
}

/**
 * Get the optimal artifact set for ELR (Effective Lay Rate).
 * Factors in Metronomes, Compasses, Gussets, and Tachyon/Quantum stones.
 */
export function getOptimalELRSet(
  backup: ei.IBackup,
  options: {
    assumeMaxHabsVehicles?: boolean;
    currentSet?: (EquippedArtifact | null)[];
    excludeGusset?: boolean;
    commonResearch?: Record<string, number>;
    epicResearchLevels?: Record<string, number>;
    colleggtibleModifiers?: any;
  } = {}
): EquippedArtifact[] {
  if (!backup.artifactsDb) {
    return createEmptyLoadout();
  }

  const assumeMax = options.assumeMaxHabsVehicles ?? false;
  const excludeGusset = options.excludeGusset ?? false;
  const inventory = new Inventory(backup.artifactsDb, { virtue: true });
  const colleggtibles = options.colleggtibleModifiers ?? allModifiersFromColleggtibles(backup);

  // 1. Gather research levels
  const commonResearch: Record<string, number> = options.commonResearch ?? {};
  if (!options.commonResearch) {
    for (const r of backup.farms?.[0]?.commonResearch || []) {
      if (r.id) commonResearch[r.id] = r.level || 0;
    }
  }

  const epicResearchLevels: Record<string, number> = options.epicResearchLevels ?? {};
  if (!options.epicResearchLevels) {
    for (const r of backup.game?.epicResearch || []) {
      if (r.id) epicResearchLevels[r.id] = r.level || 0;
    }
  }

  // 2. Identify top candidate artifacts
  const name = ei.ArtifactSpec.Name;
  const targetAfxIds = new Set([name.QUANTUM_METRONOME, name.INTERSTELLAR_COMPASS, name.ORNATE_GUSSET]);

  // Candidate Wrapper
  type Candidate = { item: InventoryItem; rarity: ei.ArtifactSpec.Rarity; slots: number; isTarget: boolean };
  const afxGroups = new Map<number, Candidate[]>();

  for (const item of inventory.items) {
    if (item.have === 0 || !item.isArtifact) continue;

    const afxId = item.afxId;
    if (excludeGusset && afxId === name.ORNATE_GUSSET) continue;

    const isTarget = targetAfxIds.has(afxId);

    // Find best rarity for this tier
    for (const rarity of [
      ei.ArtifactSpec.Rarity.LEGENDARY,
      ei.ArtifactSpec.Rarity.EPIC,
      ei.ArtifactSpec.Rarity.RARE,
      ei.ArtifactSpec.Rarity.COMMON,
    ]) {
      if (item.haveRarity[rarity] > 0) {
        const slots = item.stoneSlotCount(rarity);
        const cand: Candidate = { item, rarity, slots, isTarget };

        if (!afxGroups.has(afxId)) afxGroups.set(afxId, []);
        afxGroups.get(afxId)!.push(cand);
        break; // Only take best rarity of each tier
      }
    }
  }

  const finalCandidates: Candidate[] = [];

  // Sort each AFX group by "goodness"
  for (const [afxId, group] of afxGroups.entries()) {
    const isTarget = targetAfxIds.has(afxId);

    if (isTarget) {
      group.sort((a, b) => {
        if (a.item.tierNumber !== b.item.tierNumber) return b.item.tierNumber - a.item.tierNumber;
        if (a.rarity !== b.rarity) return b.rarity - a.rarity;
        return b.slots - a.slots;
      });
      // Take top 2 from each target family (e.g. T4L and T3L Gussets)
      finalCandidates.push(...group.slice(0, 2));
    } else {
      group.sort((a, b) => {
        if (a.slots !== b.slots) return b.slots - a.slots;
        return b.item.tierNumber - a.item.tierNumber;
      });
      // For non-targets, we only care about the single best carrier from this family
      finalCandidates.push(group[0]);
    }
  }

  // Pick top 4 of the non-target leaders based on slots
  const targetCands = finalCandidates.filter(c => c.isTarget);
  const nonTargetCands = finalCandidates.filter(c => !c.isTarget).sort((a, b) => b.slots - a.slots).slice(0, 4);

  const topCandidates = [...targetCands, ...nonTargetCands];

  // 3. Gather available stones (Tachyon and Quantum)
  const tachyonStones = inventory.items
    .filter(i => i.isStone && i.props.family.id === 'tachyon-stone' && i.tierNumber >= 2)
    .map(i => ({
      id: i.id,
      delta: i.props.effects?.[0]?.effect_delta || 0,
      count: i.haveCommon,
      tier: i.tierNumber,
    }))
    .sort((a, b) => b.tier - a.tier);

  const quantumStones = inventory.items
    .filter(i => i.isStone && i.props.family.id === 'quantum-stone' && i.tierNumber >= 2)
    .map(i => ({
      id: i.id,
      delta: i.props.effects?.[0]?.effect_delta || 0,
      count: i.haveCommon,
      tier: i.tierNumber,
    }))
    .sort((a, b) => b.tier - a.tier);

  // 4. Optimization Loop
  let bestSet: EquippedArtifact[] = createEmptyLoadout();
  let maxELR = -1;
  let bestMetrics: any = null;

  // Search through combinations of 1 to 4 artifacts
  // 12C4 = 495, which is small enough.
  function combinations<T>(array: T[], r: number): T[][] {
    const result: T[][] = [];
    function helper(start: number, combo: T[]) {
      if (combo.length === r) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        helper(i + 1, [...combo, array[i]]);
      }
    }
    helper(0, []);
    return result;
  }

  const combos = [
    ...combinations(topCandidates, 1),
    ...combinations(topCandidates, 2),
    ...combinations(topCandidates, 3),
    ...combinations(topCandidates, 4),
  ];

  for (const comboWrappers of combos) {
    const hasTarget = comboWrappers.some((w: Candidate) => w.isTarget);

    // Ensure all artifacts in the combination are from unique families
    const families = new Set(comboWrappers.map((w: Candidate) => w.item.props.family.afx_id));
    if (families.size !== comboWrappers.length) {
      continue;
    }

    const loadout: EquippedArtifact[] = comboWrappers.map((wrapper: Candidate) => {
      return {
        // Use the family ID from props. This maps correctly to gusset-x-y instead of ornate-gusset-x-y
        artifactId: `${wrapper.item.props.family.id}-${wrapper.item.tierNumber}-${wrapper.rarity}`,
        stones: new Array(wrapper.slots).fill(null),
      };
    });

    // Padding to 4 slots
    while (loadout.length < 4) {
      loadout.push({ artifactId: null, stones: [] });
    }

    // Balance stones
    const totalStoneSlots = loadout.reduce((sum, slot) => sum + slot.stones.length, 0);

    let bestStonesForThisLoadout: (string | null)[] = [];
    let bestELRForThisLoadout = -1;
    let bestMetricsForThisLoadout: any = null;

    const evaluateStones = (stones: (string | null)[]) => {
      const tempLoadout: EquippedArtifact[] = JSON.parse(JSON.stringify(loadout));
      let sIdx = 0;
      for (const slot of tempLoadout) {
        for (let i = 0; i < slot.stones.length; i++) {
          slot.stones[i] = stones[sIdx++];
        }
      }

      const artifactMods = calculateArtifactModifiers(tempLoadout);

      // Hab Capacity
      const habIds = assumeMax
        ? [18, 18, 18, 18]
        : (backup.farms?.[0]?.habs || []).map(h => (h === 19 ? null : h));
      while (!assumeMax && habIds.length < 4) habIds.push(null);

      const habCapOutput = calculateHabCapacity_Full({
        habIds: habIds as any,
        researchLevels: commonResearch,
        peggMultiplier: colleggtibles.habCap,
        artifactMultiplier: artifactMods.habCapacity.totalMultiplier,
        artifactEffects: artifactMods.habCapacity.effects,
      });
      const population = habCapOutput.totalFinalCapacity;

      // Lay Rate
      const layRateOutput = calculateLayRate({
        researchLevels: commonResearch,
        epicComfyNestsLevel: epicResearchLevels['epic_egg_laying'] || 0,
        siliconMultiplier: colleggtibles.elr,
        population,
        artifactMultiplier: artifactMods.eggLayingRate.totalMultiplier,
        artifactEffects: artifactMods.eggLayingRate.effects,
      });

      // Shipping Capacity
      let vehicles: VehicleSlot[] = [];
      const farm = backup.farms?.[0];
      if (farm) {
        if (assumeMax) {
          const totalSlots = calculateMaxVehicleSlots(commonResearch);
          const maxTrainLen = calculateMaxTrainLength(commonResearch);
          vehicles = new Array(totalSlots).fill(null).map(() => ({ vehicleId: 11, trainLength: maxTrainLen }));
        } else {
          // Map from backup number arrays
          const vehicleTypes = farm.vehicles || [];
          const trainLengths = farm.trainLength || [];
          vehicles = vehicleTypes.map((type, i) => ({
            vehicleId: type,
            trainLength: trainLengths[i] || 1,
          }));
        }
      } else {
        vehicles = [{ vehicleId: 0, trainLength: 1 }];
      }

      const shippingOutput = calculateShippingCapacity({
        vehicles,
        researchLevels: commonResearch,
        transportationLobbyistLevel: epicResearchLevels['transportation_lobbyist'] || 0,
        colleggtibleMultiplier: colleggtibles.shippingCap,
        artifactMultiplier: artifactMods.shippingRate.totalMultiplier,
        artifactEffects: artifactMods.shippingRate.effects,
      });

      const elr = calculateEffectiveLayRate(layRateOutput.totalRatePerSecond, shippingOutput.totalFinalCapacity);

      return {
        layRate: layRateOutput.totalRatePerSecond,
        shipRate: shippingOutput.totalFinalCapacity,
        elr: elr.effectiveLayRate,
        population,
        habs: habIds,
        vehicles,
      };
    };

    const remTachyonStones = tachyonStones.map(s => ({ ...s }));
    const remQuantumStones = quantumStones.map(s => ({ ...s }));
    const currentStones: (string | null)[] = new Array(totalStoneSlots).fill(null);

    for (let slotIdx = 0; slotIdx < totalStoneSlots; slotIdx++) {
      const metrics = evaluateStones(currentStones);

      if (metrics.layRate < metrics.shipRate) {
        const bestTachyon = remTachyonStones.find(s => s.count > 0);
        if (bestTachyon) {
          currentStones[slotIdx] = bestTachyon.id;
          bestTachyon.count--;
        } else {
          const bestQuantum = remQuantumStones.find(s => s.count > 0);
          if (bestQuantum) {
            currentStones[slotIdx] = bestQuantum.id;
            bestQuantum.count--;
          }
        }
      } else {
        const bestQuantum = remQuantumStones.find(s => s.count > 0);
        if (bestQuantum) {
          currentStones[slotIdx] = bestQuantum.id;
          bestQuantum.count--;
        } else {
          const bestTachyon = remTachyonStones.find(s => s.count > 0);
          if (bestTachyon) {
            currentStones[slotIdx] = bestTachyon.id;
            bestTachyon.count--;
          }
        }
      }
    }

    currentStones.sort((a, b) => {
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;

      const isTa = a.indexOf('quantum') === 0;
      const isTb = b.indexOf('quantum') === 0;
      if (isTa && !isTb) return -1;
      if (!isTa && isTb) return 1;

      const tierA = parseInt(a.split('-').pop() || '0', 10);
      const tierB = parseInt(b.split('-').pop() || '0', 10);
      return tierB - tierA;
    });

    const finalMetrics = evaluateStones(currentStones);
    bestELRForThisLoadout = finalMetrics.elr;
    bestStonesForThisLoadout = currentStones;
    bestMetricsForThisLoadout = finalMetrics;

    const currentBestLayRate = bestMetricsForThisLoadout?.layRate ?? -1;
    const globalBestLayRate = bestMetrics?.layRate ?? -1;

    const isGlobalBetter = bestELRForThisLoadout > maxELR ||
      (bestELRForThisLoadout === maxELR && currentBestLayRate > globalBestLayRate);

    if (isGlobalBetter) {
      maxELR = bestELRForThisLoadout;
      const optimizedLoadout = JSON.parse(JSON.stringify(loadout));
      let sIdx = 0;
      for (const slot of optimizedLoadout) {
        for (let i = 0; i < slot.stones.length; i++) {
          slot.stones[i] = bestStonesForThisLoadout[sIdx++];
        }
      }
      bestSet = optimizedLoadout;
      bestMetrics = bestMetricsForThisLoadout;
    }
  }

  if (options.currentSet && isFunctionallyIdentical(bestSet, options.currentSet)) {
    return options.currentSet as EquippedArtifact[];
  }

  return bestSet;
}

/**
 * Compare two artifact sets for functional equivalence.
 */
export function isFunctionallyIdentical(
  setA: EquippedArtifact[],
  setB: (EquippedArtifact | null)[] | undefined
): boolean {
  if (!setA || !setB) return false;

  const targetAfxIds = [
    ei.ArtifactSpec.Name.QUANTUM_METRONOME,
    ei.ArtifactSpec.Name.INTERSTELLAR_COMPASS,
    ei.ArtifactSpec.Name.ORNATE_GUSSET,
  ];

  const normalize = (set: (EquippedArtifact | null)[]) => {
    const targets: string[] = []; // Target IDs (e.g. quantum-metronome-4-3)
    const holderSlots: number[] = []; // Slot counts for non-target artifacts
    const stoneCounts: Record<string, number> = {};

    for (const slot of set) {
      if (!slot?.artifactId) continue;
      const artifact = getArtifact(slot.artifactId);
      if (!artifact) continue;

      if (targetAfxIds.includes(artifact.afxId as any)) {
        targets.push(slot.artifactId);
      } else {
        holderSlots.push(artifact.slots);
      }

      for (const stoneId of slot.stones) {
        if (stoneId) {
          stoneCounts[stoneId] = (stoneCounts[stoneId] || 0) + 1;
        }
      }
    }

    return JSON.stringify({
      targets: targets.sort(),
      holders: holderSlots.sort((a, b) => a - b),
      stones: Object.entries(stoneCounts).sort((a, b) => a[0].localeCompare(b[0])),
    });
  };

  return normalize(setA) === normalize(setB);
}
