import { ei } from '../proto';
import { getArtifactTierProps } from './data';

import Name = ei.ArtifactSpec.Name;
import Level = ei.ArtifactSpec.Level;
import Rarity = ei.ArtifactSpec.Rarity;

interface Item {
  key: string; // Unique identifier
  afxId: Name;
  afxLevel: Level;
  afxRarity: Rarity;
  name: string;
  rarity: string;
  tierNumber: number;
  effectTarget: string;
  effectSize: string;
  effectDelta: number;
  slots: number;
  iconPath: string;
}

export type Stone = Item;

export class Artifact implements Item {
  host: Item;
  stones: Stone[];

  constructor(host: Item, stones: Stone[]) {
    this.host = host;
    this.stones = stones;
  }

  get key(): string {
    return this.host.key;
  }

  get afxId(): Name {
    return this.host.afxId;
  }

  get afxLevel(): Level {
    return this.host.afxLevel;
  }

  get afxRarity(): Rarity {
    return this.host.afxRarity;
  }

  get name(): string {
    return this.host.name;
  }

  get rarity(): string {
    return this.host.rarity;
  }

  get tierNumber(): number {
    return this.host.tierNumber;
  }

  get effectTarget(): string {
    return this.host.effectTarget;
  }

  get effectSize(): string {
    return this.host.effectSize;
  }

  get effectDelta(): number {
    return this.host.effectDelta;
  }

  get slots(): number {
    return this.host.slots;
  }

  get iconPath(): string {
    return this.host.iconPath;
  }

  get clarityEffect(): number {
    if (this.host.afxId === Name.LIGHT_OF_EGGENDIL) {
      return 1;
    }
    let effect = 0;
    for (const stone of this.stones) {
      if (stone.afxId === Name.CLARITY_STONE) {
        effect += stone.effectDelta;
      }
    }
    return effect;
  }
}

export class ArtifactSet {
  artifacts: Artifact[];
  enlightenment: boolean;

  constructor(artifacts: ei.ICompleteArtifact[], enlightenment: boolean) {
    this.artifacts = [];
    for (const artifact of artifacts) {
      if (!artifact.spec) {
        throw new Error(`complete artifact has no spec: ${JSON.stringify(artifact)}`);
      }
      const host = newItem(artifact.spec);
      const stones = (artifact.stones || []).map(stone => newItem(stone));
      this.artifacts.push(new Artifact(host, stones));
    }
    this.enlightenment = enlightenment;
  }

  protected aggregateEffect(
    afxIds: Name[],
    aggregator: (aggregate: number, effect: Effect) => number,
    initialValue: number
  ): number {
    return gatherRelevantEffects(this.artifacts, afxIds, this.enlightenment).reduce(
      aggregator,
      initialValue
    );
  }

  protected additiveEffect(afxIds: Name[]): number {
    return this.aggregateEffect(
      afxIds,
      (aggregate, effect) => aggregate + effect.delta * effect.multiplier,
      0
    );
  }

  protected multiplicativeEffect(afxIds: Name[]): number {
    return this.aggregateEffect(
      afxIds,
      (aggregate, effect) => aggregate * (1 + effect.delta * effect.multiplier),
      1
    );
  }

  get soulEggBonus(): number {
    return this.additiveEffect([Name.SOUL_STONE]);
  }

  get prophecyEggBonus(): number {
    return this.additiveEffect([Name.BOOK_OF_BASAN, Name.PROPHECY_STONE]);
  }

  get eggLayingRateMultiplier(): number {
    return this.multiplicativeEffect([Name.QUANTUM_METRONOME, Name.TACHYON_STONE]);
  }

  get shippingCapacityMultiplier(): number {
    return this.multiplicativeEffect([Name.INTERSTELLAR_COMPASS, Name.QUANTUM_STONE]);
  }

  get habSpaceMultiplier(): number {
    return this.multiplicativeEffect([Name.ORNATE_GUSSET]);
  }

  get internalHatcheryRateMultiplier(): number {
    return this.multiplicativeEffect([Name.THE_CHALICE, Name.LIFE_STONE]);
  }

  get boostEffectMultiplier(): number {
    return this.multiplicativeEffect([Name.DILITHIUM_MONOCLE]);
  }
}

function newItem(spec: ei.IArtifactSpec): Item {
  if (spec.name === null || spec.name === undefined) {
    throw new Error(`artifact spec has no name: ${JSON.stringify(spec)}`);
  }
  if (spec.level === null || spec.level === undefined) {
    throw new Error(`artifact spec has no level: ${JSON.stringify(spec)}`);
  }
  if (spec.rarity === null || spec.rarity === undefined) {
    throw new Error(`artifact spec has no rarity: ${JSON.stringify(spec)}`);
  }
  const afxId = spec.name;
  const afxLevel = spec.level;
  const afxRarity = spec.rarity;
  const tier = getArtifactTierProps(afxId, afxLevel);
  if (tier.effects === null) {
    throw new Error(`${tier.id} has no effects`);
  }
  for (const effect of tier.effects) {
    if (effect.afx_rarity === afxRarity) {
      return {
        key: `${afxId}:${afxLevel}:${afxRarity}`,
        afxId,
        afxLevel,
        afxRarity,
        name: tier.name,
        rarity: effect.rarity,
        tierNumber: tier.tier_number,
        effectTarget: effect.effect_target,
        effectSize: effect.effect_size,
        effectDelta: effect.effect_delta,
        slots: effect.slots || 0,
        iconPath: `egginc/${tier.icon_filename}`,
      };
    }
  }
  throw new Error(`${tier.id} has no rarity ${afxRarity}`);
}

type Effect = {
  delta: number;
  multiplier: number;
};

function gatherRelevantEffects(
  artifacts: Artifact[],
  afxIds: Name[],
  enlightenment: boolean
): Effect[] {
  const deltas = [];
  for (const artifact of artifacts) {
    const effectMultiplier = enlightenment ? artifact.clarityEffect : 1;
    if (effectMultiplier === 0) {
      continue;
    }
    if (afxIds.includes(artifact.afxId)) {
      deltas.push({
        delta: artifact.effectDelta,
        multiplier: effectMultiplier,
      });
    }
    for (const stone of artifact.stones) {
      if (afxIds.includes(stone.afxId)) {
        deltas.push({
          delta: stone.effectDelta,
          multiplier: effectMultiplier,
        });
      }
    }
  }
  return deltas;
}
