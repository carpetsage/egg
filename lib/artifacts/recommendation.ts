/**
 * The recommendation algorithm, explained
 * =======================================
 *
 * There are some artifacts that independently contribute effects and stone
 * slots to SE gain (or clothed TE for virtue):
 *
 * - Demeters necklace;
 * - Tungsten ankh;
 * - Pheonix feather;
 * - Quantum metronome;
 * - Dilithium monocle;
 * - Lunar totem;
 * - Puzzle cube (virtue only);
 * - Gusset (only preload);
 * - Chalice (only all-in-one and multi).
 *
 * There are some stones that independently contribute effects:
 *
 * - Shell stones;
 * - Tachyon stones;
 * - Soul stones (not independent from each other);
 * - Life stones (only all-in-one and multi);
 * - Lunar stones;
 *
 * Then there are two complex classes of interdependent items:
 *
 * - Book of Basan and prophecy stones;
 * - Vial of Martian dust and terra stones.
 *
 * The algorithm uses divide and conquer + exhaustive search with pruning.
 */

import { ArtifactSet, ei, Farm, getNumProphecyEggs, Inventory, InventoryFamily, Item, newItem } from '..';

import Name = ei.ArtifactSpec.Name;
import Rarity = ei.ArtifactSpec.Rarity;
import Type = ei.ArtifactSpec.Type;

type ArtifactSlotCount = number;
type StoneSlotCount = number;

export enum Strategy {
  // Prestige strategies
  STANDARD_PERMIT_SINGLE_PRELOAD,
  PRO_PERMIT_SINGLE_PRELOAD,
  PRO_PERMIT_MULTI,
  PRO_PERMIT_LUNAR_PRELOAD_AIO,

  // Virtue strategies
  STANDARD_PERMIT_VIRTUE_CTE,
  PRO_PERMIT_VIRTUE_CTE,
}

function isVirtueStrategy(strategy: Strategy): boolean {
  return strategy === Strategy.STANDARD_PERMIT_VIRTUE_CTE || strategy === Strategy.PRO_PERMIT_VIRTUE_CTE;
}

export class Contender {
  constructor(
    public artifacts: Item[],
    public stones: Item[],
    public numArtifactSlotsTaken: ArtifactSlotCount,
    public numStoneSlotsTaken: StoneSlotCount,
    public effectMultiplier: number
  ) {}

  static fromArtifactSet(set: ArtifactSet): Contender {
    const artifacts = set.artifacts.map(a => a.host);
    const stones = set.artifacts.map(a => a.stones).flat();
    const numArtifactSlotsTaken = artifacts.length;
    const numStoneSlotsTaken = -artifacts.reduce((sum, a) => sum + a.slots, 0) + stones.length;
    return new Contender(artifacts, stones, numArtifactSlotsTaken, numStoneSlotsTaken, 1);
  }

  calibrate(): void {
    this.numArtifactSlotsTaken = this.artifacts.length;
    this.numStoneSlotsTaken = -this.artifacts.reduce((sum, a) => sum + a.slots, 0) + this.stones.length;
  }

  adjustLunar(maxRCB: number): void {
    // For lunar preload strategies, scale lunar stone effects by max RCB
    for (const stone of this.stones) {
      if (stone.afxId === Name.LUNAR_STONE) {
        this.effectMultiplier *= 1 + stone.effectDelta * maxRCB;
      }
    }
  }

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

  debug(debug: boolean): void {
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
      throw new Error(`expected ${n} artifact slots taken, got ${this.numArtifactSlotsTaken}`);
    }
  }

  assertNumStoneSlotsTaken(n: number): void {
    if (this.numStoneSlotsTaken !== n) {
      throw new Error(`expected ${n} stone slots taken, got ${this.numStoneSlotsTaken}`);
    }
  }
}

class Contenders {
  private contenders: Map<string, Contender>;

