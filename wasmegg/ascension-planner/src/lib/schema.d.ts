import * as $protobuf from "protobufjs";
import Long = require("long");
/** Properties of a Stone. */
export interface IStone {

    /** Stone afxId */
    afxId?: (number|null);

    /** Stone afxLevel */
    afxLevel?: (number|null);
}

/** Represents a Stone. */
export class Stone implements IStone {

    /**
     * Constructs a new Stone.
     * @param [properties] Properties to set
     */
    constructor(properties?: IStone);

    /** Stone afxId. */
    public afxId: number;

    /** Stone afxLevel. */
    public afxLevel: number;

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
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Stone;

    /**
     * Decodes a Stone message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Stone
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Stone;

    /**
     * Verifies a Stone message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

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
    public static toObject(message: Stone, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Stone to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Stone
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an Artifact. */
export interface IArtifact {

    /** Artifact afxId */
    afxId?: (number|null);

    /** Artifact afxLevel */
    afxLevel?: (number|null);

    /** Artifact afxRarity */
    afxRarity?: (number|null);

    /** Artifact stones */
    stones?: (IStone[]|null);
}

/** Represents an Artifact. */
export class Artifact implements IArtifact {

    /**
     * Constructs a new Artifact.
     * @param [properties] Properties to set
     */
    constructor(properties?: IArtifact);

    /** Artifact afxId. */
    public afxId: number;

    /** Artifact afxLevel. */
    public afxLevel: number;

    /** Artifact afxRarity. */
    public afxRarity: number;

    /** Artifact stones. */
    public stones: IStone[];

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
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Artifact;

    /**
     * Decodes an Artifact message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Artifact
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Artifact;

    /**
     * Verifies an Artifact message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

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
    public static toObject(message: Artifact, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Artifact to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for Artifact
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a FuelTankState. */
export interface IFuelTankState {

    /** FuelTankState capacity */
    capacity?: (number|null);

    /** FuelTankState curiosityStored */
    curiosityStored?: (number|null);

    /** FuelTankState integrityStored */
    integrityStored?: (number|null);

    /** FuelTankState kindnessStored */
    kindnessStored?: (number|null);

    /** FuelTankState humilityStored */
    humilityStored?: (number|null);

    /** FuelTankState resilienceStored */
    resilienceStored?: (number|null);
}

/** Represents a FuelTankState. */
export class FuelTankState implements IFuelTankState {

    /**
     * Constructs a new FuelTankState.
     * @param [properties] Properties to set
     */
    constructor(properties?: IFuelTankState);

    /** FuelTankState capacity. */
    public capacity: number;

    /** FuelTankState curiosityStored. */
    public curiosityStored: number;

    /** FuelTankState integrityStored. */
    public integrityStored: number;

    /** FuelTankState kindnessStored. */
    public kindnessStored: number;

    /** FuelTankState humilityStored. */
    public humilityStored: number;

    /** FuelTankState resilienceStored. */
    public resilienceStored: number;

    /**
     * Creates a new FuelTankState instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FuelTankState instance
     */
    public static create(properties?: IFuelTankState): FuelTankState;

    /**
     * Encodes the specified FuelTankState message. Does not implicitly {@link FuelTankState.verify|verify} messages.
     * @param message FuelTankState message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IFuelTankState, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified FuelTankState message, length delimited. Does not implicitly {@link FuelTankState.verify|verify} messages.
     * @param message FuelTankState message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IFuelTankState, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a FuelTankState message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FuelTankState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): FuelTankState;

    /**
     * Decodes a FuelTankState message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FuelTankState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): FuelTankState;

    /**
     * Verifies a FuelTankState message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a FuelTankState message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FuelTankState
     */
    public static fromObject(object: { [k: string]: any }): FuelTankState;

    /**
     * Creates a plain object from a FuelTankState message. Also converts values to other types if specified.
     * @param message FuelTankState
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: FuelTankState, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this FuelTankState to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FuelTankState
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an AscensionPlan. */
export interface IAscensionPlan {

