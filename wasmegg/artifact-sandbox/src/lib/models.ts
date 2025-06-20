import { artifactFromId, artifactFromAfxIdLevelRarity, stoneFromId, stoneFromAfxIdLevel } from './data';

import proto from './proto';
import { ItemProps } from './types';

import Name = proto.ArtifactSpec.Name;
import Level = proto.ArtifactSpec.Level;
import Rarity = proto.ArtifactSpec.Rarity;

const NUM_ARTIFACTS_PER_BUILD = 4;
const NUM_STONES_PER_ARTIFACT = 3;

export type BuildProps = ArtifactBuildProps[];

export type ArtifactBuildProps = {
  id: string;
  stones: string[];
};

export class Builds {
  constructor(
    public builds: Build[],
    public config: Config
  ) {}

  static newDefaultBuilds(): Builds {
    return new Builds([Build.newEmptyBuild()], Config.newDefaultConfig());
  }

  static deserialize(serialized: string): Builds {
    const binary = atob(serialized);
    const buf = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
      buf[i] = binary.charCodeAt(i);
    }
    const builds = proto.Builds.decode(buf);
    return Builds.fromProto(builds);
  }

  static fromProto(builds: proto.Builds): Builds {
    return new Builds(builds.builds.map(Build.fromProto), Config.fromProto(builds.config));
  }

  toProto(): proto.IBuilds {
    return proto.Builds.create({
      builds: this.builds.map(b => b.toProto()),
      config: this.config.toProto(),
    });
  }

  serialize(): string {
    const encoded = proto.Builds.encode(this.toProto()).finish();
    return btoa(String.fromCharCode(...encoded));
  }
}

export class Build {
  constructor(public artifacts: Artifact[]) {
    this.artifacts = artifacts;
    while (this.artifacts.length < NUM_ARTIFACTS_PER_BUILD) {
      this.artifacts.push(Artifact.newEmptyArtifact());
    }
  }

  static fromBuildProps(props: BuildProps): Build {
    return new Build(props.map(Artifact.fromBuildProps));
  }

  static newEmptyBuild(): Build {
    return new Build([]);
  }

  static fromProto(build: proto.IBuild): Build {
    return new Build(build.artifacts?.map(Artifact.fromProto) ?? []);
  }
  buildProps(): BuildProps {
    return this.artifacts.map(a => a.buildProps());
  }

  toProto(): proto.Build {
    return proto.Build.create({
      artifacts: this.artifacts.map(a => a.toProto()),
    });
  }

  isEmpty(): boolean {
    for (const artifact of this.artifacts) {
      if (!artifact.isEmpty()) {
        return false;
      }
    }
    return true;
  }

  hasDuplicates(): boolean {
    const families = new Set<string>();
    for (const artifact of this.artifacts) {
      if (artifact.isEmpty()) {
        continue;
      }
      if (families.has(artifact.familyId!)) {
        return true;
      }
      families.add(artifact.familyId!);
    }
    return false;
  }
}

export class Artifact {
  props: ItemProps | null;
  id: string;
  stones: (Stone | null)[];

  afxId?: Name;
  afxLevel?: Level;
  afxRarity?: Rarity;
  familyId?: string;
  familyName?: string;
  tierId?: string;
  name?: string;
  tierNumber?: number;
  tierName?: string;
  rarity?: string;
  display?: string;
  effect?: string;
  effectTarget?: string;
  effectSize?: string;
  effectDelta?: number;
  slots?: number;
  familyEffect?: string;
  baseCraftingPrice?: number;
  iconPath?: string;

  constructor(props: ItemProps | null, stones: (Stone | null)[]) {
    if (props === null) {
      this.props = null;
      this.id = '';
    } else {
      this.props = props;
      this.id = props.id;

      this.afxId = props.afxId;
      this.afxLevel = props.afxLevel;
      this.afxRarity = props.afxRarity;
      this.familyId = props.familyId;
      this.familyName = props.familyName;
      this.tierId = props.tierId;
      this.name = props.name;
      this.tierNumber = props.tierNumber;
      this.tierName = props.tierName;
      this.rarity = props.rarity;
      this.display = props.display;
      this.effect = props.effect;
      this.effectTarget = props.effectTarget;
      this.effectSize = props.effectSize;
      this.effectDelta = props.effectDelta;
      this.slots = props.slots;
      this.familyEffect = props.familyEffect;
      this.baseCraftingPrice = props.baseCraftingPrice;
      this.iconPath = props.iconPath;
    }
    this.stones = stones;
    while (this.stones.length < NUM_STONES_PER_ARTIFACT) {
      this.stones.push(null);
    }
  }

