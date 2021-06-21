import * as $protobuf from 'protobufjs';
/** Properties of a Builds. */
export interface IBuilds {
  /** Builds builds */
  builds?: IBuild[] | null;

  /** Builds config */
  config?: IConfig | null;
}

/** Represents a Builds. */
export class Builds implements IBuilds {
  /**
   * Constructs a new Builds.
   * @param [properties] Properties to set
   */
  constructor(properties?: IBuilds);

  /** Builds builds. */
  public builds: IBuild[];

  /** Builds config. */
  public config?: IConfig | null;

  /**
   * Creates a new Builds instance using the specified properties.
   * @param [properties] Properties to set
   * @returns Builds instance
   */
  public static create(properties?: IBuilds): Builds;

  /**
   * Encodes the specified Builds message. Does not implicitly {@link Builds.verify|verify} messages.
   * @param message Builds message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encode(message: IBuilds, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Encodes the specified Builds message, length delimited. Does not implicitly {@link Builds.verify|verify} messages.
   * @param message Builds message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encodeDelimited(message: IBuilds, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Decodes a Builds message from the specified reader or buffer.
   * @param reader Reader or buffer to decode from
   * @param [length] Message length if known beforehand
   * @returns Builds
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): Builds;

  /**
   * Decodes a Builds message from the specified reader or buffer, length delimited.
   * @param reader Reader or buffer to decode from
   * @returns Builds
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): Builds;

  /**
   * Verifies a Builds message.
   * @param message Plain object to verify
   * @returns `null` if valid, otherwise the reason why it is not
   */
  public static verify(message: { [k: string]: any }): string | null;

  /**
   * Creates a Builds message from a plain object. Also converts values to their respective internal types.
   * @param object Plain object
   * @returns Builds
   */
  public static fromObject(object: { [k: string]: any }): Builds;

  /**
   * Creates a plain object from a Builds message. Also converts values to other types if specified.
   * @param message Builds
   * @param [options] Conversion options
   * @returns Plain object
   */
  public static toObject(
    message: Builds,
    options?: $protobuf.IConversionOptions
  ): { [k: string]: any };

  /**
   * Converts this Builds to JSON.
   * @returns JSON object
   */
  public toJSON(): { [k: string]: any };
}

/** Properties of a Build. */
export interface IBuild {
  /** Build artifacts */
  artifacts?: IArtifact[] | null;
}

/** Represents a Build. */
export class Build implements IBuild {
  /**
   * Constructs a new Build.
   * @param [properties] Properties to set
   */
  constructor(properties?: IBuild);

  /** Build artifacts. */
  public artifacts: IArtifact[];

  /**
   * Creates a new Build instance using the specified properties.
   * @param [properties] Properties to set
   * @returns Build instance
   */
  public static create(properties?: IBuild): Build;

  /**
   * Encodes the specified Build message. Does not implicitly {@link Build.verify|verify} messages.
   * @param message Build message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encode(message: IBuild, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Encodes the specified Build message, length delimited. Does not implicitly {@link Build.verify|verify} messages.
   * @param message Build message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encodeDelimited(message: IBuild, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Decodes a Build message from the specified reader or buffer.
   * @param reader Reader or buffer to decode from
   * @param [length] Message length if known beforehand
   * @returns Build
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): Build;

  /**
   * Decodes a Build message from the specified reader or buffer, length delimited.
   * @param reader Reader or buffer to decode from
   * @returns Build
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): Build;

  /**
   * Verifies a Build message.
   * @param message Plain object to verify
   * @returns `null` if valid, otherwise the reason why it is not
   */
  public static verify(message: { [k: string]: any }): string | null;

  /**
   * Creates a Build message from a plain object. Also converts values to their respective internal types.
   * @param object Plain object
   * @returns Build
   */
  public static fromObject(object: { [k: string]: any }): Build;

  /**
   * Creates a plain object from a Build message. Also converts values to other types if specified.
   * @param message Build
   * @param [options] Conversion options
   * @returns Plain object
   */
  public static toObject(
    message: Build,
    options?: $protobuf.IConversionOptions
  ): { [k: string]: any };