    /** AscensionPlan initialState */
    initialState?: (IInitialState|null);

    /** AscensionPlan steps */
    steps?: (IAscensionStep[]|null);
}

/** Represents an AscensionPlan. */
export class AscensionPlan implements IAscensionPlan {

    /**
     * Constructs a new AscensionPlan.
     * @param [properties] Properties to set
     */
    constructor(properties?: IAscensionPlan);

    /** AscensionPlan initialState. */
    public initialState?: (IInitialState|null);

    /** AscensionPlan steps. */
    public steps: IAscensionStep[];

    /**
     * Creates a new AscensionPlan instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AscensionPlan instance
     */
    public static create(properties?: IAscensionPlan): AscensionPlan;

    /**
     * Encodes the specified AscensionPlan message. Does not implicitly {@link AscensionPlan.verify|verify} messages.
     * @param message AscensionPlan message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IAscensionPlan, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified AscensionPlan message, length delimited. Does not implicitly {@link AscensionPlan.verify|verify} messages.
     * @param message AscensionPlan message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IAscensionPlan, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an AscensionPlan message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AscensionPlan
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): AscensionPlan;

    /**
     * Decodes an AscensionPlan message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AscensionPlan
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): AscensionPlan;

    /**
     * Verifies an AscensionPlan message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an AscensionPlan message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AscensionPlan
     */
    public static fromObject(object: { [k: string]: any }): AscensionPlan;

    /**
     * Creates a plain object from an AscensionPlan message. Also converts values to other types if specified.
     * @param message AscensionPlan
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: AscensionPlan, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this AscensionPlan to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AscensionPlan
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an InitialState. */
export interface IInitialState {

    /** InitialState soulEggs */
    soulEggs?: (number|null);

    /** InitialState soulEggsInput */
    soulEggsInput?: (string|null);

    /** InitialState truthEggs */
    truthEggs?: (number|null);

    /** InitialState shiftsUsed */
    shiftsUsed?: (number|null);

    /** InitialState curiosityLaid */
    curiosityLaid?: (number|null);

    /** InitialState integrityLaid */
    integrityLaid?: (number|null);

    /** InitialState kindnessLaid */
    kindnessLaid?: (number|null);

    /** InitialState humilityLaid */
    humilityLaid?: (number|null);

    /** InitialState resilienceLaid */
    resilienceLaid?: (number|null);

    /** InitialState fuelTank */
    fuelTank?: (IFuelTankState|null);

    /** InitialState startTimestamp */
    startTimestamp?: (number|null);

    /** InitialState earningsArtifacts */
    earningsArtifacts?: (IArtifact[]|null);
}

/** Represents an InitialState. */
export class InitialState implements IInitialState {

    /**
     * Constructs a new InitialState.
     * @param [properties] Properties to set
     */
    constructor(properties?: IInitialState);

    /** InitialState soulEggs. */
    public soulEggs: number;

    /** InitialState soulEggsInput. */
    public soulEggsInput: string;

    /** InitialState truthEggs. */
    public truthEggs: number;

    /** InitialState shiftsUsed. */
    public shiftsUsed: number;

    /** InitialState curiosityLaid. */
    public curiosityLaid: number;

    /** InitialState integrityLaid. */
    public integrityLaid: number;

    /** InitialState kindnessLaid. */
    public kindnessLaid: number;

    /** InitialState humilityLaid. */
    public humilityLaid: number;

    /** InitialState resilienceLaid. */
    public resilienceLaid: number;

    /** InitialState fuelTank. */
    public fuelTank?: (IFuelTankState|null);

    /** InitialState startTimestamp. */
    public startTimestamp: number;

    /** InitialState earningsArtifacts. */
    public earningsArtifacts: IArtifact[];

    /**
     * Creates a new InitialState instance using the specified properties.
     * @param [properties] Properties to set
     * @returns InitialState instance
     */
    public static create(properties?: IInitialState): InitialState;

