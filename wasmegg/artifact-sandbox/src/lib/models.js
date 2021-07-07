import {
  artifactFromId,
  artifactFromAfxIdLevelRarity,
  stoneFromId,
  stoneFromAfxIdLevel,
} from './data';

import proto from './proto';

export class Builds {
  /**
   * @param {!Array<!Build>} builds
   * @param {!Config} config
   */
  constructor(builds, config) {
    this.builds = builds;
    this.config = config;
  }

  /**
   * @returns {!Builds}
   */
  static newDefaultBuilds() {
    return new Builds([Build.newEmptyBuild()], Config.newDefaultConfig());
  }

  /**
   * @param {!String} serialized
   * @returns {!Builds}
   * @throws Will throw an error if the serialized string cannot be parsed.
   */
  static deserialize(serialized) {
    const binary = atob(serialized);
    const buf = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
      buf[i] = binary.charCodeAt(i);
    }
    const builds = proto.Builds.decode(buf);
    return Builds.fromProto(builds);
  }

  /**
   * @param {!proto.Builds} builds
   * @returns {!Builds}
   */
  static fromProto(builds) {
    return new Builds(builds.builds.map(Build.fromProto), Config.fromProto(builds.config));
  }

  /**
   * @returns {!proto.IBuilds}
   */
  toProto() {
    return proto.Builds.create({
      builds: this.builds.map(b => b.toProto()),
      config: this.config.toProto(),
    });
  }

  /**
   * @returns {String}
   */
  serialize() {
    const encoded = proto.Builds.encode(this.toProto()).finish();
    return btoa(String.fromCharCode(...encoded));
  }
}

export class Build {
  /**
   * @param {!Array<!Artifact>} artifacts
   */
  constructor(artifacts) {
    this.artifacts = artifacts;
  }

  /**
   * @param {!Object} props
   * @returns {!Build}
   */
  static fromBuildProps(props) {
    return new Build(props.map(Artifact.fromBuildProps));
  }

  /**
   * @returns {!Build}
   */
  static newEmptyBuild() {
    return new Build([
      Artifact.newEmptyArtifact(),
      Artifact.newEmptyArtifact(),
      Artifact.newEmptyArtifact(),
      Artifact.newEmptyArtifact(),
    ]);
  }

  /**
   * @param {!proto.Build} build
   * @returns {!Build}
   */
  static fromProto(build) {
    return new Build(build.artifacts.map(Artifact.fromProto));
  }

  buildProps() {
    return this.artifacts.map(a => a.buildProps());
  }

  /**
   * @returns {!proto.Build}
   */
  toProto() {
    return proto.Build.create({
      artifacts: this.artifacts.map(a => a.toProto()),
    });
  }

  /**
   * @returns {!Boolean}
   */
  isEmpty() {
    for (const artifact of this.artifacts) {
      if (!artifact.isEmpty()) {
        return false;
      }
    }
    return true;
  }

  /**
   * @returns {!Boolean}
   */
  hasDuplicates() {
    const families = new Set();
    for (const artifact of this.artifacts) {
      if (artifact.isEmpty()) {
        continue;
      }
      if (families.has(artifact.family_id)) {
        return true;
      }
      families.add(artifact.family_id);
    }
  }
}

export class Artifact {
  /**
   * @param {!Object} artifactProps
   * @param {!Array<Stone>} stones
   */
  constructor(artifactProps, stones) {
    if (artifactProps === null) {
      this.props = null;
      this.id = '';
    } else {
      this.props = artifactProps;
      for (const prop in artifactProps) {
        Object.defineProperty(this, prop, {
          value: artifactProps[prop],
          writable: false,
        });
      }
    }
    this.stones = stones;
  }

  /**
   * @param {!Object} props
   * @returns {!Artifact}
   */
  static fromBuildProps(props) {
    const artifactProps = artifactFromId(props.id);
    return new Artifact(artifactProps, props.stones.map(Stone.fromId));
  }

  /**
   * @returns {!Artifact}
   */
  static newEmptyArtifact() {
    return new Artifact(null, [null, null, null]);
  }

  /**
   * @param {!proto.Artifact} artifact
   * @returns {!Artifact}
   */
  static fromProto(artifact) {
    const artifactProps = artifact.isEmpty
      ? null
      : artifactFromAfxIdLevelRarity(artifact.afxId, artifact.afxLevel, artifact.afxRarity);
    const stones = artifact.stones.map(Stone.fromProto);
    return new Artifact(artifactProps, stones);
  }

  /**
   * @returns {!Object}
   */
  buildProps() {
    return {
      id: this.id,
      stones: this.stones.map(s => (s === null ? '' : s.id)),
    };
  }

  /**
   * @returns {!proto.Artifact}
   */
  toProto() {
    const stones = this.stones.map(s =>
      s !== null ? s.toProto() : proto.Stone.create({ isEmpty: true })
    );
    return proto.Artifact.create(
      this.isEmpty()
        ? {
            isEmpty: true,
            stones,
          }
        : {
            isEmpty: false,
            afxId: this.afx_id,
            afxLevel: this.afx_level,
            afxRarity: this.afx_rarity,
            stones,
          }
    );
  }

  /**
   * @returns {!Boolean}
   */
  isEmpty() {
    return this.id === '';
  }

  /**
   * @returns {!Array<Stone>}
   */
  get activeStones() {
    if (this.id === '') {
      return [];
    }
    return this.stones.slice(0, this.slots).filter(s => s !== null);
  }

