/**
 * The recommendation algorithm, explained
 * =======================================
 *
 * There are some artifacts that independently contribute effects and stone
 * slots to SE gain:
 *
 * - Demeters necklace;
 * - Tungsten ankh;
 * - Pheonix feather;
 * - Quantum metronome;
 * - Dilithium monocle;
 * - Lunar totem;
 * - Gusset (only preload);
 * - Chalice (only all-in-one and multi).
 *
 * There are some stones that independently contribute effects to SE gain:
 *
 * - Shell stones;
 * - Tachyon stones;
 * - Soul stones (not independent from each other, but we can calculate the
 *   independent effects of the 1st best, the 2nd best, the 3rd best, etc.; the
 *   aggregate effect of the top N soul stones is independent from everything
 *   else);
 * - Life stones (only all-in-one and multi).
 * - Lunar stones
 *
 * Then there are two complex classes of interdependent items:
 *
 * - Book of Basan and prophecy stones;
 * - Vial of Martian dust and terra stones.
 *
 * Each of these classes need to be viewed as combos, each providing effect and
 * stone slots (possibly negative, when there are more stones in the combo than
 * the artifact provides).
 *
 * Then all other artifacts (except the Light of Eggendil) are potential stone
 * slot providers.
 *
 * The algorithm we employ is divide and conquer + exhaustive search with
 * pruning. The main pruning technique for any set of independent combos is to
 * only preserve the top contender for a given number of artifact slots taken
 * and stone slots taken (negative when the combo is a net stone slot provider,
 * positive when it expects external stone slots).
 *
 * The recommendation process is roughly divided into the following stages,
 * assuming we are looking for best N artifact combos (N is 2 for standard
 * permit and 4 for pro permit):
 *
 * 1. For each independently effective artifact, pick out the top contenders;
 *    and for each ineffective artifact, pick up the top contenders providing at
 *    least one stone slot. Throw in some empty placeholders if necessary.
 *    Consider all combinations to find the best combos using N-2, N-1, or N
 *    slots. The 1 or 2 slots are reserved for Book of Basan and/or Vial of
 *    Martian dust.
 *
 * 2. Find the best books and best prophecy stones to form the best prophecy
 *    combos using 0 or 1 artifact slot and -2, -1, 0, 1, ... stone slots.
 *    Similarly find the best vials and terra stones to form the best RCB
 *    combos.
 *
 * 3. Combine the results from stage 1 and 2 to find the best N artifact combos
 *    with 0, 1, 2, ... free stone slots.
 *
 * 4. Find the best independent stones, order by individual effects, and form
 *    the best 0, 1, 2, ... independent stone combos.
 *
 * 5. Combine the results from stage 3 and 4 to find the best N artifact combo.
 */

import { ArtifactSet, ei, Farm, getNumProphecyEggs, Inventory, InventoryFamily, Item, newItem } from 'lib';
import {
  ArtifactAssemblyStatus,
  ArtifactAssemblyStatusNonMissing,
  artifactSetVirtualEarningsMultiplier,
  contenderToArtifactSet,
} from './artifact_set';
import { ImpossibleError, newArray, range } from './utils';

const debug = import.meta.env.DEV || import.meta.env.VITE_APP_BETA;

import Name = ei.ArtifactSpec.Name;
import Rarity = ei.ArtifactSpec.Rarity;
import Type = ei.ArtifactSpec.Type;

type ArtifactSlotCount = number;
type StoneSlotCount = number;

export enum PrestigeStrategy {
  STANDARD_PERMIT_SINGLE_PRELOAD,
  PRO_PERMIT_SINGLE_PRELOAD,
  PRO_PERMIT_MULTI,
  PRO_PERMIT_LUNAR_PRELOAD_AIO,
}

export class Contender {
  constructor(
    public artifacts: Item[],
    public stones: Item[],
    public numArtifactSlotsTaken: ArtifactSlotCount,
    public numStoneSlotsTaken: StoneSlotCount,
    public effectMultiplier: number
  ) {}

  // effectMultiplier is left as default (1).
  static fromArtifactSet(set: ArtifactSet): Contender {
    const artifacts = set.artifacts.map(a => a.host);
    const stones = set.artifacts.map(a => a.stones).flat();
    const numArtifactSlotsTaken = artifacts.length;
    const numStoneSlotsTaken = -artifacts.reduce((sum, a) => sum + a.slots, 0) + stones.length;
    return new Contender(artifacts, stones, numArtifactSlotsTaken, numStoneSlotsTaken, 1);
  }