  /**
   * Converts this Build to JSON.
   * @returns JSON object
   */
  public toJSON(): { [k: string]: any };
}

/** Properties of an Artifact. */
export interface IArtifact {
  /** Artifact afxId */
  afxId?: ArtifactSpec.Name | null;

  /** Artifact afxLevel */
  afxLevel?: ArtifactSpec.Level | null;

  /** Artifact afxRarity */
  afxRarity?: ArtifactSpec.Rarity | null;

  /** Artifact stones */
  stones?: IStone[] | null;

  /** Artifact isEmpty */
  isEmpty?: boolean | null;
}

/** Represents an Artifact. */
export class Artifact implements IArtifact {
  /**
   * Constructs a new Artifact.
   * @param [properties] Properties to set
   */
  constructor(properties?: IArtifact);

  /** Artifact afxId. */
  public afxId: ArtifactSpec.Name;

  /** Artifact afxLevel. */
  public afxLevel: ArtifactSpec.Level;

  /** Artifact afxRarity. */
  public afxRarity: ArtifactSpec.Rarity;

  /** Artifact stones. */
  public stones: IStone[];

  /** Artifact isEmpty. */
  public isEmpty: boolean;

  /**
   * Creates a new Artifact instance using the specified properties.
   * @param [properties] Properties to set
   * @returns Artifact instance
   */
  public static create(properties?: IArtifact): Artifact;

  /**
   * Encodes the specified Artifact message. Does not implicitly {@link Artifact.verify|verify} messages.
   * @param message Artifact message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encode(message: IArtifact, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Encodes the specified Artifact message, length delimited. Does not implicitly {@link Artifact.verify|verify} messages.
   * @param message Artifact message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encodeDelimited(message: IArtifact, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Decodes an Artifact message from the specified reader or buffer.
   * @param reader Reader or buffer to decode from
   * @param [length] Message length if known beforehand
   * @returns Artifact
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): Artifact;

  /**
   * Decodes an Artifact message from the specified reader or buffer, length delimited.
   * @param reader Reader or buffer to decode from
   * @returns Artifact
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): Artifact;

  /**
   * Verifies an Artifact message.
   * @param message Plain object to verify
   * @returns `null` if valid, otherwise the reason why it is not
   */
  public static verify(message: { [k: string]: any }): string | null;

  /**
   * Creates an Artifact message from a plain object. Also converts values to their respective internal types.
   * @param object Plain object
   * @returns Artifact
   */
  public static fromObject(object: { [k: string]: any }): Artifact;

  /**
   * Creates a plain object from an Artifact message. Also converts values to other types if specified.
   * @param message Artifact
   * @param [options] Conversion options
   * @returns Plain object
   */
  public static toObject(
    message: Artifact,
    options?: $protobuf.IConversionOptions
  ): { [k: string]: any };

  /**
   * Converts this Artifact to JSON.
   * @returns JSON object
   */
  public toJSON(): { [k: string]: any };
}

/** Properties of a Stone. */
export interface IStone {
  /** Stone afxId */
  afxId?: ArtifactSpec.Name | null;

  /** Stone afxLevel */
  afxLevel?: ArtifactSpec.Level | null;

  /** Stone isEmpty */
  isEmpty?: boolean | null;
}

/** Represents a Stone. */
export class Stone implements IStone {
  /**
   * Constructs a new Stone.
   * @param [properties] Properties to set
   */
  constructor(properties?: IStone);

  /** Stone afxId. */
  public afxId: ArtifactSpec.Name;

  /** Stone afxLevel. */
  public afxLevel: ArtifactSpec.Level;

  /** Stone isEmpty. */
  public isEmpty: boolean;

  /**
   * Creates a new Stone instance using the specified properties.
   * @param [properties] Properties to set
   * @returns Stone instance
   */
  public static create(properties?: IStone): Stone;