  constructor(contenders?: Contender[]) {
    this.contenders = new Map();
    if (contenders) {
      for (const c of contenders) {
        this.add(c);
      }
    }
  }

  add(contender: Contender): void {
    const key = `${contender.numArtifactSlotsTaken}\t${contender.numStoneSlotsTaken}`;
    const existing = this.contenders.get(key);
    if (!existing || contender.effectMultiplier > existing.effectMultiplier) {
      this.contenders.set(key, contender);
    }
  }

  trim(): void {
    // Already trimmed by nature of Map keying
  }

  iter(): IterableIterator<Contender> {
    return this.contenders.values();
  }

  get isEmpty(): boolean {
    return this.contenders.size === 0;
  }

  debug(label: string, debug: boolean): void {
    if (!debug) {
      return;
    }
    console.debug(`%c${label}:`, 'color: orangered');
    for (const c of this.iter()) {
      c.debug(debug);
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
  if (!family) {
    return new Contenders();
  }
  const contenders = new Contenders();
  for (const tier of family.tiers) {
    if (tier.type !== Type.ARTIFACT) {
      continue;
    }
    for (const rarity of [Rarity.LEGENDARY, Rarity.EPIC, Rarity.RARE]) {
      if (opts?.rareOrAbove && rarity < Rarity.RARE) {
        continue;
      }
      const count = tier.haveRarity[rarity];
      if (count === 0) {
        continue;
      }
      const artifact = newItem({
        name: tier.afxId,
        level: tier.afxLevel,
        rarity,
      });
      const multiplier = getEffectMultiplier(artifact.effectDelta);
      contenders.add(new Contender([artifact], [], 1, -artifact.slots, multiplier));
    }
  }
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
    const stone = newItem({
      name: tier.afxId,
      level: tier.afxLevel,
      rarity: Rarity.COMMON,
    });
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

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  if (k > arr.length) {
    return;
  }
  for (let i = 0; i <= arr.length - k; i++) {
    for (const combo of combinations(arr.slice(i + 1), k - 1)) {
      yield [arr[i], ...combo];
    }
  }
}

function* product<T>(...arrays: T[][]): Generator<T[]> {
  if (arrays.length === 0) {
    yield [];
    return;
  }
  const [first, ...rest] = arrays;
  for (const item of first) {
    for (const combo of product(...rest)) {
      yield [item, ...combo];
    }
  }
}

function newArray<T>(n: number, fill: () => T): T[] {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push(fill());
  }
  return arr;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function recommendArtifactSet(
  backup: ei.IBackup,
  strategy: Strategy,
  opts?: { excludedIds?: string[]; debug?: boolean }
): Contender {
  const debug = opts?.debug ?? false;
  const isVirtue = isVirtueStrategy(strategy);
  const inventory = new Inventory(backup.artifactsDb!, {
    excludedIds: opts?.excludedIds,
    virtue: isVirtue,
  });

  const families = new Map<Name, InventoryFamily>();
  for (const family of inventory.catalog) {
    families.set(family.afxId, family);
  }

  const artifactSlots =
    strategy === Strategy.STANDARD_PERMIT_SINGLE_PRELOAD || strategy === Strategy.STANDARD_PERMIT_VIRTUE_CTE ? 2 : 4;

  // Effect multiplier functions
  const virtueMultiplierFunc = (delta: number) => 1 + delta;
  const prestigeMultiplierFunc = (delta: number) => 1 + delta;
  const inactiveMultiplierFunc = () => 1; // For artifacts/stones not relevant to strategy

  // For virtue, cube has research discount effect
  const cubeMultiplierFunc = isVirtue
    ? (delta: number) => 1 / (1 + delta) // Research price discount: delta is negative, so 1/(1+delta) gives boost
    : inactiveMultiplierFunc;

  // Determine which artifacts and stones are active for this strategy
  const necklaceFunc = isVirtue ? virtueMultiplierFunc : prestigeMultiplierFunc;
  const ankhFunc = isVirtue ? virtueMultiplierFunc : prestigeMultiplierFunc;
  const totemFunc = isVirtue ? virtueMultiplierFunc : prestigeMultiplierFunc;
  const cubeFunc = cubeMultiplierFunc;
  const shellStoneFunc = isVirtue ? virtueMultiplierFunc : prestigeMultiplierFunc;
  const lunarStoneFunc = isVirtue ? virtueMultiplierFunc : prestigeMultiplierFunc;

  // For prestige-specific artifacts
  let homeFarm: Farm | null = null;
  let numProphecyEggs = 0;
  let monoclePowerIndex = 1;

  if (!isVirtue) {
    homeFarm = new Farm(backup, backup.farms![0]);
    numProphecyEggs = getNumProphecyEggs(backup);

    // monocle power index depends on strategy
    switch (strategy) {
      case Strategy.PRO_PERMIT_LUNAR_PRELOAD_AIO:
      case Strategy.STANDARD_PERMIT_SINGLE_PRELOAD:
      case Strategy.PRO_PERMIT_SINGLE_PRELOAD:
        monoclePowerIndex = 2; // Monocle affects bird feeds and soul beacons
        break;
      case Strategy.PRO_PERMIT_MULTI:
        monoclePowerIndex = 3; // Monocle affects bird feeds, soul beacons, and tachyon prisms
        break;
    }
  }

  const bestFeathers = contendersInArtifactFamily(
    families.get(Name.PHOENIX_FEATHER),
    isVirtue ? inactiveMultiplierFunc : prestigeMultiplierFunc
  );
  const bestNecklaces = contendersInArtifactFamily(families.get(Name.DEMETERS_NECKLACE), necklaceFunc);
  const bestAnkhs = contendersInArtifactFamily(families.get(Name.TUNGSTEN_ANKH), ankhFunc);
  const bestMonocles = contendersInArtifactFamily(
    families.get(Name.DILITHIUM_MONOCLE),
    isVirtue ? inactiveMultiplierFunc : delta => (1 + delta) ** monoclePowerIndex
  );
  const bestMetronomes = contendersInArtifactFamily(
    families.get(Name.QUANTUM_METRONOME),
    isVirtue ? inactiveMultiplierFunc : prestigeMultiplierFunc
  );
  const bestChalices = contendersInArtifactFamily(
    families.get(Name.THE_CHALICE),
    isVirtue ? inactiveMultiplierFunc : prestigeMultiplierFunc
  );
  const bestGussets = contendersInArtifactFamily(
    families.get(Name.ORNATE_GUSSET),
    isVirtue ? inactiveMultiplierFunc : prestigeMultiplierFunc
  );
  const bestTotems = contendersInArtifactFamily(families.get(Name.LUNAR_TOTEM), totemFunc);
  const bestCubes = contendersInArtifactFamily(families.get(Name.PUZZLE_CUBE), cubeFunc);

  // Other artifacts as stone holders
  const others = [
    Name.AURELIAN_BROOCH,
    Name.NEODYMIUM_MEDALLION,
    Name.MERCURYS_LENS,
    Name.BEAK_OF_MIDAS,
    Name.CARVED_RAINSTICK,
    Name.INTERSTELLAR_COMPASS,
    Name.TITANIUM_ACTUATOR,
    Name.SHIP_IN_A_BOTTLE,
    Name.TACHYON_DEFLECTOR,
  ]
    .concat(isVirtue ? [] : [Name.PUZZLE_CUBE])
    .map(afxId =>
      contendersInArtifactFamily(families.get(afxId), inactiveMultiplierFunc, {
        rareOrAbove: true,
      })
    )
    .filter(c => !c.isEmpty);
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
    ...(isVirtue ? [bestCubes] : []),
  ]
    .filter(c => !c.isEmpty)
    .concat(others);

  while (choices.length < artifactSlots) {
    choices.push(new Contenders([new Contender([], [], 1, 0, 1)]));
  }

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
    combos.debug(`${n} independent artifact combos`, debug);
    combos.assertNumArtifactSlotsTaken(n);
  }