  // Recalculate numArtifactSlotsTaken and numStoneSlotsTaken, getting rid of
  // strategic fillers.
  calibrate(): void {
    this.numArtifactSlotsTaken = this.artifacts.length;
    this.numStoneSlotsTaken = -this.artifacts.reduce((sum, a) => sum + a.slots, 0) + this.stones.length;
  }

  adjustLunar(maxRCB: number): void {
    this.effectMultiplier /= maxRCB;
  }

  // effectMultiplier isn't compared.
  equals(other: Contender): boolean {
    if (this.numArtifactSlotsTaken !== other.numArtifactSlotsTaken) {
      return false;
    }
    if (this.numStoneSlotsTaken !== other.numStoneSlotsTaken) {
      return false;
    }
    const a1 = this.artifacts.map(a => a.key).sort();
    const a2 = other.artifacts.map(a => a.key).sort();
    if (a1.join('\t') !== a2.join('\t')) {
      return false;
    }
    const s1 = this.stones.map(s => s.key).sort();
    const s2 = other.stones.map(s => s.key).sort();
    if (s1.join('\t') !== s2.join('\t')) {
      return false;
    }
    return true;
  }

  toString(): string {
    const artifactKeys = this.artifacts.map(a => a.id);
    const stoneKeys = this.stones.map(s => s.id);
    return (
      `{ ` +
      `#artifact-slots: ${this.numArtifactSlotsTaken}; ` +
      `#stone-slots: ${this.numStoneSlotsTaken}; ` +
      `effect: ${this.effectMultiplier.toFixed(6)} ` +
      `(${(this.effectMultiplier ** 0.21).toFixed(6)}); ` +
      `[${artifactKeys.join(', ')}; ${stoneKeys.join(', ')}]` +
      ' }'
    );
  }

  debug(): void {
    if (!debug) {
      return;
    }
    const artifactKeys = this.artifacts.map(a => a.id);
    const stoneKeys = this.stones.map(s => s.id);
    console.debug(
      `#artifact-slots: %c${this.numArtifactSlotsTaken}%c; ` +
        `#stone-slots: %c${this.numStoneSlotsTaken}%c; ` +
        `effect: %c${this.effectMultiplier.toFixed(6)} ` +
        `%c(${(this.effectMultiplier ** 0.21).toFixed(6)})`,
      'color: green',
      'color: reset',
      'color: green',
      'color: reset',
      'color: green',
      'color: dodgerblue'
    );
    console.debug(`%c[${artifactKeys.join(', ')}; ${stoneKeys.join(', ')}]`, 'color: #666');
  }

  assertNumArtifactSlotsTaken(n: number): void {
    if (this.numArtifactSlotsTaken !== n) {
      throw new ImpossibleError(`expected ${n} artifact slots taken, got ${this.numArtifactSlotsTaken}: ${this}`);
    }
  }

  assertNumStoneSlotsTaken(n: number): void {
    if (this.numStoneSlotsTaken !== n) {
      throw new ImpossibleError(`expected ${n} stone slots taken, got ${this.numStoneSlotsTaken}: ${this}`);
    }
  }
}

class Contenders {
  contenders: Map<ArtifactSlotCount, Map<StoneSlotCount, Contender>>;

  constructor(contenders?: Contender[]) {
    this.contenders = new Map();
    if (contenders !== undefined) {
      for (const contender of contenders) {
        this.add(contender);
      }
    }
  }

  add(contender: Contender): void {
    const na = contender.numArtifactSlotsTaken;
    const ns = contender.numStoneSlotsTaken;
    const c = this.contenders.get(na);
    if (c) {
      const cc = c.get(ns);
      if (cc) {
        if (cc.effectMultiplier < contender.effectMultiplier) {
          c.set(ns, contender);
        }
      } else {
        c.set(ns, contender);
      }
    } else {
      this.contenders.set(na, new Map([[ns, contender]]));
    }
  }

  *iter(): Generator<Contender, void> {
    for (const na of [...this.contenders.keys()].sort((na1, na2) => na1 - na2)) {
      const c = this.contenders.get(na)!;
      for (const ns of [...c.keys()].sort((ns1, ns2) => ns1 - ns2)) {
        yield c.get(ns)!;
      }
    }
  }