  static fromBuildProps(props: ArtifactBuildProps): Artifact {
    const artifactProps = artifactFromId(props.id);
    return new Artifact(artifactProps, props.stones.map(Stone.fromId));
  }

  static newEmptyArtifact(): Artifact {
    return new Artifact(null, []);
  }

  static fromProto(artifact: proto.IArtifact): Artifact {
    const artifactProps = artifact.isEmpty
      ? null
      : artifactFromAfxIdLevelRarity(artifact.afxId ?? 0, artifact.afxLevel ?? 0, artifact.afxRarity ?? 0);
    const stones = artifact.stones?.map(Stone.fromProto) ?? [];
    return new Artifact(artifactProps, stones);
  }

  buildProps(): ArtifactBuildProps {
    return {
      id: this.id,
      stones: this.stones.map(s => (s === null ? '' : s.id)),
    };
  }

  toProto(): proto.Artifact {
    const stones = this.stones.map(s => (s !== null ? s.toProto() : proto.Stone.create({ isEmpty: true })));
    return proto.Artifact.create(
      this.isEmpty()
        ? {
            isEmpty: true,
            stones,
          }
        : {
            isEmpty: false,
            afxId: this.afxId,
            afxLevel: this.afxLevel,
            afxRarity: this.afxRarity,
            stones,
          }
    );
  }

  isEmpty(): boolean {
    return this.id === '';
  }

  nonEmpty(): this is NonEmptyArtifact {
    return !this.isEmpty();
  }

  get activeStones(): Stone[] {
    if (this.id === '') {
      return [];
    }
    return this.stones.slice(0, this.slots).filter(notNull);
  }

  get clarityEffect(): number {
    if (this.isEmpty()) {
      return 0;
    }
    if (this.afxId === proto.ArtifactSpec.Name.LIGHT_OF_EGGENDIL) {
      return 1;
    }
    let effect = 0;
    for (const stone of this.activeStones) {
      if (stone === null) {
        continue;
      }
      if (stone.afxId === proto.ArtifactSpec.Name.CLARITY_STONE) {
        effect += stone.effectDelta;
      }
    }
    return effect;
  }

  hasClarityStones(): boolean {
    if (this.isEmpty()) {
      return false;
    }
    for (const stone of this.activeStones) {
      if (stone === null) {
        continue;
      }
      if (stone.afxId === proto.ArtifactSpec.Name.CLARITY_STONE) {
        return true;
      }
    }
    return false;
  }

  isEffectiveOnEnlightenment(): boolean {
    if (this.isEmpty()) {
      return false;
    }
    return this.afxId === proto.ArtifactSpec.Name.LIGHT_OF_EGGENDIL || this.clarityEffect > 0;
  }

  isEffectiveOnRegular(): boolean {
    if (this.isEmpty()) {
      return false;
    }
    return this.afxId !== proto.ArtifactSpec.Name.LIGHT_OF_EGGENDIL;
  }
}

export type NonEmptyArtifact = Required<Artifact>;

export class Stone {
  props: ItemProps;
  id: string;

  afxId: Name;
  afxLevel: Level;
  familyId: string;
  familyName: string;
  tierId: string;
  name: string;
  tierNumber: number;
  tierName: string;
  rarity: string;
  display: string;
  effect: string;
  effectTarget: string;
  effectSize: string;
  effectDelta: number;
  familyEffect: string;
  baseCraftingPrice: number;
  iconPath: string;

  constructor(props: ItemProps) {
    this.props = props;
    this.id = props.id;

    this.afxId = props.afxId;
    this.afxLevel = props.afxLevel;
    this.familyId = props.familyId;
    this.familyName = props.familyName;
    this.tierId = props.tierId;
    this.name = props.name;
    this.tierNumber = props.tierNumber;
    this.tierName = props.tierName;
    this.rarity = props.rarity;
    this.display = props.display;
    this.effect = props.effect;
    this.effectTarget = props.effectTarget;
    this.effectSize = props.effectSize;
    this.effectDelta = props.effectDelta;
    this.familyEffect = props.familyEffect;
    this.baseCraftingPrice = props.baseCraftingPrice;
    this.iconPath = props.iconPath;
  }