  /**
   * Encodes the specified Stone message. Does not implicitly {@link Stone.verify|verify} messages.
   * @param message Stone message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encode(message: IStone, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Encodes the specified Stone message, length delimited. Does not implicitly {@link Stone.verify|verify} messages.
   * @param message Stone message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encodeDelimited(message: IStone, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Decodes a Stone message from the specified reader or buffer.
   * @param reader Reader or buffer to decode from
   * @param [length] Message length if known beforehand
   * @returns Stone
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): Stone;

  /**
   * Decodes a Stone message from the specified reader or buffer, length delimited.
   * @param reader Reader or buffer to decode from
   * @returns Stone
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): Stone;

  /**
   * Verifies a Stone message.
   * @param message Plain object to verify
   * @returns `null` if valid, otherwise the reason why it is not
   */
  public static verify(message: { [k: string]: any }): string | null;

  /**
   * Creates a Stone message from a plain object. Also converts values to their respective internal types.
   * @param object Plain object
   * @returns Stone
   */
  public static fromObject(object: { [k: string]: any }): Stone;

  /**
   * Creates a plain object from a Stone message. Also converts values to other types if specified.
   * @param message Stone
   * @param [options] Conversion options
   * @returns Plain object
   */
  public static toObject(
    message: Stone,
    options?: $protobuf.IConversionOptions
  ): { [k: string]: any };

  /**
   * Converts this Stone to JSON.
   * @returns JSON object
   */
  public toJSON(): { [k: string]: any };
}

/** Properties of a Config. */
export interface IConfig {
  /** Config prophecyEggs */
  prophecyEggs?: number | null;

  /** Config soulEggs */
  soulEggs?: number | null;

  /** Config soulEggsInput */
  soulEggsInput?: string | null;

  /** Config isEnlightenment */
  isEnlightenment?: boolean | null;

  /** Config missingSoulFood */
  missingSoulFood?: number | null;

  /** Config missingProphecyBonus */
  missingProphecyBonus?: number | null;

  /** Config birdFeedActive */
  birdFeedActive?: boolean | null;

  /** Config tachyonPrismActive */
  tachyonPrismActive?: boolean | null;

  /** Config soulBeaconActive */
  soulBeaconActive?: boolean | null;

  /** Config boostBeaconActive */
  boostBeaconActive?: boolean | null;

  /** Config tachyonDeflectorBonus */
  tachyonDeflectorBonus?: number | null;
}

/** Represents a Config. */
export class Config implements IConfig {
  /**
   * Constructs a new Config.
   * @param [properties] Properties to set
   */
  constructor(properties?: IConfig);

  /** Config prophecyEggs. */
  public prophecyEggs: number;

  /** Config soulEggs. */
  public soulEggs: number;

  /** Config soulEggsInput. */
  public soulEggsInput: string;

  /** Config isEnlightenment. */
  public isEnlightenment: boolean;

  /** Config missingSoulFood. */
  public missingSoulFood: number;

  /** Config missingProphecyBonus. */
  public missingProphecyBonus: number;

  /** Config birdFeedActive. */
  public birdFeedActive: boolean;

  /** Config tachyonPrismActive. */
  public tachyonPrismActive: boolean;

  /** Config soulBeaconActive. */
  public soulBeaconActive: boolean;

  /** Config boostBeaconActive. */
  public boostBeaconActive: boolean;

  /** Config tachyonDeflectorBonus. */
  public tachyonDeflectorBonus: number;

  /**
   * Creates a new Config instance using the specified properties.
   * @param [properties] Properties to set
   * @returns Config instance
   */
  public static create(properties?: IConfig): Config;

  /**
   * Encodes the specified Config message. Does not implicitly {@link Config.verify|verify} messages.
   * @param message Config message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encode(message: IConfig, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Encodes the specified Config message, length delimited. Does not implicitly {@link Config.verify|verify} messages.
   * @param message Config message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encodeDelimited(message: IConfig, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Decodes a Config message from the specified reader or buffer.
   * @param reader Reader or buffer to decode from
   * @param [length] Message length if known beforehand
   * @returns Config
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): Config;

  /**
   * Decodes a Config message from the specified reader or buffer, length delimited.
   * @param reader Reader or buffer to decode from
   * @returns Config
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): Config;

  /**
   * Verifies a Config message.
   * @param message Plain object to verify
   * @returns `null` if valid, otherwise the reason why it is not
   */
  public static verify(message: { [k: string]: any }): string | null;