  const maxSpareStoneSlotsForOtherCombos = maxSpareStoneSlotsInContenders(independentArtifactCombos[artifactSlots]);

  // For virtue, skip book/prophecy and vial/terra combos
  let prophecyCombos: Contenders[];
  let rcbCombos: Contenders[];

  if (isVirtue) {
    prophecyCombos = [new Contenders([new Contender([], [], 0, 0, 1)]), new Contenders()];
    rcbCombos = [new Contenders([new Contender([], [], 0, 0, 1)]), new Contenders()];
  } else {
    const bestBooks = contendersInArtifactFamily(families.get(Name.BOOK_OF_BASAN), delta => delta);
    const noBook = new Contenders([new Contender([], [], 0, 0, 0)]);
    const bestProphecyStones = bestsInStoneFamily(
      families.get(Name.PROPHECY_STONE),
      maxSpareStoneSlotsForOtherCombos + maxSpareStoneSlotsInContenders(bestBooks)
    );
    const bareProphecyEggBonus = homeFarm!.bareProphecyEggBonus;
    const getProphecyComboEffect = (contender: Contender, stones: Item[]): number => {
      const prophecyEggBonus =
        bareProphecyEggBonus + contender.effectMultiplier + stones.reduce((sum, stone) => sum + stone.effectDelta, 0);
      return ((1 + prophecyEggBonus) / (1 + bareProphecyEggBonus)) ** numProphecyEggs;
    };
    prophecyCombos = [
      addStonesToContenders(noBook, bestProphecyStones, getProphecyComboEffect, maxSpareStoneSlotsForOtherCombos),
      addStonesToContenders(bestBooks, bestProphecyStones, getProphecyComboEffect, maxSpareStoneSlotsForOtherCombos),
    ];
    for (let i = 0; i < 2; i++) {
      prophecyCombos[i].debug(`${i} book prophecy combos`, debug);
      prophecyCombos[i].assertNumArtifactSlotsTaken(i);
    }

    const bestVials = contendersInArtifactFamily(families.get(Name.VIAL_MARTIAN_DUST), delta => delta);
    const noVial = new Contenders([new Contender([], [], 0, 0, 0)]);
    const bestTerraStones = bestsInStoneFamily(
      families.get(Name.TERRA_STONE),
      maxSpareStoneSlotsForOtherCombos + maxSpareStoneSlotsInContenders(bestVials)
    );
    const bareMaxRCB = homeFarm!.bareMaxRunningChickenBonusWithMaxedCommonResearches;
    const getRcbComboEffect = (contender: Contender, stones: Item[]): number => {
      const maxRCB =
        bareMaxRCB + contender.effectMultiplier + stones.reduce((sum, stone) => sum + stone.effectDelta, 0);
      return strategy == Strategy.PRO_PERMIT_LUNAR_PRELOAD_AIO ? 1 : maxRCB / bareMaxRCB;
    };
    rcbCombos = [
      addStonesToContenders(noVial, bestTerraStones, getRcbComboEffect, maxSpareStoneSlotsForOtherCombos),
      addStonesToContenders(bestVials, bestTerraStones, getRcbComboEffect, maxSpareStoneSlotsForOtherCombos),
    ];
    for (let i = 0; i < 2; i++) {
      rcbCombos[i].debug(`${i} vial RCB combos`, debug);
      rcbCombos[i].assertNumArtifactSlotsTaken(i);
    }
  }

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
  independentStoneFreeCombos.debug('Combos ready for independent stones', debug);
  independentStoneFreeCombos.assertNumArtifactSlotsTaken(artifactSlots);