    /**
     * Encodes the specified InitialState message. Does not implicitly {@link InitialState.verify|verify} messages.
     * @param message InitialState message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IInitialState, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified InitialState message, length delimited. Does not implicitly {@link InitialState.verify|verify} messages.
     * @param message InitialState message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IInitialState, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an InitialState message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns InitialState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): InitialState;

    /**
     * Decodes an InitialState message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns InitialState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): InitialState;

    /**
     * Verifies an InitialState message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an InitialState message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns InitialState
     */
    public static fromObject(object: { [k: string]: any }): InitialState;

    /**
     * Creates a plain object from an InitialState message. Also converts values to other types if specified.
     * @param message InitialState
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: InitialState, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this InitialState to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for InitialState
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of an AscensionStep. */
export interface IAscensionStep {

    /** AscensionStep id */
    id?: (string|null);

    /** AscensionStep eggType */
    eggType?: (VirtueEgg|null);

    /** AscensionStep expanded */
    expanded?: (boolean|null);

    /** AscensionStep purchases */
    purchases?: (IStepPurchases|null);

    /** AscensionStep fuelActions */
    fuelActions?: (IFuelTankAction[]|null);

    /** AscensionStep durationSeconds */
    durationSeconds?: (number|null);

    /** AscensionStep artifacts */
    artifacts?: (IArtifact[]|null);
}

/** Represents an AscensionStep. */
export class AscensionStep implements IAscensionStep {

    /**
     * Constructs a new AscensionStep.
     * @param [properties] Properties to set
     */
    constructor(properties?: IAscensionStep);

    /** AscensionStep id. */
    public id: string;

    /** AscensionStep eggType. */
    public eggType: VirtueEgg;

    /** AscensionStep expanded. */
    public expanded: boolean;

    /** AscensionStep purchases. */
    public purchases?: (IStepPurchases|null);

    /** AscensionStep fuelActions. */
    public fuelActions: IFuelTankAction[];

    /** AscensionStep durationSeconds. */
    public durationSeconds: number;

    /** AscensionStep artifacts. */
    public artifacts: IArtifact[];

    /**
     * Creates a new AscensionStep instance using the specified properties.
     * @param [properties] Properties to set
     * @returns AscensionStep instance
     */
    public static create(properties?: IAscensionStep): AscensionStep;

    /**
     * Encodes the specified AscensionStep message. Does not implicitly {@link AscensionStep.verify|verify} messages.
     * @param message AscensionStep message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IAscensionStep, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified AscensionStep message, length delimited. Does not implicitly {@link AscensionStep.verify|verify} messages.
     * @param message AscensionStep message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IAscensionStep, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an AscensionStep message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns AscensionStep
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): AscensionStep;

    /**
     * Decodes an AscensionStep message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns AscensionStep
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): AscensionStep;

    /**
     * Verifies an AscensionStep message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an AscensionStep message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns AscensionStep
     */
    public static fromObject(object: { [k: string]: any }): AscensionStep;

    /**
     * Creates a plain object from an AscensionStep message. Also converts values to other types if specified.
     * @param message AscensionStep
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: AscensionStep, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this AscensionStep to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for AscensionStep
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a StepPurchases. */
export interface IStepPurchases {

    /** StepPurchases research */
    research?: (IResearchPurchase[]|null);

    /** StepPurchases habs */
    habs?: (IHabPurchase[]|null);

    /** StepPurchases vehicles */
    vehicles?: (IVehiclePurchase[]|null);

    /** StepPurchases silosPurchased */
    silosPurchased?: (number|null);

    /** StepPurchases rockets */
    rockets?: (IRocketLaunch[]|null);
}

/** Represents a StepPurchases. */
export class StepPurchases implements IStepPurchases {

    /**
     * Constructs a new StepPurchases.
     * @param [properties] Properties to set
     */
    constructor(properties?: IStepPurchases);