  /**
   * Creates a Config message from a plain object. Also converts values to their respective internal types.
   * @param object Plain object
   * @returns Config
   */
  public static fromObject(object: { [k: string]: any }): Config;

  /**
   * Creates a plain object from a Config message. Also converts values to other types if specified.
   * @param message Config
   * @param [options] Conversion options
   * @returns Plain object
   */
  public static toObject(
    message: Config,
    options?: $protobuf.IConversionOptions
  ): { [k: string]: any };

  /**
   * Converts this Config to JSON.
   * @returns JSON object
   */
  public toJSON(): { [k: string]: any };
}

/** Properties of an ArtifactSpec. */
export interface IArtifactSpec {
  /** ArtifactSpec name */
  name?: ArtifactSpec.Name | null;

  /** ArtifactSpec level */
  level?: ArtifactSpec.Level | null;

  /** ArtifactSpec rarity */
  rarity?: ArtifactSpec.Rarity | null;

  /** ArtifactSpec egg */
  egg?: Egg | null;
}

/** Represents an ArtifactSpec. */
export class ArtifactSpec implements IArtifactSpec {
  /**
   * Constructs a new ArtifactSpec.
   * @param [properties] Properties to set
   */
  constructor(properties?: IArtifactSpec);

  /** ArtifactSpec name. */
  public name: ArtifactSpec.Name;

  /** ArtifactSpec level. */
  public level: ArtifactSpec.Level;

  /** ArtifactSpec rarity. */
  public rarity: ArtifactSpec.Rarity;

  /** ArtifactSpec egg. */
  public egg: Egg;

  /**
   * Creates a new ArtifactSpec instance using the specified properties.
   * @param [properties] Properties to set
   * @returns ArtifactSpec instance
   */
  public static create(properties?: IArtifactSpec): ArtifactSpec;

  /**
   * Encodes the specified ArtifactSpec message. Does not implicitly {@link ArtifactSpec.verify|verify} messages.
   * @param message ArtifactSpec message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encode(message: IArtifactSpec, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * Encodes the specified ArtifactSpec message, length delimited. Does not implicitly {@link ArtifactSpec.verify|verify} messages.
   * @param message ArtifactSpec message or plain object to encode
   * @param [writer] Writer to encode to
   * @returns Writer
   */
  public static encodeDelimited(
    message: IArtifactSpec,
    writer?: $protobuf.Writer
  ): $protobuf.Writer;

  /**
   * Decodes an ArtifactSpec message from the specified reader or buffer.
   * @param reader Reader or buffer to decode from
   * @param [length] Message length if known beforehand
   * @returns ArtifactSpec
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decode(reader: $protobuf.Reader | Uint8Array, length?: number): ArtifactSpec;

  /**
   * Decodes an ArtifactSpec message from the specified reader or buffer, length delimited.
   * @param reader Reader or buffer to decode from
   * @returns ArtifactSpec
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  public static decodeDelimited(reader: $protobuf.Reader | Uint8Array): ArtifactSpec;

  /**
   * Verifies an ArtifactSpec message.
   * @param message Plain object to verify
   * @returns `null` if valid, otherwise the reason why it is not
   */
  public static verify(message: { [k: string]: any }): string | null;

  /**
   * Creates an ArtifactSpec message from a plain object. Also converts values to their respective internal types.
   * @param object Plain object
   * @returns ArtifactSpec
   */
  public static fromObject(object: { [k: string]: any }): ArtifactSpec;

  /**
   * Creates a plain object from an ArtifactSpec message. Also converts values to other types if specified.
   * @param message ArtifactSpec
   * @param [options] Conversion options
   * @returns Plain object
   */
  public static toObject(
    message: ArtifactSpec,
    options?: $protobuf.IConversionOptions
  ): { [k: string]: any };

  /**
   * Converts this ArtifactSpec to JSON.
   * @returns JSON object
   */
  public toJSON(): { [k: string]: any };
}