  // Independent stones
  const bestLunarStones = bestsInStoneFamily(families.get(Name.LUNAR_STONE), maxIndependentStoneSlots).map(stone => ({
    stone,
    multiplier: isVirtue
      ? lunarStoneFunc(stone.effectDelta)
      : strategy === Strategy.PRO_PERMIT_LUNAR_PRELOAD_AIO
        ? 1 + stone.effectDelta
        : 1,
  }));
  const bestShellStones = bestsInStoneFamily(families.get(Name.SHELL_STONE), maxIndependentStoneSlots).map(stone => ({
    stone,
    multiplier: shellStoneFunc(stone.effectDelta),
  }));

  let bestTachyonStones: { stone: Item; multiplier: number }[] = [];
  let bestSoulStones: { stone: Item; multiplier: number }[] = [];
  let bestLifeStones: { stone: Item; multiplier: number }[] = [];

  if (!isVirtue) {
    bestTachyonStones = bestsInStoneFamily(families.get(Name.TACHYON_STONE), maxIndependentStoneSlots).map(stone => ({
      stone,
      multiplier: 1 + stone.effectDelta,
    }));
    let soulBonusAccumulator = homeFarm!.bareSoulEggBonus;
    bestSoulStones = bestsInStoneFamily(families.get(Name.SOUL_STONE), maxIndependentStoneSlots).map(stone => {
      const before = soulBonusAccumulator;
      soulBonusAccumulator += stone.effectDelta;
      const after = soulBonusAccumulator;
      return { stone, multiplier: after / before };
    });
    bestLifeStones = bestsInStoneFamily(families.get(Name.LIFE_STONE), maxIndependentStoneSlots).map(stone => ({
      stone,
      multiplier: 1 + stone.effectDelta,
    }));
  }