  static fromId(id: string): Stone | null {
    const stoneProps = stoneFromId(id);
    if (stoneProps === null) {
      return null;
    }
    return new Stone(stoneProps);
  }

  static fromProto(stone: proto.IStone): Stone | null {
    if (stone.isEmpty) {
      return null;
    }
    const stoneProps = stoneFromAfxIdLevel(stone.afxId ?? 0, stone.afxLevel ?? 0);
    if (stoneProps === null) {
      return null;
    }
    return new Stone(stoneProps);
  }

  toProto(): proto.Stone {
    return proto.Stone.create({
      isEmpty: false,
      afxId: this.afxId,
      afxLevel: this.afxLevel,
    });
  }
}

const maxSoulFood = 140;
const maxProphecyBonus = 5;
const maxRCB = 540;

export class Config {
  prophecyEggs: number;
  soulEggs: number;
  soulEggsInput: string;
  isEnlightenment: boolean;
  soulFood: number;
  prophecyBonus: number;
  RCB: number;
  birdFeedActive: boolean;
  tachyonPrismActive: boolean;
  soulBeaconActive: boolean;
  boostBeaconActive: boolean;
  proPermit: boolean;
  tachyonDeflectorBonus: number;
  colleggtibleTiers: Record<string, number>;

  constructor() {
    this.prophecyEggs = 0;
    this.soulEggs = 0;
    this.soulEggsInput = '';
    this.isEnlightenment = false;
    this.soulFood = maxSoulFood;
    this.prophecyBonus = maxProphecyBonus;
    this.RCB = maxRCB;
    this.birdFeedActive = false;
    this.tachyonPrismActive = false;
    this.soulBeaconActive = false;
    this.boostBeaconActive = false;
    this.proPermit = true;
    this.tachyonDeflectorBonus = 0;
    this.colleggtibleTiers = {};
  }

  static newDefaultConfig(): Config {
    const self = new Config();
    self.prophecyEggs = 1;
    self.soulEggs = 250;
    self.soulEggsInput = '250';
    return self;
  }

  static fromProto(config?: proto.IConfig | null): Config {
    const self = new Config();
    self.prophecyEggs = config?.prophecyEggs ?? 0;
    self.soulEggs = config?.soulEggs ?? 0;
    self.soulEggsInput = config?.soulEggsInput ?? '';
    self.isEnlightenment = config?.isEnlightenment ?? false;
    self.soulFood = maxSoulFood - (config?.missingSoulFood ?? 0);
    self.prophecyBonus = maxProphecyBonus - (config?.missingProphecyBonus ?? 0);
    self.RCB = maxRCB;
    self.birdFeedActive = config?.birdFeedActive ?? false;
    self.tachyonPrismActive = config?.tachyonPrismActive ?? false;
    self.soulBeaconActive = config?.soulBeaconActive ?? false;
    self.boostBeaconActive = config?.boostBeaconActive ?? false;
    self.proPermit = config?.proPermit ?? true;
    self.tachyonDeflectorBonus = config?.tachyonDeflectorBonus ?? 0;
    self.colleggtibleTiers = config?.colleggtibleTiers ?? {};
    return self;
  }

  toProto(): proto.Config {
    return proto.Config.create({
      prophecyEggs: this.prophecyEggs,
      soulEggs: this.soulEggs,
      soulEggsInput: this.soulEggsInput,
      isEnlightenment: this.isEnlightenment,
      missingSoulFood: maxSoulFood - this.soulFood,
      missingProphecyBonus: maxProphecyBonus - this.prophecyBonus,
      birdFeedActive: this.birdFeedActive,
      tachyonPrismActive: this.tachyonPrismActive,
      soulBeaconActive: this.soulBeaconActive,
      boostBeaconActive: this.boostBeaconActive,
      proPermit: this.proPermit,
      tachyonDeflectorBonus: this.tachyonDeflectorBonus,
      colleggtibleTiers: this.colleggtibleTiers,
    });
  }

  epicResearchMaxed(): boolean {
    return this.soulFood === maxSoulFood && this.prophecyBonus === maxProphecyBonus && this.RCB === maxRCB;
  }

  anyBoostActive(): boolean {
    return this.birdFeedActive || this.tachyonPrismActive || this.soulBeaconActive || this.boostBeaconActive;
  }
}

function notNull<T>(x: T | null): x is T {
  return x !== null;
}