export namespace ArtifactSpec {
  /** Name enum. */
  enum Name {
    LUNAR_TOTEM = 0,
    NEODYMIUM_MEDALLION = 3,
    BEAK_OF_MIDAS = 4,
    LIGHT_OF_EGGENDIL = 5,
    DEMETERS_NECKLACE = 6,
    VIAL_MARTIAN_DUST = 7,
    ORNATE_GUSSET = 8,
    THE_CHALICE = 9,
    BOOK_OF_BASAN = 10,
    PHOENIX_FEATHER = 11,
    TUNGSTEN_ANKH = 12,
    AURELIAN_BROOCH = 21,
    CARVED_RAINSTICK = 22,
    PUZZLE_CUBE = 23,
    QUANTUM_METRONOME = 24,
    SHIP_IN_A_BOTTLE = 25,
    TACHYON_DEFLECTOR = 26,
    INTERSTELLAR_COMPASS = 27,
    DILITHIUM_MONOCLE = 28,
    TITANIUM_ACTUATOR = 29,
    MERCURYS_LENS = 30,
    TACHYON_STONE = 1,
    DILITHIUM_STONE = 31,
    SHELL_STONE = 32,
    LUNAR_STONE = 33,
    SOUL_STONE = 34,
    PROPHECY_STONE = 39,
    QUANTUM_STONE = 36,
    TERRA_STONE = 37,
    LIFE_STONE = 38,
    CLARITY_STONE = 40,
    EXTRATERRESTRIAL_ALUMINUM = 13,
    ANCIENT_TUNGSTEN = 14,
    SPACE_ROCKS = 15,
    ALIEN_WOOD = 16,
    GOLD_METEORITE = 17,
    TAU_CETI_GEODE = 18,
    CENTAURIAN_STEEL = 19,
    ERIDANI_FEATHER = 20,
    DRONE_PARTS = 35,
    CELESTIAL_BRONZE = 41,
    LALANDE_HIDE = 42,
    SOLAR_TITANIUM = 43,
    TACHYON_STONE_FRAGMENT = 2,
    DILITHIUM_STONE_FRAGMENT = 44,
    SHELL_STONE_FRAGMENT = 45,
    LUNAR_STONE_FRAGMENT = 46,
    SOUL_STONE_FRAGMENT = 47,
    PROPHECY_STONE_FRAGMENT = 48,
    QUANTUM_STONE_FRAGMENT = 49,
    TERRA_STONE_FRAGMENT = 50,
    LIFE_STONE_FRAGMENT = 51,
    CLARITY_STONE_FRAGMENT = 52,
    UNKNOWN = 10000,
  }

  /** Level enum. */
  enum Level {
    INFERIOR = 0,
    LESSER = 1,
    NORMAL = 2,
    GREATER = 3,
    SUPERIOR = 4,
  }

  /** Rarity enum. */
  enum Rarity {
    COMMON = 0,
    RARE = 1,
    EPIC = 2,
    LEGENDARY = 3,
  }

  /** Type enum. */
  enum Type {
    ARTIFACT = 0,
    STONE = 1,
    INGREDIENT = 2,
    STONE_INGREDIENT = 3,
  }
}

/** Egg enum. */
export enum Egg {
  INVALID_EGG = 0,
  EDIBLE = 1,
  SUPERFOOD = 2,
  MEDICAL = 3,
  ROCKET_FUEL = 4,
  SUPER_MATERIAL = 5,
  FUSION = 6,
  QUANTUM = 7,
  IMMORTALITY = 8,
  TACHYON = 9,
  GRAVITON = 10,
  DILITHIUM = 11,
  PRODIGY = 12,
  TERRAFORM = 13,
  ANTIMATTER = 14,
  DARK_MATTER = 15,
  AI = 16,
  NEBULA = 17,
  UNIVERSE = 18,
  ENLIGHTENMENT = 19,
  CHOCOLATE = 100,
  EASTER = 101,
  WATERBALLOON = 102,
  FIREWORK = 103,
  PUMPKIN = 104,
  UNKNOWN = 1000,
}