    /** StepPurchases research. */
    public research: IResearchPurchase[];

    /** StepPurchases habs. */
    public habs: IHabPurchase[];

    /** StepPurchases vehicles. */
    public vehicles: IVehiclePurchase[];

    /** StepPurchases silosPurchased. */
    public silosPurchased: number;

    /** StepPurchases rockets. */
    public rockets: IRocketLaunch[];

    /**
     * Creates a new StepPurchases instance using the specified properties.
     * @param [properties] Properties to set
     * @returns StepPurchases instance
     */
    public static create(properties?: IStepPurchases): StepPurchases;

    /**
     * Encodes the specified StepPurchases message. Does not implicitly {@link StepPurchases.verify|verify} messages.
     * @param message StepPurchases message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IStepPurchases, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified StepPurchases message, length delimited. Does not implicitly {@link StepPurchases.verify|verify} messages.
     * @param message StepPurchases message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IStepPurchases, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a StepPurchases message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns StepPurchases
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): StepPurchases;

    /**
     * Decodes a StepPurchases message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns StepPurchases
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): StepPurchases;

    /**
     * Verifies a StepPurchases message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a StepPurchases message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns StepPurchases
     */
    public static fromObject(object: { [k: string]: any }): StepPurchases;

    /**
     * Creates a plain object from a StepPurchases message. Also converts values to other types if specified.
     * @param message StepPurchases
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: StepPurchases, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this StepPurchases to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for StepPurchases
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a ResearchPurchase. */
export interface IResearchPurchase {

    /** ResearchPurchase researchId */
    researchId?: (string|null);

    /** ResearchPurchase levels */
    levels?: (number|null);
}

/** Represents a ResearchPurchase. */
export class ResearchPurchase implements IResearchPurchase {

    /**
     * Constructs a new ResearchPurchase.
     * @param [properties] Properties to set
     */
    constructor(properties?: IResearchPurchase);

    /** ResearchPurchase researchId. */
    public researchId: string;

    /** ResearchPurchase levels. */
    public levels: number;

    /**
     * Creates a new ResearchPurchase instance using the specified properties.
     * @param [properties] Properties to set
     * @returns ResearchPurchase instance
     */
    public static create(properties?: IResearchPurchase): ResearchPurchase;

    /**
     * Encodes the specified ResearchPurchase message. Does not implicitly {@link ResearchPurchase.verify|verify} messages.
     * @param message ResearchPurchase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IResearchPurchase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified ResearchPurchase message, length delimited. Does not implicitly {@link ResearchPurchase.verify|verify} messages.
     * @param message ResearchPurchase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IResearchPurchase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a ResearchPurchase message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns ResearchPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): ResearchPurchase;

    /**
     * Decodes a ResearchPurchase message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns ResearchPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): ResearchPurchase;

    /**
     * Verifies a ResearchPurchase message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a ResearchPurchase message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns ResearchPurchase
     */
    public static fromObject(object: { [k: string]: any }): ResearchPurchase;

    /**
     * Creates a plain object from a ResearchPurchase message. Also converts values to other types if specified.
     * @param message ResearchPurchase
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: ResearchPurchase, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this ResearchPurchase to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for ResearchPurchase
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a HabPurchase. */
export interface IHabPurchase {

    /** HabPurchase habIndex */
    habIndex?: (number|null);

    /** HabPurchase habType */
    habType?: (number|null);
}

/** Represents a HabPurchase. */
export class HabPurchase implements IHabPurchase {

    /**
     * Constructs a new HabPurchase.
     * @param [properties] Properties to set
     */
    constructor(properties?: IHabPurchase);

    /** HabPurchase habIndex. */
    public habIndex: number;

    /** HabPurchase habType. */
    public habType: number;

    /**
     * Creates a new HabPurchase instance using the specified properties.
     * @param [properties] Properties to set
     * @returns HabPurchase instance
     */
    public static create(properties?: IHabPurchase): HabPurchase;