  get length(): number {
    let len = 0;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    for (const c of this.iter()) {
      len++;
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return len;
  }

  get isEmpty(): boolean {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    for (const c of this.iter()) {
      return false;
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return true;
  }

  // Make sure that given the same number of artifact slots taken, a contender
  // with more stone slots taken should have a strictly better effect
  // multiplier.
  trim(): void {
    for (const na of [...this.contenders.keys()].sort((na1, na2) => na1 - na2)) {
      const c = this.contenders.get(na)!;
      let maxEffectMultiplier = 0;
      for (const ns of [...c.keys()].sort((ns1, ns2) => ns1 - ns2)) {
        const effectMultiplier = c.get(ns)!.effectMultiplier;
        if (effectMultiplier <= maxEffectMultiplier) {
          c.delete(ns);
        } else {
          maxEffectMultiplier = effectMultiplier;
        }
      }
    }
  }

  debug(description?: string): void {
    if (!debug) {
      return;
    }
    if (description) {
      console.debug(`%c${description}:`, 'color: orangered');
    }
    for (const c of this.iter()) {
      c.debug();
    }
  }

  assertNumArtifactSlotsTaken(n: number): void {
    for (const c of this.iter()) {
      c.assertNumArtifactSlotsTaken(n);
    }
  }

  assertNumStoneSlotsTaken(n: number): void {
    for (const c of this.iter()) {
      c.assertNumStoneSlotsTaken(n);
    }
  }
}

function contendersInArtifactFamily(
  family: InventoryFamily | undefined,
  getEffectMultiplier: (delta: number) => number,
  opts?: { rareOrAbove?: boolean }
): Contenders {
  const contenders = new Contenders();
  if (!family) {
    return contenders;
  }
  if (family.type !== Type.ARTIFACT) {
    throw new Error(`${Type[family.type]} is not an artifact`);
  }
  const rarities = opts?.rareOrAbove
    ? [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE]
    : [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE, Rarity.COMMON];
  for (const tier of family.tiers) {
    for (const rarity of rarities) {
      if (tier.haveRarity[rarity] > 0) {
        const artifact = newItem({ name: tier.afxId, level: tier.afxLevel, rarity });
        const effectDelta = tier.effectDelta(rarity);
        contenders.add(
          new Contender([artifact], [], 1, -tier.stoneSlotCount(rarity), getEffectMultiplier(effectDelta))
        );
        break;
      }
    }
  }
  contenders.trim();
  contenders.debug(`Contenders in family ${Name[family.afxId]}`);
  return contenders;
}

function bestsInStoneFamily(family: InventoryFamily | undefined, n: number): Item[] {
  if (!family) {
    return [];
  }
  if (family.type !== Type.STONE) {
    throw new Error(`${Type[family.type]} is not a stone`);
  }
  const stones = <Item[]>[];
  for (const tier of [...family.tiers].filter(t => t.type === Type.STONE).sort((t1, t2) => t2.afxLevel - t1.afxLevel)) {
    const stone = newItem({ name: tier.afxId, level: tier.afxLevel, rarity: Rarity.COMMON });
    const count = tier.haveCommon;
    for (let i = 0; i < count && n > 0; i++) {
      stones.push(stone);
      n--;
    }
    if (n === 0) {
      break;
    }
  }
  return stones;
}

function maxSpareStoneSlotsInContenders(contenders: Contenders): number {
  let max = 0;
  for (const c of contenders.iter()) {
    if (-c.numStoneSlotsTaken > max) {
      max = -c.numStoneSlotsTaken;
    }
  }
  return max;
}

function combine(...contenders: Contender[]): Contender {
  const artifacts = (<Item[]>[]).concat(...contenders.map(c => c.artifacts));
  const stones = (<Item[]>[]).concat(...contenders.map(c => c.stones));
  const numArtifactSlotsTaken = contenders.reduce((sum, c) => sum + c.numArtifactSlotsTaken, 0);
  const numStoneSlotsTaken = contenders.reduce((sum, c) => sum + c.numStoneSlotsTaken, 0);
  const effectMultiplier = contenders.reduce((product, c) => product * c.effectMultiplier, 1);
  return new Contender(artifacts, stones, numArtifactSlotsTaken, numStoneSlotsTaken, effectMultiplier);
}

function addStonesToContenders(
  contenders: Contenders,
  availableStones: Item[],
  getEffect: (contender: Contender, stones: Item[]) => number,
  maxStoneSlots: number
): Contenders {
  const stonedContenders = new Contenders();
  for (const contender of contenders.iter()) {
    const maxNumStones = Math.min(maxStoneSlots - contender.numStoneSlotsTaken, availableStones.length);
    for (let i = 0; i <= maxNumStones; i++) {
      const stones = availableStones.slice(0, i);
      stonedContenders.add(
        new Contender(
          contender.artifacts,
          contender.stones.concat(stones),
          contender.numArtifactSlotsTaken,
          contender.numStoneSlotsTaken + i,
          getEffect(contender, stones)
        )
      );
    }
  }
  stonedContenders.trim();
  return stonedContenders;
}

export function suggestArtifactSet(
  backup: ei.IBackup,
  strategy: PrestigeStrategy,
  opts?: { excludedIds?: string[] }
): { artifactSet: ArtifactSet; assemblyStatuses: ArtifactAssemblyStatusNonMissing[] } {
  let artifactSlots: number;
  switch (strategy) {
    case PrestigeStrategy.STANDARD_PERMIT_SINGLE_PRELOAD:
      artifactSlots = 2;
      break;
    case PrestigeStrategy.PRO_PERMIT_LUNAR_PRELOAD_AIO:
    case PrestigeStrategy.PRO_PERMIT_SINGLE_PRELOAD:
    case PrestigeStrategy.PRO_PERMIT_MULTI:
      artifactSlots = 4;
      break;
  }

  let monoclePowerIndex: number;
  // Effect of the gusset.
  let habSpaceEffectMultiplierFunc: (delta: number) => number;
  // Effect of the chalice and life stones.
  let internalHatcheryRateEffectMultiplierFunc: (delta: number) => number;
  let lunarEffectMultiplierFunc: (delta: number) => number = () => 1;
  let rcbEffectMultiplierFunc: (delta: number) => number = delta => delta;
  switch (strategy) {
    case PrestigeStrategy.PRO_PERMIT_LUNAR_PRELOAD_AIO:
      monoclePowerIndex = 2;
      lunarEffectMultiplierFunc = delta => 1 + delta;
      rcbEffectMultiplierFunc = () => 1;
      // More preloaded population => more earnings (assuming almost full habs).
      habSpaceEffectMultiplierFunc = delta => 1 + delta;
      // IHR is irrelevant for preload.
      internalHatcheryRateEffectMultiplierFunc = () => 1;
      break;
    case PrestigeStrategy.STANDARD_PERMIT_SINGLE_PRELOAD:
    case PrestigeStrategy.PRO_PERMIT_SINGLE_PRELOAD:
      // Monocle affects bird feeds and soul beacons.
      monoclePowerIndex = 2;
      // More preloaded population => more earnings (assuming almost full habs).
      habSpaceEffectMultiplierFunc = delta => 1 + delta;
      // IHR is irrelevant for preload.
      internalHatcheryRateEffectMultiplierFunc = () => 1;
      break;
    case PrestigeStrategy.PRO_PERMIT_MULTI:
      // Monocle affects bird feeds, soul beacons, and tachyon prisms.
      monoclePowerIndex = 3;
      // Hab space should never be filled on multistige, irrelevant.
      habSpaceEffectMultiplierFunc = () => 1;
      // Boosted IHR leads to faster population growth, hence more earnings.
      internalHatcheryRateEffectMultiplierFunc = delta => 1 + delta;
      break;
  }

  const homeFarm = new Farm(backup, backup.farms![0]);
  const numProphecyEggs = getNumProphecyEggs(backup);

  const inventory = new Inventory(backup.artifactsDb!, {
    excludedIds: opts?.excludedIds,
  });
  const families = new Map(inventory.catalog.map(family => [family.afxId, family]));

  const bestTotems = contendersInArtifactFamily(families.get(Name.LUNAR_TOTEM), lunarEffectMultiplierFunc);
  const bestFeathers = contendersInArtifactFamily(families.get(Name.PHOENIX_FEATHER), delta => 1 + delta);
  const bestNecklaces = contendersInArtifactFamily(families.get(Name.DEMETERS_NECKLACE), delta => 1 + delta);
  const bestAnkhs = contendersInArtifactFamily(families.get(Name.TUNGSTEN_ANKH), delta => 1 + delta);
  const bestMonocles = contendersInArtifactFamily(
    families.get(Name.DILITHIUM_MONOCLE),
    delta => (1 + delta) ** monoclePowerIndex
  );
  const bestMetronomes = contendersInArtifactFamily(families.get(Name.QUANTUM_METRONOME), delta => 1 + delta);
  const bestChalices = contendersInArtifactFamily(
    families.get(Name.THE_CHALICE),
    internalHatcheryRateEffectMultiplierFunc
  );
  const bestGussets = contendersInArtifactFamily(families.get(Name.ORNATE_GUSSET), habSpaceEffectMultiplierFunc);

  // Other artifacts may be used as stone holders.
  const others = [
    Name.PUZZLE_CUBE,
    Name.AURELIAN_BROOCH,
    Name.NEODYMIUM_MEDALLION,
    Name.MERCURYS_LENS,
    Name.BEAK_OF_MIDAS,
    Name.CARVED_RAINSTICK,
    Name.INTERSTELLAR_COMPASS,
    Name.TITANIUM_ACTUATOR,
    Name.SHIP_IN_A_BOTTLE,
    Name.TACHYON_DEFLECTOR,
    // Light of eggendil is ineffective even as a stone holder.
    // Name.LIGHT_OF_EGGENDIL,
  ]
    .map(afxId => contendersInArtifactFamily(families.get(afxId), () => 1, { rareOrAbove: true }))
    .filter(c => !c.isEmpty);
  // Only keep at most 4 (2 on standard permit) best stone holders.
  const getNumStoneSlotsTaken = (contenders: Contenders): number => {
    for (const c of contenders.iter()) {
      return c.numStoneSlotsTaken;
    }
    return 0;
  };
  others.sort((c1, c2) => getNumStoneSlotsTaken(c1) - getNumStoneSlotsTaken(c2));
  if (others.length > artifactSlots) {
    others.length = artifactSlots;
  }

  const choices = [
    bestFeathers,
    bestNecklaces,
    bestAnkhs,
    bestMonocles,
    bestMetronomes,
    bestChalices,
    bestGussets,
    bestTotems,
  ]
    .filter(c => !c.isEmpty)
    .concat(others);

  while (choices.length < artifactSlots) {
    // Slots intentionally left empty due to the lack of potentially effective artifacts.
    choices.push(new Contenders([new Contender([], [], 1, 0, 1)]));
  }

  // independentArtifactCombos[n] is the contenders with n artifact slots taken.
  const independentArtifactCombos = newArray(artifactSlots + 1, () => new Contenders());
  for (let n = artifactSlots - 2; n <= artifactSlots; n++) {
    const combos = new Contenders();
    for (const familyCombo of combinations(choices, n)) {
      const pools = familyCombo.map(family => [...family.iter()]);
      for (const combo of product(...pools)) {
        combos.add(combine(...combo));
      }
    }
    combos.trim();
    independentArtifactCombos[n] = combos;
    combos.debug(`${n} independent artifact combos`);
    combos.assertNumArtifactSlotsTaken(n);
  }

  const maxSpareStoneSlotsForOtherCombos = maxSpareStoneSlotsInContenders(independentArtifactCombos[artifactSlots]);

  // Note that here we're using effectMultiplier only to take advantage of
  // existing code. What's stored is the additive effect to each prophecy egg.
  const bestBooks = contendersInArtifactFamily(families.get(Name.BOOK_OF_BASAN), delta => delta);
  const noBook = new Contenders([new Contender([], [], 0, 0, 0)]);
  const bestProphecyStones = bestsInStoneFamily(
    families.get(Name.PROPHECY_STONE),
    maxSpareStoneSlotsForOtherCombos + maxSpareStoneSlotsInContenders(bestBooks)
  );
  const bareProphecyEggBonus = homeFarm.bareProphecyEggBonus;
  const getProphecyComboEffect = (contender: Contender, stones: Item[]): number => {
    // Recall that contender.effectMultiplier is actually the delta of the book.
    const prophecyEggBonus =
      bareProphecyEggBonus + contender.effectMultiplier + stones.reduce((sum, stone) => sum + stone.effectDelta, 0);
    return ((1 + prophecyEggBonus) / (1 + bareProphecyEggBonus)) ** numProphecyEggs;
  };
  const prophecyCombos = [
    addStonesToContenders(noBook, bestProphecyStones, getProphecyComboEffect, maxSpareStoneSlotsForOtherCombos),
    addStonesToContenders(bestBooks, bestProphecyStones, getProphecyComboEffect, maxSpareStoneSlotsForOtherCombos),
  ];
  for (let i = 0; i < 2; i++) {
    prophecyCombos[i].debug(`${i} book prophecy combos`);
    prophecyCombos[i].assertNumArtifactSlotsTaken(i);
  }

  // Similar to books, effectMultiplier stored here is additive effect to max RCB.
  const bestVials = contendersInArtifactFamily(families.get(Name.VIAL_MARTIAN_DUST), rcbEffectMultiplierFunc);
  const noVial = new Contenders([new Contender([], [], 0, 0, 0)]);
  const bestTerraStones = bestsInStoneFamily(
    families.get(Name.TERRA_STONE),
    maxSpareStoneSlotsForOtherCombos + maxSpareStoneSlotsInContenders(bestVials)
  );
  const bareMaxRCB = homeFarm.bareMaxRunningChickenBonusWithMaxedCommonResearches;
  const getRcbComboEffect = (contender: Contender, stones: Item[]): number => {
    // Recall that contender.effectMultiplier is actually the delta of the vial.
    const maxRCB = bareMaxRCB + contender.effectMultiplier + stones.reduce((sum, stone) => sum + stone.effectDelta, 0);
    return strategy == PrestigeStrategy.PRO_PERMIT_LUNAR_PRELOAD_AIO ? 1 : maxRCB / bareMaxRCB;
  };
  const rcbCombos = [
    addStonesToContenders(noVial, bestTerraStones, getRcbComboEffect, maxSpareStoneSlotsForOtherCombos),
    addStonesToContenders(bestVials, bestTerraStones, getRcbComboEffect, maxSpareStoneSlotsForOtherCombos),
  ];
  for (let i = 0; i < 2; i++) {
    rcbCombos[i].debug(`${i} vial RCB combos`);
    rcbCombos[i].assertNumArtifactSlotsTaken(i);
  }

  // i1 is the number of artifact slots taken by the prophecy combo (0 or 1),
  // and i2 is the number taken by the RCB combo (again, 0 or 1).
  const independentStoneFreeCombos = new Contenders();
  let maxIndependentStoneSlots = 0;
  for (let i1 = 0; i1 < 2; i1++) {
    for (let i2 = 0; i2 < 2; i2++) {
      const nIndependent = artifactSlots - i1 - i2;
      for (const prophecyCombo of prophecyCombos[i1].iter()) {
        for (const rcbCombo of rcbCombos[i2].iter()) {
          for (const independentCombo of independentArtifactCombos[nIndependent].iter()) {
            const combined = combine(prophecyCombo, rcbCombo, independentCombo);
            if (combined.numStoneSlotsTaken <= 0) {
              independentStoneFreeCombos.add(combined);
              if (-combined.numStoneSlotsTaken > maxIndependentStoneSlots) {
                maxIndependentStoneSlots = -combined.numStoneSlotsTaken;
              }
            }
          }
        }
      }
    }
  }
  independentStoneFreeCombos.trim();
  independentStoneFreeCombos.debug('Combos ready for independent stones');
  independentStoneFreeCombos.assertNumArtifactSlotsTaken(artifactSlots);

  const bestLunarStones = bestsInStoneFamily(families.get(Name.LUNAR_STONE), maxIndependentStoneSlots).map(stone => ({
    stone,
    multiplier: strategy === PrestigeStrategy.PRO_PERMIT_LUNAR_PRELOAD_AIO ? 1 + stone.effectDelta : 1,
  }));
  const bestShellStones = bestsInStoneFamily(families.get(Name.SHELL_STONE), maxIndependentStoneSlots).map(stone => ({
    stone,
    multiplier: 1 + stone.effectDelta,
  }));
  const bestTachyonStones = bestsInStoneFamily(families.get(Name.TACHYON_STONE), maxIndependentStoneSlots).map(
    stone => ({ stone, multiplier: 1 + stone.effectDelta })
  );
  // Each soul stone is less effective than the last.
  let soulBonusAccumulator = homeFarm.bareSoulEggBonus;
  const bestSoulStones = bestsInStoneFamily(families.get(Name.SOUL_STONE), maxIndependentStoneSlots).map(stone => {
    const before = soulBonusAccumulator;
    soulBonusAccumulator += stone.effectDelta;
    const after = soulBonusAccumulator;
    return { stone, multiplier: after / before };
  });
  const bestLifeStones = bestsInStoneFamily(families.get(Name.LIFE_STONE), maxIndependentStoneSlots).map(stone => ({
    stone,
    multiplier: internalHatcheryRateEffectMultiplierFunc(stone.effectDelta),
  }));

  const bestIndependentStones = (<{ stone: Item; multiplier: number }[]>[])
    .concat(bestShellStones, bestTachyonStones, bestSoulStones, bestLifeStones, bestLunarStones)
    .sort((s1, s2) => s2.multiplier - s1.multiplier)
    .slice(0, maxIndependentStoneSlots)
    .map(s => new Contender([], [s.stone], 0, 1, s.multiplier));

  let stoneCombo = new Contender([], [], 0, 0, 1);
  const bestIndependentStoneCombos = range(maxIndependentStoneSlots + 1).map(n => {
    if (n === 0) {
      // Empty.
    } else if (n <= bestIndependentStones.length) {
      stoneCombo = combine(stoneCombo, bestIndependentStones[n - 1]);
    } else {
      // Not enough stones, add phantom stone.
      stoneCombo = combine(stoneCombo, new Contender([], [], 0, 1, 1));
    }
    stoneCombo.assertNumStoneSlotsTaken(n);
    return stoneCombo;
  });
  if (debug) {
    console.debug(`%cBest independent stone combos:`, 'color: orangered');
  }
  for (const c of bestIndependentStoneCombos) {
    c.debug();
  }

  const finishedCombos = new Contenders();
  for (const c of independentStoneFreeCombos.iter()) {
    finishedCombos.add(combine(c, bestIndependentStoneCombos[-c.numStoneSlotsTaken]));
  }
  finishedCombos.trim();
  finishedCombos.debug('Best finished combos');
  finishedCombos.assertNumArtifactSlotsTaken(artifactSlots);
  finishedCombos.assertNumStoneSlotsTaken(0);
  const flattened = [...finishedCombos.iter()];
  if (flattened.length !== 1) {
    throw new ImpossibleError(`expected 1 winner, found ${flattened.length}: ${flattened}`);
  }
  const winner = flattened[0];
  winner.calibrate();
  if (strategy === PrestigeStrategy.PRO_PERMIT_LUNAR_PRELOAD_AIO) {
    winner.adjustLunar(bareMaxRCB);
  }
  const result = contenderToArtifactSet(winner, homeFarm.artifactSet, inventory);
  const contenderMultiplier = winner.effectMultiplier;
  const setMultiplier = artifactSetVirtualEarningsMultiplier(homeFarm, result.artifactSet, strategy);
  const multiplierDiff = Math.abs(contenderMultiplier - setMultiplier);
  if (multiplierDiff >= 1e-6 && multiplierDiff / setMultiplier >= 1e-9) {
    throw new ImpossibleError(
      `recommended artifact set effect multiplier different from two calculation methods, ${contenderMultiplier} !== ${setMultiplier}: ${winner}`
    );
  }
  if (debug) {
    console.debug(
      `assembly statuses:`,
      result.assemblyStatuses.map(status => ArtifactAssemblyStatus[status]).join(', ')
    );
  }
  return result;
}

function* combinations<T>(pool: T[], r: number): Generator<T[], void> {
  const n = pool.length;
  if (r > n) {
    return;
  }
  const indices = range(r);
  yield indices.map(i => pool[i]);
  while (true) {
    let i;
    for (i = r - 1; i >= 0; i--) {
      if (indices[i] !== i + n - r) {
        break;
      }
    }
    if (i < 0) {
      return;
    }
    indices[i]++;
    for (let j = i + 1; j < r; j++) {
      indices[j] = indices[j - 1] + 1;
    }
    yield indices.map(i => pool[i]);
  }
}

function* product<T>(...pools: T[][]): Generator<T[], void> {
  if (pools.length === 0) {
    return;
  } else if (pools.length === 1) {
    for (const t of pools[0]) {
      yield [t];
    }
  } else {
    for (const t of pools[0]) {
      for (const tt of product(...pools.slice(1))) {
        yield [t, ...tt];
      }
    }
  }
}