  /**
   * @returns {!Number}
   */
  get clarityEffect() {
    if (this.isEmpty()) {
      return 0;
    }
    if (this.afx_id === proto.ArtifactSpec.Name.LIGHT_OF_EGGENDIL) {
      return 1;
    }
    let effect = 0;
    for (const stone of this.activeStones) {
      if (stone === null) {
        continue;
      }
      if (stone.afx_id === proto.ArtifactSpec.Name.CLARITY_STONE) {
        effect += stone.effect_delta;
      }
    }
    return effect;
  }

  /**
   * @returns {!Boolean}
   */
  hasClarityStones() {
    if (this.isEmpty()) {
      return false;
    }
    for (const stone of this.activeStones) {
      if (stone === null) {
        continue;
      }
      if (stone.afx_id === proto.ArtifactSpec.Name.CLARITY_STONE) {
        return true;
      }
    }
    return false;
  }

  /**
   * @returns {!Boolean}
   */
  isEffectiveOnEnlightenment() {
    if (this.isEmpty()) {
      return false;
    }
    return this.afx_id === proto.ArtifactSpec.Name.LIGHT_OF_EGGENDIL || this.clarityEffect > 0;
  }

  /**
   * @returns {!Boolean}
   */
  isEffectiveOnRegular() {
    if (this.isEmpty()) {
      return false;
    }
    return this.afx_id !== proto.ArtifactSpec.Name.LIGHT_OF_EGGENDIL;
  }
}

export class Stone {
  /**
   * @param {!Object} stoneProps
   */
  constructor(stoneProps) {
    this.props = stoneProps;
    for (const prop in stoneProps) {
      Object.defineProperty(this, prop, {
        value: stoneProps[prop],
        writable: false,
      });
    }
  }

  /**
   * @param {!String} id
   * @returns {!Stone}
   */
  static fromId(id) {
    const stoneProps = stoneFromId(id);
    if (stoneProps === null) {
      return null;
    }
    return new Stone(stoneProps);
  }

  /**
   * @param {!proto.Stone} stone
   * @returns {!Stone}
   */
  static fromProto(stone) {
    if (stone.isEmpty) {
      return null;
    }
    const stoneProps = stoneFromAfxIdLevel(stone.afxId, stone.afxLevel);
    if (stoneProps === null) {
      return null;
    }
    return new Stone(stoneProps);
  }

  /**
   * @returns {!proto.Stone}
   */
  toProto() {
    return proto.Stone.create({
      isEmpty: false,
      afxId: this.afx_id,
      afxLevel: this.afx_level,
    });
  }
}

const maxSoulFood = 140;
const maxProphecyBonus = 5;
const maxEpicMultiplier = 100;

export class Config {
  constructor() {
    this.prophecyEggs = 0;
    this.soulEggs = 0;
    this.soulEggsInput = '';
    this.isEnlightenment = false;
    this.soulFood = maxSoulFood;
    this.prophecyBonus = maxProphecyBonus;
    this.epicMultiplier = maxEpicMultiplier;
    this.birdFeedActive = false;
    this.tachyonPrismActive = false;
    this.soulBeaconActive = false;
    this.boostBeaconActive = false;
    this.tachyonDeflectorBonus = 0;
  }

  /**
   * @returns {!Config}
   */
  static newDefaultConfig() {
    const self = new Config();
    self.prophecyEggs = 1;
    self.soulEggs = 250;
    self.soulEggsInput = '250';
    return self;
  }

  /**
   * @param {!proto.Config} config
   * @returns {!Config}
   */
  static fromProto(config) {
    const self = new Config();
    self.prophecyEggs = config.prophecyEggs;
    self.soulEggs = config.soulEggs;
    self.soulEggsInput = config.soulEggsInput;
    self.isEnlightenment = config.isEnlightenment;
    self.soulFood = maxSoulFood - config.missingSoulFood;
    self.prophecyBonus = maxProphecyBonus - config.missingProphecyBonus;
    self.epicMultiplier = maxEpicMultiplier - config.missingEpicMultiplier;
    self.birdFeedActive = config.birdFeedActive;
    self.tachyonPrismActive = config.tachyonPrismActive;
    self.soulBeaconActive = config.soulBeaconActive;
    self.boostBeaconActive = config.boostBeaconActive;
    self.tachyonDeflectorBonus = config.tachyonDeflectorBonus;
    return self;
  }

  /**
   * @returns {!proto.Config}
   */
  toProto() {
    return proto.Config.create({
      prophecyEggs: this.prophecyEggs,
      soulEggs: this.soulEggs,
      soulEggsInput: this.soulEggsInput,
      isEnlightenment: this.isEnlightenment,
      missingSoulFood: maxSoulFood - this.soulFood,
      missingProphecyBonus: maxProphecyBonus - this.prophecyBonus,
      missingEpicMultiplier: maxEpicMultiplier - this.epicMultiplier,
      birdFeedActive: this.birdFeedActive,
      tachyonPrismActive: this.tachyonPrismActive,
      soulBeaconActive: this.soulBeaconActive,
      boostBeaconActive: this.boostBeaconActive,
      tachyonDeflectorBonus: this.tachyonDeflectorBonus,
    });
  }

  /**
   * @returns {!Boolean}
   */
  epicResearchMaxed() {
    return (
      this.soulFood === maxSoulFood &&
      this.prophecyBonus === maxProphecyBonus &&
      this.epicMultiplier === maxEpicMultiplier
    );
  }

  /**
   * @returns {!Boolean}
   */
  anyBoostActive() {
    return (
      this.birdFeedActive ||
      this.tachyonPrismActive ||
      this.soulBeaconActive ||
      this.boostBeaconActive
    );
  }
}