    /**
     * Encodes the specified HabPurchase message. Does not implicitly {@link HabPurchase.verify|verify} messages.
     * @param message HabPurchase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IHabPurchase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified HabPurchase message, length delimited. Does not implicitly {@link HabPurchase.verify|verify} messages.
     * @param message HabPurchase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IHabPurchase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a HabPurchase message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns HabPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): HabPurchase;

    /**
     * Decodes a HabPurchase message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns HabPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): HabPurchase;

    /**
     * Verifies a HabPurchase message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a HabPurchase message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns HabPurchase
     */
    public static fromObject(object: { [k: string]: any }): HabPurchase;

    /**
     * Creates a plain object from a HabPurchase message. Also converts values to other types if specified.
     * @param message HabPurchase
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: HabPurchase, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this HabPurchase to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for HabPurchase
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a VehiclePurchase. */
export interface IVehiclePurchase {

    /** VehiclePurchase vehicleIndex */
    vehicleIndex?: (number|null);

    /** VehiclePurchase vehicleType */
    vehicleType?: (number|null);
}

/** Represents a VehiclePurchase. */
export class VehiclePurchase implements IVehiclePurchase {

    /**
     * Constructs a new VehiclePurchase.
     * @param [properties] Properties to set
     */
    constructor(properties?: IVehiclePurchase);

    /** VehiclePurchase vehicleIndex. */
    public vehicleIndex: number;

    /** VehiclePurchase vehicleType. */
    public vehicleType: number;

    /**
     * Creates a new VehiclePurchase instance using the specified properties.
     * @param [properties] Properties to set
     * @returns VehiclePurchase instance
     */
    public static create(properties?: IVehiclePurchase): VehiclePurchase;

    /**
     * Encodes the specified VehiclePurchase message. Does not implicitly {@link VehiclePurchase.verify|verify} messages.
     * @param message VehiclePurchase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IVehiclePurchase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified VehiclePurchase message, length delimited. Does not implicitly {@link VehiclePurchase.verify|verify} messages.
     * @param message VehiclePurchase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IVehiclePurchase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a VehiclePurchase message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns VehiclePurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): VehiclePurchase;

    /**
     * Decodes a VehiclePurchase message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns VehiclePurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): VehiclePurchase;

    /**
     * Verifies a VehiclePurchase message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a VehiclePurchase message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns VehiclePurchase
     */
    public static fromObject(object: { [k: string]: any }): VehiclePurchase;

    /**
     * Creates a plain object from a VehiclePurchase message. Also converts values to other types if specified.
     * @param message VehiclePurchase
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: VehiclePurchase, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this VehiclePurchase to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for VehiclePurchase
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a RocketLaunch. */
export interface IRocketLaunch {

    /** RocketLaunch shipType */
    shipType?: (number|null);

    /** RocketLaunch missionType */
    missionType?: (number|null);

    /** RocketLaunch curiosityFuel */
    curiosityFuel?: (number|null);

    /** RocketLaunch integrityFuel */
    integrityFuel?: (number|null);

    /** RocketLaunch kindnessFuel */
    kindnessFuel?: (number|null);

    /** RocketLaunch humilityFuel */
    humilityFuel?: (number|null);

    /** RocketLaunch resilienceFuel */
    resilienceFuel?: (number|null);
}

/** Represents a RocketLaunch. */
export class RocketLaunch implements IRocketLaunch {

    /**
     * Constructs a new RocketLaunch.
     * @param [properties] Properties to set
     */
    constructor(properties?: IRocketLaunch);

    /** RocketLaunch shipType. */
    public shipType: number;

    /** RocketLaunch missionType. */
    public missionType: number;

    /** RocketLaunch curiosityFuel. */
    public curiosityFuel: number;

    /** RocketLaunch integrityFuel. */
    public integrityFuel: number;