  const bestIndependentStones = (<{ stone: Item; multiplier: number }[]>[])
    .concat(bestShellStones, bestTachyonStones, bestSoulStones, bestLifeStones, bestLunarStones)
    .sort((s1, s2) => s2.multiplier - s1.multiplier)
    .slice(0, maxIndependentStoneSlots)
    .map(s => new Contender([], [s.stone], 0, 1, s.multiplier));

  let stoneCombo = new Contender([], [], 0, 0, 1);
  const bestIndependentStoneCombos = range(maxIndependentStoneSlots + 1).map(n => {
    if (n === 0) {
      return stoneCombo;
    } else if (n <= bestIndependentStones.length) {
      stoneCombo = combine(stoneCombo, bestIndependentStones[n - 1]);
    } else {
      stoneCombo = combine(stoneCombo, new Contender([], [], 0, 1, 1));
    }
    stoneCombo.assertNumStoneSlotsTaken(n);
    return stoneCombo;
  });
  if (debug) {
    console.debug(`%cBest independent stone combos:`, 'color: orangered');
  }
  for (const c of bestIndependentStoneCombos) {
    c.debug(debug);
  }

  const finishedCombos = new Contenders();
  for (const c of independentStoneFreeCombos.iter()) {
    const combined = combine(c, bestIndependentStoneCombos[-c.numStoneSlotsTaken]);
    finishedCombos.add(combined);
  }
  finishedCombos.trim();
  finishedCombos.debug('Best finished combos', debug);
  finishedCombos.assertNumArtifactSlotsTaken(artifactSlots);
  finishedCombos.assertNumStoneSlotsTaken(0);

  const flattened = [...finishedCombos.iter()];
  if (flattened.length !== 1) {
    throw new Error(`expected 1 winner, found ${flattened.length}: ${flattened}`);
  }
  const winner = flattened[0];
  winner.calibrate();

  if (!isVirtue && strategy === Strategy.PRO_PERMIT_LUNAR_PRELOAD_AIO) {
    winner.adjustLunar(homeFarm!.bareMaxRunningChickenBonusWithMaxedCommonResearches);
  }

  return winner;
}