    /** RocketLaunch kindnessFuel. */
    public kindnessFuel: number;

    /** RocketLaunch humilityFuel. */
    public humilityFuel: number;

    /** RocketLaunch resilienceFuel. */
    public resilienceFuel: number;

    /**
     * Creates a new RocketLaunch instance using the specified properties.
     * @param [properties] Properties to set
     * @returns RocketLaunch instance
     */
    public static create(properties?: IRocketLaunch): RocketLaunch;

    /**
     * Encodes the specified RocketLaunch message. Does not implicitly {@link RocketLaunch.verify|verify} messages.
     * @param message RocketLaunch message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IRocketLaunch, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified RocketLaunch message, length delimited. Does not implicitly {@link RocketLaunch.verify|verify} messages.
     * @param message RocketLaunch message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IRocketLaunch, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a RocketLaunch message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns RocketLaunch
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): RocketLaunch;

    /**
     * Decodes a RocketLaunch message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns RocketLaunch
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): RocketLaunch;

    /**
     * Verifies a RocketLaunch message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a RocketLaunch message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns RocketLaunch
     */
    public static fromObject(object: { [k: string]: any }): RocketLaunch;

    /**
     * Creates a plain object from a RocketLaunch message. Also converts values to other types if specified.
     * @param message RocketLaunch
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: RocketLaunch, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this RocketLaunch to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for RocketLaunch
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** Properties of a FuelTankAction. */
export interface IFuelTankAction {

    /** FuelTankAction actionType */
    actionType?: (FuelActionType|null);

    /** FuelTankAction eggType */
    eggType?: (VirtueEgg|null);

    /** FuelTankAction amount */
    amount?: (number|null);
}

/** Represents a FuelTankAction. */
export class FuelTankAction implements IFuelTankAction {

    /**
     * Constructs a new FuelTankAction.
     * @param [properties] Properties to set
     */
    constructor(properties?: IFuelTankAction);

    /** FuelTankAction actionType. */
    public actionType: FuelActionType;

    /** FuelTankAction eggType. */
    public eggType: VirtueEgg;

    /** FuelTankAction amount. */
    public amount: number;

    /**
     * Creates a new FuelTankAction instance using the specified properties.
     * @param [properties] Properties to set
     * @returns FuelTankAction instance
     */
    public static create(properties?: IFuelTankAction): FuelTankAction;

    /**
     * Encodes the specified FuelTankAction message. Does not implicitly {@link FuelTankAction.verify|verify} messages.
     * @param message FuelTankAction message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IFuelTankAction, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified FuelTankAction message, length delimited. Does not implicitly {@link FuelTankAction.verify|verify} messages.
     * @param message FuelTankAction message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IFuelTankAction, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a FuelTankAction message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns FuelTankAction
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): FuelTankAction;

    /**
     * Decodes a FuelTankAction message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns FuelTankAction
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): FuelTankAction;

    /**
     * Verifies a FuelTankAction message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a FuelTankAction message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns FuelTankAction
     */
    public static fromObject(object: { [k: string]: any }): FuelTankAction;

    /**
     * Creates a plain object from a FuelTankAction message. Also converts values to other types if specified.
     * @param message FuelTankAction
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: FuelTankAction, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this FuelTankAction to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };

    /**
     * Gets the default type url for FuelTankAction
     * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns The default type url
     */
    public static getTypeUrl(typeUrlPrefix?: string): string;
}

/** FuelActionType enum. */
export enum FuelActionType {
    FUEL_ACTION_UNKNOWN = 0,
    FUEL_ACTION_FILL = 1,
    FUEL_ACTION_USE = 2
}

/** VirtueEgg enum. */
export enum VirtueEgg {
    VIRTUE_EGG_UNKNOWN = 0,
    CURIOSITY = 1,
    INTEGRITY = 2,
    KINDNESS = 3,
    HUMILITY = 4,
    RESILIENCE = 5
}
