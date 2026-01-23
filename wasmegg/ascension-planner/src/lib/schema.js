/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const Stone = $root.Stone = (() => {

    /**
     * Properties of a Stone.
     * @exports IStone
     * @interface IStone
     * @property {number|null} [afxId] Stone afxId
     * @property {number|null} [afxLevel] Stone afxLevel
     */

    /**
     * Constructs a new Stone.
     * @exports Stone
     * @classdesc Represents a Stone.
     * @implements IStone
     * @constructor
     * @param {IStone=} [properties] Properties to set
     */
    function Stone(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Stone afxId.
     * @member {number} afxId
     * @memberof Stone
     * @instance
     */
    Stone.prototype.afxId = 0;

    /**
     * Stone afxLevel.
     * @member {number} afxLevel
     * @memberof Stone
     * @instance
     */
    Stone.prototype.afxLevel = 0;

    /**
     * Creates a new Stone instance using the specified properties.
     * @function create
     * @memberof Stone
     * @static
     * @param {IStone=} [properties] Properties to set
     * @returns {Stone} Stone instance
     */
    Stone.create = function create(properties) {
        return new Stone(properties);
    };

    /**
     * Encodes the specified Stone message. Does not implicitly {@link Stone.verify|verify} messages.
     * @function encode
     * @memberof Stone
     * @static
     * @param {IStone} message Stone message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Stone.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.afxId != null && Object.hasOwnProperty.call(message, "afxId"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.afxId);
        if (message.afxLevel != null && Object.hasOwnProperty.call(message, "afxLevel"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.afxLevel);
        return writer;
    };

    /**
     * Encodes the specified Stone message, length delimited. Does not implicitly {@link Stone.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Stone
     * @static
     * @param {IStone} message Stone message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Stone.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Stone message from the specified reader or buffer.
     * @function decode
     * @memberof Stone
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Stone} Stone
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Stone.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Stone();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.afxId = reader.uint32();
                    break;
                }
            case 2: {
                    message.afxLevel = reader.uint32();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Stone message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Stone
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Stone} Stone
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Stone.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Stone message.
     * @function verify
     * @memberof Stone
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Stone.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.afxId != null && message.hasOwnProperty("afxId"))
            if (!$util.isInteger(message.afxId))
                return "afxId: integer expected";
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            if (!$util.isInteger(message.afxLevel))
                return "afxLevel: integer expected";
        return null;
    };

    /**
     * Creates a Stone message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Stone
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Stone} Stone
     */
    Stone.fromObject = function fromObject(object) {
        if (object instanceof $root.Stone)
            return object;
        let message = new $root.Stone();
        if (object.afxId != null)
            message.afxId = object.afxId >>> 0;
        if (object.afxLevel != null)
            message.afxLevel = object.afxLevel >>> 0;
        return message;
    };

    /**
     * Creates a plain object from a Stone message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Stone
     * @static
     * @param {Stone} message Stone
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Stone.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.afxId = 0;
            object.afxLevel = 0;
        }
        if (message.afxId != null && message.hasOwnProperty("afxId"))
            object.afxId = message.afxId;
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            object.afxLevel = message.afxLevel;
        return object;
    };

    /**
     * Converts this Stone to JSON.
     * @function toJSON
     * @memberof Stone
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Stone.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Stone
     * @function getTypeUrl
     * @memberof Stone
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Stone.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Stone";
    };

    return Stone;
})();

export const Artifact = $root.Artifact = (() => {

    /**
     * Properties of an Artifact.
     * @exports IArtifact
     * @interface IArtifact
     * @property {number|null} [afxId] Artifact afxId
     * @property {number|null} [afxLevel] Artifact afxLevel
     * @property {number|null} [afxRarity] Artifact afxRarity
     * @property {Array.<IStone>|null} [stones] Artifact stones
     */

    /**
     * Constructs a new Artifact.
     * @exports Artifact
     * @classdesc Represents an Artifact.
     * @implements IArtifact
     * @constructor
     * @param {IArtifact=} [properties] Properties to set
     */
    function Artifact(properties) {
        this.stones = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Artifact afxId.
     * @member {number} afxId
     * @memberof Artifact
     * @instance
     */
    Artifact.prototype.afxId = 0;

    /**
     * Artifact afxLevel.
     * @member {number} afxLevel
     * @memberof Artifact
     * @instance
     */
    Artifact.prototype.afxLevel = 0;

    /**
     * Artifact afxRarity.
     * @member {number} afxRarity
     * @memberof Artifact
     * @instance
     */
    Artifact.prototype.afxRarity = 0;

    /**
     * Artifact stones.
     * @member {Array.<IStone>} stones
     * @memberof Artifact
     * @instance
     */
    Artifact.prototype.stones = $util.emptyArray;

    /**
     * Creates a new Artifact instance using the specified properties.
     * @function create
     * @memberof Artifact
     * @static
     * @param {IArtifact=} [properties] Properties to set
     * @returns {Artifact} Artifact instance
     */
    Artifact.create = function create(properties) {
        return new Artifact(properties);
    };

    /**
     * Encodes the specified Artifact message. Does not implicitly {@link Artifact.verify|verify} messages.
     * @function encode
     * @memberof Artifact
     * @static
     * @param {IArtifact} message Artifact message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Artifact.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.afxId != null && Object.hasOwnProperty.call(message, "afxId"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.afxId);
        if (message.afxLevel != null && Object.hasOwnProperty.call(message, "afxLevel"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.afxLevel);
        if (message.afxRarity != null && Object.hasOwnProperty.call(message, "afxRarity"))
            writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.afxRarity);
        if (message.stones != null && message.stones.length)
            for (let i = 0; i < message.stones.length; ++i)
                $root.Stone.encode(message.stones[i], writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified Artifact message, length delimited. Does not implicitly {@link Artifact.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Artifact
     * @static
     * @param {IArtifact} message Artifact message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Artifact.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an Artifact message from the specified reader or buffer.
     * @function decode
     * @memberof Artifact
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Artifact} Artifact
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Artifact.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Artifact();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.afxId = reader.uint32();
                    break;
                }
            case 2: {
                    message.afxLevel = reader.uint32();
                    break;
                }
            case 3: {
                    message.afxRarity = reader.uint32();
                    break;
                }
            case 10: {
                    if (!(message.stones && message.stones.length))
                        message.stones = [];
                    message.stones.push($root.Stone.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an Artifact message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Artifact
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Artifact} Artifact
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Artifact.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an Artifact message.
     * @function verify
     * @memberof Artifact
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Artifact.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.afxId != null && message.hasOwnProperty("afxId"))
            if (!$util.isInteger(message.afxId))
                return "afxId: integer expected";
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            if (!$util.isInteger(message.afxLevel))
                return "afxLevel: integer expected";
        if (message.afxRarity != null && message.hasOwnProperty("afxRarity"))
            if (!$util.isInteger(message.afxRarity))
                return "afxRarity: integer expected";
        if (message.stones != null && message.hasOwnProperty("stones")) {
            if (!Array.isArray(message.stones))
                return "stones: array expected";
            for (let i = 0; i < message.stones.length; ++i) {
                let error = $root.Stone.verify(message.stones[i]);
                if (error)
                    return "stones." + error;
            }
        }
        return null;
    };

    /**
     * Creates an Artifact message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Artifact
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Artifact} Artifact
     */
    Artifact.fromObject = function fromObject(object) {
        if (object instanceof $root.Artifact)
            return object;
        let message = new $root.Artifact();
        if (object.afxId != null)
            message.afxId = object.afxId >>> 0;
        if (object.afxLevel != null)
            message.afxLevel = object.afxLevel >>> 0;
        if (object.afxRarity != null)
            message.afxRarity = object.afxRarity >>> 0;
        if (object.stones) {
            if (!Array.isArray(object.stones))
                throw TypeError(".Artifact.stones: array expected");
            message.stones = [];
            for (let i = 0; i < object.stones.length; ++i) {
                if (typeof object.stones[i] !== "object")
                    throw TypeError(".Artifact.stones: object expected");
                message.stones[i] = $root.Stone.fromObject(object.stones[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from an Artifact message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Artifact
     * @static
     * @param {Artifact} message Artifact
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Artifact.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.stones = [];
        if (options.defaults) {
            object.afxId = 0;
            object.afxLevel = 0;
            object.afxRarity = 0;
        }
        if (message.afxId != null && message.hasOwnProperty("afxId"))
            object.afxId = message.afxId;
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            object.afxLevel = message.afxLevel;
        if (message.afxRarity != null && message.hasOwnProperty("afxRarity"))
            object.afxRarity = message.afxRarity;
        if (message.stones && message.stones.length) {
            object.stones = [];
            for (let j = 0; j < message.stones.length; ++j)
                object.stones[j] = $root.Stone.toObject(message.stones[j], options);
        }
        return object;
    };

    /**
     * Converts this Artifact to JSON.
     * @function toJSON
     * @memberof Artifact
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Artifact.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for Artifact
     * @function getTypeUrl
     * @memberof Artifact
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    Artifact.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/Artifact";
    };

    return Artifact;
})();

export const FuelTankState = $root.FuelTankState = (() => {

    /**
     * Properties of a FuelTankState.
     * @exports IFuelTankState
     * @interface IFuelTankState
     * @property {number|null} [capacity] FuelTankState capacity
     * @property {number|null} [curiosityStored] FuelTankState curiosityStored
     * @property {number|null} [integrityStored] FuelTankState integrityStored
     * @property {number|null} [kindnessStored] FuelTankState kindnessStored
     * @property {number|null} [humilityStored] FuelTankState humilityStored
     * @property {number|null} [resilienceStored] FuelTankState resilienceStored
     */

    /**
     * Constructs a new FuelTankState.
     * @exports FuelTankState
     * @classdesc Represents a FuelTankState.
     * @implements IFuelTankState
     * @constructor
     * @param {IFuelTankState=} [properties] Properties to set
     */
    function FuelTankState(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * FuelTankState capacity.
     * @member {number} capacity
     * @memberof FuelTankState
     * @instance
     */
    FuelTankState.prototype.capacity = 0;

    /**
     * FuelTankState curiosityStored.
     * @member {number} curiosityStored
     * @memberof FuelTankState
     * @instance
     */
    FuelTankState.prototype.curiosityStored = 0;

    /**
     * FuelTankState integrityStored.
     * @member {number} integrityStored
     * @memberof FuelTankState
     * @instance
     */
    FuelTankState.prototype.integrityStored = 0;

    /**
     * FuelTankState kindnessStored.
     * @member {number} kindnessStored
     * @memberof FuelTankState
     * @instance
     */
    FuelTankState.prototype.kindnessStored = 0;

    /**
     * FuelTankState humilityStored.
     * @member {number} humilityStored
     * @memberof FuelTankState
     * @instance
     */
    FuelTankState.prototype.humilityStored = 0;

    /**
     * FuelTankState resilienceStored.
     * @member {number} resilienceStored
     * @memberof FuelTankState
     * @instance
     */
    FuelTankState.prototype.resilienceStored = 0;

    /**
     * Creates a new FuelTankState instance using the specified properties.
     * @function create
     * @memberof FuelTankState
     * @static
     * @param {IFuelTankState=} [properties] Properties to set
     * @returns {FuelTankState} FuelTankState instance
     */
    FuelTankState.create = function create(properties) {
        return new FuelTankState(properties);
    };

    /**
     * Encodes the specified FuelTankState message. Does not implicitly {@link FuelTankState.verify|verify} messages.
     * @function encode
     * @memberof FuelTankState
     * @static
     * @param {IFuelTankState} message FuelTankState message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FuelTankState.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.capacity != null && Object.hasOwnProperty.call(message, "capacity"))
            writer.uint32(/* id 1, wireType 1 =*/9).double(message.capacity);
        if (message.curiosityStored != null && Object.hasOwnProperty.call(message, "curiosityStored"))
            writer.uint32(/* id 10, wireType 1 =*/81).double(message.curiosityStored);
        if (message.integrityStored != null && Object.hasOwnProperty.call(message, "integrityStored"))
            writer.uint32(/* id 11, wireType 1 =*/89).double(message.integrityStored);
        if (message.kindnessStored != null && Object.hasOwnProperty.call(message, "kindnessStored"))
            writer.uint32(/* id 12, wireType 1 =*/97).double(message.kindnessStored);
        if (message.humilityStored != null && Object.hasOwnProperty.call(message, "humilityStored"))
            writer.uint32(/* id 13, wireType 1 =*/105).double(message.humilityStored);
        if (message.resilienceStored != null && Object.hasOwnProperty.call(message, "resilienceStored"))
            writer.uint32(/* id 14, wireType 1 =*/113).double(message.resilienceStored);
        return writer;
    };

    /**
     * Encodes the specified FuelTankState message, length delimited. Does not implicitly {@link FuelTankState.verify|verify} messages.
     * @function encodeDelimited
     * @memberof FuelTankState
     * @static
     * @param {IFuelTankState} message FuelTankState message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FuelTankState.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FuelTankState message from the specified reader or buffer.
     * @function decode
     * @memberof FuelTankState
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {FuelTankState} FuelTankState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FuelTankState.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.FuelTankState();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.capacity = reader.double();
                    break;
                }
            case 10: {
                    message.curiosityStored = reader.double();
                    break;
                }
            case 11: {
                    message.integrityStored = reader.double();
                    break;
                }
            case 12: {
                    message.kindnessStored = reader.double();
                    break;
                }
            case 13: {
                    message.humilityStored = reader.double();
                    break;
                }
            case 14: {
                    message.resilienceStored = reader.double();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a FuelTankState message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof FuelTankState
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {FuelTankState} FuelTankState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FuelTankState.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FuelTankState message.
     * @function verify
     * @memberof FuelTankState
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FuelTankState.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.capacity != null && message.hasOwnProperty("capacity"))
            if (typeof message.capacity !== "number")
                return "capacity: number expected";
        if (message.curiosityStored != null && message.hasOwnProperty("curiosityStored"))
            if (typeof message.curiosityStored !== "number")
                return "curiosityStored: number expected";
        if (message.integrityStored != null && message.hasOwnProperty("integrityStored"))
            if (typeof message.integrityStored !== "number")
                return "integrityStored: number expected";
        if (message.kindnessStored != null && message.hasOwnProperty("kindnessStored"))
            if (typeof message.kindnessStored !== "number")
                return "kindnessStored: number expected";
        if (message.humilityStored != null && message.hasOwnProperty("humilityStored"))
            if (typeof message.humilityStored !== "number")
                return "humilityStored: number expected";
        if (message.resilienceStored != null && message.hasOwnProperty("resilienceStored"))
            if (typeof message.resilienceStored !== "number")
                return "resilienceStored: number expected";
        return null;
    };

    /**
     * Creates a FuelTankState message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof FuelTankState
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {FuelTankState} FuelTankState
     */
    FuelTankState.fromObject = function fromObject(object) {
        if (object instanceof $root.FuelTankState)
            return object;
        let message = new $root.FuelTankState();
        if (object.capacity != null)
            message.capacity = Number(object.capacity);
        if (object.curiosityStored != null)
            message.curiosityStored = Number(object.curiosityStored);
        if (object.integrityStored != null)
            message.integrityStored = Number(object.integrityStored);
        if (object.kindnessStored != null)
            message.kindnessStored = Number(object.kindnessStored);
        if (object.humilityStored != null)
            message.humilityStored = Number(object.humilityStored);
        if (object.resilienceStored != null)
            message.resilienceStored = Number(object.resilienceStored);
        return message;
    };

    /**
     * Creates a plain object from a FuelTankState message. Also converts values to other types if specified.
     * @function toObject
     * @memberof FuelTankState
     * @static
     * @param {FuelTankState} message FuelTankState
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FuelTankState.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.capacity = 0;
            object.curiosityStored = 0;
            object.integrityStored = 0;
            object.kindnessStored = 0;
            object.humilityStored = 0;
            object.resilienceStored = 0;
        }
        if (message.capacity != null && message.hasOwnProperty("capacity"))
            object.capacity = options.json && !isFinite(message.capacity) ? String(message.capacity) : message.capacity;
        if (message.curiosityStored != null && message.hasOwnProperty("curiosityStored"))
            object.curiosityStored = options.json && !isFinite(message.curiosityStored) ? String(message.curiosityStored) : message.curiosityStored;
        if (message.integrityStored != null && message.hasOwnProperty("integrityStored"))
            object.integrityStored = options.json && !isFinite(message.integrityStored) ? String(message.integrityStored) : message.integrityStored;
        if (message.kindnessStored != null && message.hasOwnProperty("kindnessStored"))
            object.kindnessStored = options.json && !isFinite(message.kindnessStored) ? String(message.kindnessStored) : message.kindnessStored;
        if (message.humilityStored != null && message.hasOwnProperty("humilityStored"))
            object.humilityStored = options.json && !isFinite(message.humilityStored) ? String(message.humilityStored) : message.humilityStored;
        if (message.resilienceStored != null && message.hasOwnProperty("resilienceStored"))
            object.resilienceStored = options.json && !isFinite(message.resilienceStored) ? String(message.resilienceStored) : message.resilienceStored;
        return object;
    };

    /**
     * Converts this FuelTankState to JSON.
     * @function toJSON
     * @memberof FuelTankState
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FuelTankState.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FuelTankState
     * @function getTypeUrl
     * @memberof FuelTankState
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FuelTankState.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/FuelTankState";
    };

    return FuelTankState;
})();

export const AscensionPlan = $root.AscensionPlan = (() => {

    /**
     * Properties of an AscensionPlan.
     * @exports IAscensionPlan
     * @interface IAscensionPlan
     * @property {IInitialState|null} [initialState] AscensionPlan initialState
     * @property {Array.<IAscensionStep>|null} [steps] AscensionPlan steps
     */

    /**
     * Constructs a new AscensionPlan.
     * @exports AscensionPlan
     * @classdesc Represents an AscensionPlan.
     * @implements IAscensionPlan
     * @constructor
     * @param {IAscensionPlan=} [properties] Properties to set
     */
    function AscensionPlan(properties) {
        this.steps = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * AscensionPlan initialState.
     * @member {IInitialState|null|undefined} initialState
     * @memberof AscensionPlan
     * @instance
     */
    AscensionPlan.prototype.initialState = null;

    /**
     * AscensionPlan steps.
     * @member {Array.<IAscensionStep>} steps
     * @memberof AscensionPlan
     * @instance
     */
    AscensionPlan.prototype.steps = $util.emptyArray;

    /**
     * Creates a new AscensionPlan instance using the specified properties.
     * @function create
     * @memberof AscensionPlan
     * @static
     * @param {IAscensionPlan=} [properties] Properties to set
     * @returns {AscensionPlan} AscensionPlan instance
     */
    AscensionPlan.create = function create(properties) {
        return new AscensionPlan(properties);
    };

    /**
     * Encodes the specified AscensionPlan message. Does not implicitly {@link AscensionPlan.verify|verify} messages.
     * @function encode
     * @memberof AscensionPlan
     * @static
     * @param {IAscensionPlan} message AscensionPlan message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AscensionPlan.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.initialState != null && Object.hasOwnProperty.call(message, "initialState"))
            $root.InitialState.encode(message.initialState, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        if (message.steps != null && message.steps.length)
            for (let i = 0; i < message.steps.length; ++i)
                $root.AscensionStep.encode(message.steps[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified AscensionPlan message, length delimited. Does not implicitly {@link AscensionPlan.verify|verify} messages.
     * @function encodeDelimited
     * @memberof AscensionPlan
     * @static
     * @param {IAscensionPlan} message AscensionPlan message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AscensionPlan.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an AscensionPlan message from the specified reader or buffer.
     * @function decode
     * @memberof AscensionPlan
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {AscensionPlan} AscensionPlan
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AscensionPlan.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.AscensionPlan();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.initialState = $root.InitialState.decode(reader, reader.uint32());
                    break;
                }
            case 2: {
                    if (!(message.steps && message.steps.length))
                        message.steps = [];
                    message.steps.push($root.AscensionStep.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an AscensionPlan message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof AscensionPlan
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {AscensionPlan} AscensionPlan
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AscensionPlan.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an AscensionPlan message.
     * @function verify
     * @memberof AscensionPlan
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    AscensionPlan.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.initialState != null && message.hasOwnProperty("initialState")) {
            let error = $root.InitialState.verify(message.initialState);
            if (error)
                return "initialState." + error;
        }
        if (message.steps != null && message.hasOwnProperty("steps")) {
            if (!Array.isArray(message.steps))
                return "steps: array expected";
            for (let i = 0; i < message.steps.length; ++i) {
                let error = $root.AscensionStep.verify(message.steps[i]);
                if (error)
                    return "steps." + error;
            }
        }
        return null;
    };

    /**
     * Creates an AscensionPlan message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof AscensionPlan
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {AscensionPlan} AscensionPlan
     */
    AscensionPlan.fromObject = function fromObject(object) {
        if (object instanceof $root.AscensionPlan)
            return object;
        let message = new $root.AscensionPlan();
        if (object.initialState != null) {
            if (typeof object.initialState !== "object")
                throw TypeError(".AscensionPlan.initialState: object expected");
            message.initialState = $root.InitialState.fromObject(object.initialState);
        }
        if (object.steps) {
            if (!Array.isArray(object.steps))
                throw TypeError(".AscensionPlan.steps: array expected");
            message.steps = [];
            for (let i = 0; i < object.steps.length; ++i) {
                if (typeof object.steps[i] !== "object")
                    throw TypeError(".AscensionPlan.steps: object expected");
                message.steps[i] = $root.AscensionStep.fromObject(object.steps[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from an AscensionPlan message. Also converts values to other types if specified.
     * @function toObject
     * @memberof AscensionPlan
     * @static
     * @param {AscensionPlan} message AscensionPlan
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    AscensionPlan.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.steps = [];
        if (options.defaults)
            object.initialState = null;
        if (message.initialState != null && message.hasOwnProperty("initialState"))
            object.initialState = $root.InitialState.toObject(message.initialState, options);
        if (message.steps && message.steps.length) {
            object.steps = [];
            for (let j = 0; j < message.steps.length; ++j)
                object.steps[j] = $root.AscensionStep.toObject(message.steps[j], options);
        }
        return object;
    };

    /**
     * Converts this AscensionPlan to JSON.
     * @function toJSON
     * @memberof AscensionPlan
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    AscensionPlan.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for AscensionPlan
     * @function getTypeUrl
     * @memberof AscensionPlan
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    AscensionPlan.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/AscensionPlan";
    };

    return AscensionPlan;
})();

export const InitialState = $root.InitialState = (() => {

    /**
     * Properties of an InitialState.
     * @exports IInitialState
     * @interface IInitialState
     * @property {number|null} [soulEggs] InitialState soulEggs
     * @property {string|null} [soulEggsInput] InitialState soulEggsInput
     * @property {number|null} [truthEggs] InitialState truthEggs
     * @property {number|null} [shiftsUsed] InitialState shiftsUsed
     * @property {number|null} [curiosityLaid] InitialState curiosityLaid
     * @property {number|null} [integrityLaid] InitialState integrityLaid
     * @property {number|null} [kindnessLaid] InitialState kindnessLaid
     * @property {number|null} [humilityLaid] InitialState humilityLaid
     * @property {number|null} [resilienceLaid] InitialState resilienceLaid
     * @property {IFuelTankState|null} [fuelTank] InitialState fuelTank
     * @property {number|null} [startTimestamp] InitialState startTimestamp
     * @property {Array.<IArtifact>|null} [earningsArtifacts] InitialState earningsArtifacts
     */

    /**
     * Constructs a new InitialState.
     * @exports InitialState
     * @classdesc Represents an InitialState.
     * @implements IInitialState
     * @constructor
     * @param {IInitialState=} [properties] Properties to set
     */
    function InitialState(properties) {
        this.earningsArtifacts = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * InitialState soulEggs.
     * @member {number} soulEggs
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.soulEggs = 0;

    /**
     * InitialState soulEggsInput.
     * @member {string} soulEggsInput
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.soulEggsInput = "";

    /**
     * InitialState truthEggs.
     * @member {number} truthEggs
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.truthEggs = 0;

    /**
     * InitialState shiftsUsed.
     * @member {number} shiftsUsed
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.shiftsUsed = 0;

    /**
     * InitialState curiosityLaid.
     * @member {number} curiosityLaid
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.curiosityLaid = 0;

    /**
     * InitialState integrityLaid.
     * @member {number} integrityLaid
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.integrityLaid = 0;

    /**
     * InitialState kindnessLaid.
     * @member {number} kindnessLaid
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.kindnessLaid = 0;

    /**
     * InitialState humilityLaid.
     * @member {number} humilityLaid
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.humilityLaid = 0;

    /**
     * InitialState resilienceLaid.
     * @member {number} resilienceLaid
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.resilienceLaid = 0;

    /**
     * InitialState fuelTank.
     * @member {IFuelTankState|null|undefined} fuelTank
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.fuelTank = null;

    /**
     * InitialState startTimestamp.
     * @member {number} startTimestamp
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.startTimestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

    /**
     * InitialState earningsArtifacts.
     * @member {Array.<IArtifact>} earningsArtifacts
     * @memberof InitialState
     * @instance
     */
    InitialState.prototype.earningsArtifacts = $util.emptyArray;

    /**
     * Creates a new InitialState instance using the specified properties.
     * @function create
     * @memberof InitialState
     * @static
     * @param {IInitialState=} [properties] Properties to set
     * @returns {InitialState} InitialState instance
     */
    InitialState.create = function create(properties) {
        return new InitialState(properties);
    };

    /**
     * Encodes the specified InitialState message. Does not implicitly {@link InitialState.verify|verify} messages.
     * @function encode
     * @memberof InitialState
     * @static
     * @param {IInitialState} message InitialState message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    InitialState.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.soulEggs != null && Object.hasOwnProperty.call(message, "soulEggs"))
            writer.uint32(/* id 1, wireType 1 =*/9).double(message.soulEggs);
        if (message.soulEggsInput != null && Object.hasOwnProperty.call(message, "soulEggsInput"))
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.soulEggsInput);
        if (message.truthEggs != null && Object.hasOwnProperty.call(message, "truthEggs"))
            writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.truthEggs);
        if (message.shiftsUsed != null && Object.hasOwnProperty.call(message, "shiftsUsed"))
            writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.shiftsUsed);
        if (message.curiosityLaid != null && Object.hasOwnProperty.call(message, "curiosityLaid"))
            writer.uint32(/* id 10, wireType 1 =*/81).double(message.curiosityLaid);
        if (message.integrityLaid != null && Object.hasOwnProperty.call(message, "integrityLaid"))
            writer.uint32(/* id 11, wireType 1 =*/89).double(message.integrityLaid);
        if (message.kindnessLaid != null && Object.hasOwnProperty.call(message, "kindnessLaid"))
            writer.uint32(/* id 12, wireType 1 =*/97).double(message.kindnessLaid);
        if (message.humilityLaid != null && Object.hasOwnProperty.call(message, "humilityLaid"))
            writer.uint32(/* id 13, wireType 1 =*/105).double(message.humilityLaid);
        if (message.resilienceLaid != null && Object.hasOwnProperty.call(message, "resilienceLaid"))
            writer.uint32(/* id 14, wireType 1 =*/113).double(message.resilienceLaid);
        if (message.fuelTank != null && Object.hasOwnProperty.call(message, "fuelTank"))
            $root.FuelTankState.encode(message.fuelTank, writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
        if (message.startTimestamp != null && Object.hasOwnProperty.call(message, "startTimestamp"))
            writer.uint32(/* id 30, wireType 0 =*/240).int64(message.startTimestamp);
        if (message.earningsArtifacts != null && message.earningsArtifacts.length)
            for (let i = 0; i < message.earningsArtifacts.length; ++i)
                $root.Artifact.encode(message.earningsArtifacts[i], writer.uint32(/* id 40, wireType 2 =*/322).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified InitialState message, length delimited. Does not implicitly {@link InitialState.verify|verify} messages.
     * @function encodeDelimited
     * @memberof InitialState
     * @static
     * @param {IInitialState} message InitialState message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    InitialState.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an InitialState message from the specified reader or buffer.
     * @function decode
     * @memberof InitialState
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {InitialState} InitialState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    InitialState.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.InitialState();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.soulEggs = reader.double();
                    break;
                }
            case 2: {
                    message.soulEggsInput = reader.string();
                    break;
                }
            case 3: {
                    message.truthEggs = reader.uint32();
                    break;
                }
            case 4: {
                    message.shiftsUsed = reader.uint32();
                    break;
                }
            case 10: {
                    message.curiosityLaid = reader.double();
                    break;
                }
            case 11: {
                    message.integrityLaid = reader.double();
                    break;
                }
            case 12: {
                    message.kindnessLaid = reader.double();
                    break;
                }
            case 13: {
                    message.humilityLaid = reader.double();
                    break;
                }
            case 14: {
                    message.resilienceLaid = reader.double();
                    break;
                }
            case 20: {
                    message.fuelTank = $root.FuelTankState.decode(reader, reader.uint32());
                    break;
                }
            case 30: {
                    message.startTimestamp = reader.int64();
                    break;
                }
            case 40: {
                    if (!(message.earningsArtifacts && message.earningsArtifacts.length))
                        message.earningsArtifacts = [];
                    message.earningsArtifacts.push($root.Artifact.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an InitialState message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof InitialState
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {InitialState} InitialState
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    InitialState.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an InitialState message.
     * @function verify
     * @memberof InitialState
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    InitialState.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.soulEggs != null && message.hasOwnProperty("soulEggs"))
            if (typeof message.soulEggs !== "number")
                return "soulEggs: number expected";
        if (message.soulEggsInput != null && message.hasOwnProperty("soulEggsInput"))
            if (!$util.isString(message.soulEggsInput))
                return "soulEggsInput: string expected";
        if (message.truthEggs != null && message.hasOwnProperty("truthEggs"))
            if (!$util.isInteger(message.truthEggs))
                return "truthEggs: integer expected";
        if (message.shiftsUsed != null && message.hasOwnProperty("shiftsUsed"))
            if (!$util.isInteger(message.shiftsUsed))
                return "shiftsUsed: integer expected";
        if (message.curiosityLaid != null && message.hasOwnProperty("curiosityLaid"))
            if (typeof message.curiosityLaid !== "number")
                return "curiosityLaid: number expected";
        if (message.integrityLaid != null && message.hasOwnProperty("integrityLaid"))
            if (typeof message.integrityLaid !== "number")
                return "integrityLaid: number expected";
        if (message.kindnessLaid != null && message.hasOwnProperty("kindnessLaid"))
            if (typeof message.kindnessLaid !== "number")
                return "kindnessLaid: number expected";
        if (message.humilityLaid != null && message.hasOwnProperty("humilityLaid"))
            if (typeof message.humilityLaid !== "number")
                return "humilityLaid: number expected";
        if (message.resilienceLaid != null && message.hasOwnProperty("resilienceLaid"))
            if (typeof message.resilienceLaid !== "number")
                return "resilienceLaid: number expected";
        if (message.fuelTank != null && message.hasOwnProperty("fuelTank")) {
            let error = $root.FuelTankState.verify(message.fuelTank);
            if (error)
                return "fuelTank." + error;
        }
        if (message.startTimestamp != null && message.hasOwnProperty("startTimestamp"))
            if (!$util.isInteger(message.startTimestamp) && !(message.startTimestamp && $util.isInteger(message.startTimestamp.low) && $util.isInteger(message.startTimestamp.high)))
                return "startTimestamp: integer|Long expected";
        if (message.earningsArtifacts != null && message.hasOwnProperty("earningsArtifacts")) {
            if (!Array.isArray(message.earningsArtifacts))
                return "earningsArtifacts: array expected";
            for (let i = 0; i < message.earningsArtifacts.length; ++i) {
                let error = $root.Artifact.verify(message.earningsArtifacts[i]);
                if (error)
                    return "earningsArtifacts." + error;
            }
        }
        return null;
    };

    /**
     * Creates an InitialState message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof InitialState
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {InitialState} InitialState
     */
    InitialState.fromObject = function fromObject(object) {
        if (object instanceof $root.InitialState)
            return object;
        let message = new $root.InitialState();
        if (object.soulEggs != null)
            message.soulEggs = Number(object.soulEggs);
        if (object.soulEggsInput != null)
            message.soulEggsInput = String(object.soulEggsInput);
        if (object.truthEggs != null)
            message.truthEggs = object.truthEggs >>> 0;
        if (object.shiftsUsed != null)
            message.shiftsUsed = object.shiftsUsed >>> 0;
        if (object.curiosityLaid != null)
            message.curiosityLaid = Number(object.curiosityLaid);
        if (object.integrityLaid != null)
            message.integrityLaid = Number(object.integrityLaid);
        if (object.kindnessLaid != null)
            message.kindnessLaid = Number(object.kindnessLaid);
        if (object.humilityLaid != null)
            message.humilityLaid = Number(object.humilityLaid);
        if (object.resilienceLaid != null)
            message.resilienceLaid = Number(object.resilienceLaid);
        if (object.fuelTank != null) {
            if (typeof object.fuelTank !== "object")
                throw TypeError(".InitialState.fuelTank: object expected");
            message.fuelTank = $root.FuelTankState.fromObject(object.fuelTank);
        }
        if (object.startTimestamp != null)
            if ($util.Long)
                (message.startTimestamp = $util.Long.fromValue(object.startTimestamp)).unsigned = false;
            else if (typeof object.startTimestamp === "string")
                message.startTimestamp = parseInt(object.startTimestamp, 10);
            else if (typeof object.startTimestamp === "number")
                message.startTimestamp = object.startTimestamp;
            else if (typeof object.startTimestamp === "object")
                message.startTimestamp = new $util.LongBits(object.startTimestamp.low >>> 0, object.startTimestamp.high >>> 0).toNumber();
        if (object.earningsArtifacts) {
            if (!Array.isArray(object.earningsArtifacts))
                throw TypeError(".InitialState.earningsArtifacts: array expected");
            message.earningsArtifacts = [];
            for (let i = 0; i < object.earningsArtifacts.length; ++i) {
                if (typeof object.earningsArtifacts[i] !== "object")
                    throw TypeError(".InitialState.earningsArtifacts: object expected");
                message.earningsArtifacts[i] = $root.Artifact.fromObject(object.earningsArtifacts[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from an InitialState message. Also converts values to other types if specified.
     * @function toObject
     * @memberof InitialState
     * @static
     * @param {InitialState} message InitialState
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    InitialState.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.earningsArtifacts = [];
        if (options.defaults) {
            object.soulEggs = 0;
            object.soulEggsInput = "";
            object.truthEggs = 0;
            object.shiftsUsed = 0;
            object.curiosityLaid = 0;
            object.integrityLaid = 0;
            object.kindnessLaid = 0;
            object.humilityLaid = 0;
            object.resilienceLaid = 0;
            object.fuelTank = null;
            if ($util.Long) {
                let long = new $util.Long(0, 0, false);
                object.startTimestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
            } else
                object.startTimestamp = options.longs === String ? "0" : 0;
        }
        if (message.soulEggs != null && message.hasOwnProperty("soulEggs"))
            object.soulEggs = options.json && !isFinite(message.soulEggs) ? String(message.soulEggs) : message.soulEggs;
        if (message.soulEggsInput != null && message.hasOwnProperty("soulEggsInput"))
            object.soulEggsInput = message.soulEggsInput;
        if (message.truthEggs != null && message.hasOwnProperty("truthEggs"))
            object.truthEggs = message.truthEggs;
        if (message.shiftsUsed != null && message.hasOwnProperty("shiftsUsed"))
            object.shiftsUsed = message.shiftsUsed;
        if (message.curiosityLaid != null && message.hasOwnProperty("curiosityLaid"))
            object.curiosityLaid = options.json && !isFinite(message.curiosityLaid) ? String(message.curiosityLaid) : message.curiosityLaid;
        if (message.integrityLaid != null && message.hasOwnProperty("integrityLaid"))
            object.integrityLaid = options.json && !isFinite(message.integrityLaid) ? String(message.integrityLaid) : message.integrityLaid;
        if (message.kindnessLaid != null && message.hasOwnProperty("kindnessLaid"))
            object.kindnessLaid = options.json && !isFinite(message.kindnessLaid) ? String(message.kindnessLaid) : message.kindnessLaid;
        if (message.humilityLaid != null && message.hasOwnProperty("humilityLaid"))
            object.humilityLaid = options.json && !isFinite(message.humilityLaid) ? String(message.humilityLaid) : message.humilityLaid;
        if (message.resilienceLaid != null && message.hasOwnProperty("resilienceLaid"))
            object.resilienceLaid = options.json && !isFinite(message.resilienceLaid) ? String(message.resilienceLaid) : message.resilienceLaid;
        if (message.fuelTank != null && message.hasOwnProperty("fuelTank"))
            object.fuelTank = $root.FuelTankState.toObject(message.fuelTank, options);
        if (message.startTimestamp != null && message.hasOwnProperty("startTimestamp"))
            if (typeof message.startTimestamp === "number")
                object.startTimestamp = options.longs === String ? String(message.startTimestamp) : message.startTimestamp;
            else
                object.startTimestamp = options.longs === String ? $util.Long.prototype.toString.call(message.startTimestamp) : options.longs === Number ? new $util.LongBits(message.startTimestamp.low >>> 0, message.startTimestamp.high >>> 0).toNumber() : message.startTimestamp;
        if (message.earningsArtifacts && message.earningsArtifacts.length) {
            object.earningsArtifacts = [];
            for (let j = 0; j < message.earningsArtifacts.length; ++j)
                object.earningsArtifacts[j] = $root.Artifact.toObject(message.earningsArtifacts[j], options);
        }
        return object;
    };

    /**
     * Converts this InitialState to JSON.
     * @function toJSON
     * @memberof InitialState
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    InitialState.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for InitialState
     * @function getTypeUrl
     * @memberof InitialState
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    InitialState.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/InitialState";
    };

    return InitialState;
})();

export const AscensionStep = $root.AscensionStep = (() => {

    /**
     * Properties of an AscensionStep.
     * @exports IAscensionStep
     * @interface IAscensionStep
     * @property {string|null} [id] AscensionStep id
     * @property {VirtueEgg|null} [eggType] AscensionStep eggType
     * @property {boolean|null} [expanded] AscensionStep expanded
     * @property {IStepPurchases|null} [purchases] AscensionStep purchases
     * @property {Array.<IFuelTankAction>|null} [fuelActions] AscensionStep fuelActions
     * @property {number|null} [durationSeconds] AscensionStep durationSeconds
     * @property {Array.<IArtifact>|null} [artifacts] AscensionStep artifacts
     */

    /**
     * Constructs a new AscensionStep.
     * @exports AscensionStep
     * @classdesc Represents an AscensionStep.
     * @implements IAscensionStep
     * @constructor
     * @param {IAscensionStep=} [properties] Properties to set
     */
    function AscensionStep(properties) {
        this.fuelActions = [];
        this.artifacts = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * AscensionStep id.
     * @member {string} id
     * @memberof AscensionStep
     * @instance
     */
    AscensionStep.prototype.id = "";

    /**
     * AscensionStep eggType.
     * @member {VirtueEgg} eggType
     * @memberof AscensionStep
     * @instance
     */
    AscensionStep.prototype.eggType = 0;

    /**
     * AscensionStep expanded.
     * @member {boolean} expanded
     * @memberof AscensionStep
     * @instance
     */
    AscensionStep.prototype.expanded = false;

    /**
     * AscensionStep purchases.
     * @member {IStepPurchases|null|undefined} purchases
     * @memberof AscensionStep
     * @instance
     */
    AscensionStep.prototype.purchases = null;

    /**
     * AscensionStep fuelActions.
     * @member {Array.<IFuelTankAction>} fuelActions
     * @memberof AscensionStep
     * @instance
     */
    AscensionStep.prototype.fuelActions = $util.emptyArray;

    /**
     * AscensionStep durationSeconds.
     * @member {number} durationSeconds
     * @memberof AscensionStep
     * @instance
     */
    AscensionStep.prototype.durationSeconds = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

    /**
     * AscensionStep artifacts.
     * @member {Array.<IArtifact>} artifacts
     * @memberof AscensionStep
     * @instance
     */
    AscensionStep.prototype.artifacts = $util.emptyArray;

    /**
     * Creates a new AscensionStep instance using the specified properties.
     * @function create
     * @memberof AscensionStep
     * @static
     * @param {IAscensionStep=} [properties] Properties to set
     * @returns {AscensionStep} AscensionStep instance
     */
    AscensionStep.create = function create(properties) {
        return new AscensionStep(properties);
    };

    /**
     * Encodes the specified AscensionStep message. Does not implicitly {@link AscensionStep.verify|verify} messages.
     * @function encode
     * @memberof AscensionStep
     * @static
     * @param {IAscensionStep} message AscensionStep message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AscensionStep.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.id != null && Object.hasOwnProperty.call(message, "id"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
        if (message.eggType != null && Object.hasOwnProperty.call(message, "eggType"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.eggType);
        if (message.expanded != null && Object.hasOwnProperty.call(message, "expanded"))
            writer.uint32(/* id 3, wireType 0 =*/24).bool(message.expanded);
        if (message.purchases != null && Object.hasOwnProperty.call(message, "purchases"))
            $root.StepPurchases.encode(message.purchases, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
        if (message.fuelActions != null && message.fuelActions.length)
            for (let i = 0; i < message.fuelActions.length; ++i)
                $root.FuelTankAction.encode(message.fuelActions[i], writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
        if (message.durationSeconds != null && Object.hasOwnProperty.call(message, "durationSeconds"))
            writer.uint32(/* id 30, wireType 0 =*/240).int64(message.durationSeconds);
        if (message.artifacts != null && message.artifacts.length)
            for (let i = 0; i < message.artifacts.length; ++i)
                $root.Artifact.encode(message.artifacts[i], writer.uint32(/* id 40, wireType 2 =*/322).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified AscensionStep message, length delimited. Does not implicitly {@link AscensionStep.verify|verify} messages.
     * @function encodeDelimited
     * @memberof AscensionStep
     * @static
     * @param {IAscensionStep} message AscensionStep message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    AscensionStep.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an AscensionStep message from the specified reader or buffer.
     * @function decode
     * @memberof AscensionStep
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {AscensionStep} AscensionStep
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AscensionStep.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.AscensionStep();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.id = reader.string();
                    break;
                }
            case 2: {
                    message.eggType = reader.int32();
                    break;
                }
            case 3: {
                    message.expanded = reader.bool();
                    break;
                }
            case 10: {
                    message.purchases = $root.StepPurchases.decode(reader, reader.uint32());
                    break;
                }
            case 20: {
                    if (!(message.fuelActions && message.fuelActions.length))
                        message.fuelActions = [];
                    message.fuelActions.push($root.FuelTankAction.decode(reader, reader.uint32()));
                    break;
                }
            case 30: {
                    message.durationSeconds = reader.int64();
                    break;
                }
            case 40: {
                    if (!(message.artifacts && message.artifacts.length))
                        message.artifacts = [];
                    message.artifacts.push($root.Artifact.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an AscensionStep message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof AscensionStep
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {AscensionStep} AscensionStep
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    AscensionStep.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an AscensionStep message.
     * @function verify
     * @memberof AscensionStep
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    AscensionStep.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.id != null && message.hasOwnProperty("id"))
            if (!$util.isString(message.id))
                return "id: string expected";
        if (message.eggType != null && message.hasOwnProperty("eggType"))
            switch (message.eggType) {
            default:
                return "eggType: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                break;
            }
        if (message.expanded != null && message.hasOwnProperty("expanded"))
            if (typeof message.expanded !== "boolean")
                return "expanded: boolean expected";
        if (message.purchases != null && message.hasOwnProperty("purchases")) {
            let error = $root.StepPurchases.verify(message.purchases);
            if (error)
                return "purchases." + error;
        }
        if (message.fuelActions != null && message.hasOwnProperty("fuelActions")) {
            if (!Array.isArray(message.fuelActions))
                return "fuelActions: array expected";
            for (let i = 0; i < message.fuelActions.length; ++i) {
                let error = $root.FuelTankAction.verify(message.fuelActions[i]);
                if (error)
                    return "fuelActions." + error;
            }
        }
        if (message.durationSeconds != null && message.hasOwnProperty("durationSeconds"))
            if (!$util.isInteger(message.durationSeconds) && !(message.durationSeconds && $util.isInteger(message.durationSeconds.low) && $util.isInteger(message.durationSeconds.high)))
                return "durationSeconds: integer|Long expected";
        if (message.artifacts != null && message.hasOwnProperty("artifacts")) {
            if (!Array.isArray(message.artifacts))
                return "artifacts: array expected";
            for (let i = 0; i < message.artifacts.length; ++i) {
                let error = $root.Artifact.verify(message.artifacts[i]);
                if (error)
                    return "artifacts." + error;
            }
        }
        return null;
    };

    /**
     * Creates an AscensionStep message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof AscensionStep
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {AscensionStep} AscensionStep
     */
    AscensionStep.fromObject = function fromObject(object) {
        if (object instanceof $root.AscensionStep)
            return object;
        let message = new $root.AscensionStep();
        if (object.id != null)
            message.id = String(object.id);
        switch (object.eggType) {
        default:
            if (typeof object.eggType === "number") {
                message.eggType = object.eggType;
                break;
            }
            break;
        case "VIRTUE_EGG_UNKNOWN":
        case 0:
            message.eggType = 0;
            break;
        case "CURIOSITY":
        case 1:
            message.eggType = 1;
            break;
        case "INTEGRITY":
        case 2:
            message.eggType = 2;
            break;
        case "KINDNESS":
        case 3:
            message.eggType = 3;
            break;
        case "HUMILITY":
        case 4:
            message.eggType = 4;
            break;
        case "RESILIENCE":
        case 5:
            message.eggType = 5;
            break;
        }
        if (object.expanded != null)
            message.expanded = Boolean(object.expanded);
        if (object.purchases != null) {
            if (typeof object.purchases !== "object")
                throw TypeError(".AscensionStep.purchases: object expected");
            message.purchases = $root.StepPurchases.fromObject(object.purchases);
        }
        if (object.fuelActions) {
            if (!Array.isArray(object.fuelActions))
                throw TypeError(".AscensionStep.fuelActions: array expected");
            message.fuelActions = [];
            for (let i = 0; i < object.fuelActions.length; ++i) {
                if (typeof object.fuelActions[i] !== "object")
                    throw TypeError(".AscensionStep.fuelActions: object expected");
                message.fuelActions[i] = $root.FuelTankAction.fromObject(object.fuelActions[i]);
            }
        }
        if (object.durationSeconds != null)
            if ($util.Long)
                (message.durationSeconds = $util.Long.fromValue(object.durationSeconds)).unsigned = false;
            else if (typeof object.durationSeconds === "string")
                message.durationSeconds = parseInt(object.durationSeconds, 10);
            else if (typeof object.durationSeconds === "number")
                message.durationSeconds = object.durationSeconds;
            else if (typeof object.durationSeconds === "object")
                message.durationSeconds = new $util.LongBits(object.durationSeconds.low >>> 0, object.durationSeconds.high >>> 0).toNumber();
        if (object.artifacts) {
            if (!Array.isArray(object.artifacts))
                throw TypeError(".AscensionStep.artifacts: array expected");
            message.artifacts = [];
            for (let i = 0; i < object.artifacts.length; ++i) {
                if (typeof object.artifacts[i] !== "object")
                    throw TypeError(".AscensionStep.artifacts: object expected");
                message.artifacts[i] = $root.Artifact.fromObject(object.artifacts[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from an AscensionStep message. Also converts values to other types if specified.
     * @function toObject
     * @memberof AscensionStep
     * @static
     * @param {AscensionStep} message AscensionStep
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    AscensionStep.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.fuelActions = [];
            object.artifacts = [];
        }
        if (options.defaults) {
            object.id = "";
            object.eggType = options.enums === String ? "VIRTUE_EGG_UNKNOWN" : 0;
            object.expanded = false;
            object.purchases = null;
            if ($util.Long) {
                let long = new $util.Long(0, 0, false);
                object.durationSeconds = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
            } else
                object.durationSeconds = options.longs === String ? "0" : 0;
        }
        if (message.id != null && message.hasOwnProperty("id"))
            object.id = message.id;
        if (message.eggType != null && message.hasOwnProperty("eggType"))
            object.eggType = options.enums === String ? $root.VirtueEgg[message.eggType] === undefined ? message.eggType : $root.VirtueEgg[message.eggType] : message.eggType;
        if (message.expanded != null && message.hasOwnProperty("expanded"))
            object.expanded = message.expanded;
        if (message.purchases != null && message.hasOwnProperty("purchases"))
            object.purchases = $root.StepPurchases.toObject(message.purchases, options);
        if (message.fuelActions && message.fuelActions.length) {
            object.fuelActions = [];
            for (let j = 0; j < message.fuelActions.length; ++j)
                object.fuelActions[j] = $root.FuelTankAction.toObject(message.fuelActions[j], options);
        }
        if (message.durationSeconds != null && message.hasOwnProperty("durationSeconds"))
            if (typeof message.durationSeconds === "number")
                object.durationSeconds = options.longs === String ? String(message.durationSeconds) : message.durationSeconds;
            else
                object.durationSeconds = options.longs === String ? $util.Long.prototype.toString.call(message.durationSeconds) : options.longs === Number ? new $util.LongBits(message.durationSeconds.low >>> 0, message.durationSeconds.high >>> 0).toNumber() : message.durationSeconds;
        if (message.artifacts && message.artifacts.length) {
            object.artifacts = [];
            for (let j = 0; j < message.artifacts.length; ++j)
                object.artifacts[j] = $root.Artifact.toObject(message.artifacts[j], options);
        }
        return object;
    };

    /**
     * Converts this AscensionStep to JSON.
     * @function toJSON
     * @memberof AscensionStep
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    AscensionStep.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for AscensionStep
     * @function getTypeUrl
     * @memberof AscensionStep
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    AscensionStep.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/AscensionStep";
    };

    return AscensionStep;
})();

export const StepPurchases = $root.StepPurchases = (() => {

    /**
     * Properties of a StepPurchases.
     * @exports IStepPurchases
     * @interface IStepPurchases
     * @property {Array.<IResearchPurchase>|null} [research] StepPurchases research
     * @property {Array.<IHabPurchase>|null} [habs] StepPurchases habs
     * @property {Array.<IVehiclePurchase>|null} [vehicles] StepPurchases vehicles
     * @property {number|null} [silosPurchased] StepPurchases silosPurchased
     * @property {Array.<IRocketLaunch>|null} [rockets] StepPurchases rockets
     */

    /**
     * Constructs a new StepPurchases.
     * @exports StepPurchases
     * @classdesc Represents a StepPurchases.
     * @implements IStepPurchases
     * @constructor
     * @param {IStepPurchases=} [properties] Properties to set
     */
    function StepPurchases(properties) {
        this.research = [];
        this.habs = [];
        this.vehicles = [];
        this.rockets = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * StepPurchases research.
     * @member {Array.<IResearchPurchase>} research
     * @memberof StepPurchases
     * @instance
     */
    StepPurchases.prototype.research = $util.emptyArray;

    /**
     * StepPurchases habs.
     * @member {Array.<IHabPurchase>} habs
     * @memberof StepPurchases
     * @instance
     */
    StepPurchases.prototype.habs = $util.emptyArray;

    /**
     * StepPurchases vehicles.
     * @member {Array.<IVehiclePurchase>} vehicles
     * @memberof StepPurchases
     * @instance
     */
    StepPurchases.prototype.vehicles = $util.emptyArray;

    /**
     * StepPurchases silosPurchased.
     * @member {number} silosPurchased
     * @memberof StepPurchases
     * @instance
     */
    StepPurchases.prototype.silosPurchased = 0;

    /**
     * StepPurchases rockets.
     * @member {Array.<IRocketLaunch>} rockets
     * @memberof StepPurchases
     * @instance
     */
    StepPurchases.prototype.rockets = $util.emptyArray;

    /**
     * Creates a new StepPurchases instance using the specified properties.
     * @function create
     * @memberof StepPurchases
     * @static
     * @param {IStepPurchases=} [properties] Properties to set
     * @returns {StepPurchases} StepPurchases instance
     */
    StepPurchases.create = function create(properties) {
        return new StepPurchases(properties);
    };

    /**
     * Encodes the specified StepPurchases message. Does not implicitly {@link StepPurchases.verify|verify} messages.
     * @function encode
     * @memberof StepPurchases
     * @static
     * @param {IStepPurchases} message StepPurchases message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StepPurchases.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.research != null && message.research.length)
            for (let i = 0; i < message.research.length; ++i)
                $root.ResearchPurchase.encode(message.research[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        if (message.habs != null && message.habs.length)
            for (let i = 0; i < message.habs.length; ++i)
                $root.HabPurchase.encode(message.habs[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        if (message.vehicles != null && message.vehicles.length)
            for (let i = 0; i < message.vehicles.length; ++i)
                $root.VehiclePurchase.encode(message.vehicles[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
        if (message.silosPurchased != null && Object.hasOwnProperty.call(message, "silosPurchased"))
            writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.silosPurchased);
        if (message.rockets != null && message.rockets.length)
            for (let i = 0; i < message.rockets.length; ++i)
                $root.RocketLaunch.encode(message.rockets[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified StepPurchases message, length delimited. Does not implicitly {@link StepPurchases.verify|verify} messages.
     * @function encodeDelimited
     * @memberof StepPurchases
     * @static
     * @param {IStepPurchases} message StepPurchases message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    StepPurchases.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a StepPurchases message from the specified reader or buffer.
     * @function decode
     * @memberof StepPurchases
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {StepPurchases} StepPurchases
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StepPurchases.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.StepPurchases();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    if (!(message.research && message.research.length))
                        message.research = [];
                    message.research.push($root.ResearchPurchase.decode(reader, reader.uint32()));
                    break;
                }
            case 2: {
                    if (!(message.habs && message.habs.length))
                        message.habs = [];
                    message.habs.push($root.HabPurchase.decode(reader, reader.uint32()));
                    break;
                }
            case 3: {
                    if (!(message.vehicles && message.vehicles.length))
                        message.vehicles = [];
                    message.vehicles.push($root.VehiclePurchase.decode(reader, reader.uint32()));
                    break;
                }
            case 4: {
                    message.silosPurchased = reader.uint32();
                    break;
                }
            case 5: {
                    if (!(message.rockets && message.rockets.length))
                        message.rockets = [];
                    message.rockets.push($root.RocketLaunch.decode(reader, reader.uint32()));
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a StepPurchases message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof StepPurchases
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {StepPurchases} StepPurchases
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    StepPurchases.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a StepPurchases message.
     * @function verify
     * @memberof StepPurchases
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    StepPurchases.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.research != null && message.hasOwnProperty("research")) {
            if (!Array.isArray(message.research))
                return "research: array expected";
            for (let i = 0; i < message.research.length; ++i) {
                let error = $root.ResearchPurchase.verify(message.research[i]);
                if (error)
                    return "research." + error;
            }
        }
        if (message.habs != null && message.hasOwnProperty("habs")) {
            if (!Array.isArray(message.habs))
                return "habs: array expected";
            for (let i = 0; i < message.habs.length; ++i) {
                let error = $root.HabPurchase.verify(message.habs[i]);
                if (error)
                    return "habs." + error;
            }
        }
        if (message.vehicles != null && message.hasOwnProperty("vehicles")) {
            if (!Array.isArray(message.vehicles))
                return "vehicles: array expected";
            for (let i = 0; i < message.vehicles.length; ++i) {
                let error = $root.VehiclePurchase.verify(message.vehicles[i]);
                if (error)
                    return "vehicles." + error;
            }
        }
        if (message.silosPurchased != null && message.hasOwnProperty("silosPurchased"))
            if (!$util.isInteger(message.silosPurchased))
                return "silosPurchased: integer expected";
        if (message.rockets != null && message.hasOwnProperty("rockets")) {
            if (!Array.isArray(message.rockets))
                return "rockets: array expected";
            for (let i = 0; i < message.rockets.length; ++i) {
                let error = $root.RocketLaunch.verify(message.rockets[i]);
                if (error)
                    return "rockets." + error;
            }
        }
        return null;
    };

    /**
     * Creates a StepPurchases message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof StepPurchases
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {StepPurchases} StepPurchases
     */
    StepPurchases.fromObject = function fromObject(object) {
        if (object instanceof $root.StepPurchases)
            return object;
        let message = new $root.StepPurchases();
        if (object.research) {
            if (!Array.isArray(object.research))
                throw TypeError(".StepPurchases.research: array expected");
            message.research = [];
            for (let i = 0; i < object.research.length; ++i) {
                if (typeof object.research[i] !== "object")
                    throw TypeError(".StepPurchases.research: object expected");
                message.research[i] = $root.ResearchPurchase.fromObject(object.research[i]);
            }
        }
        if (object.habs) {
            if (!Array.isArray(object.habs))
                throw TypeError(".StepPurchases.habs: array expected");
            message.habs = [];
            for (let i = 0; i < object.habs.length; ++i) {
                if (typeof object.habs[i] !== "object")
                    throw TypeError(".StepPurchases.habs: object expected");
                message.habs[i] = $root.HabPurchase.fromObject(object.habs[i]);
            }
        }
        if (object.vehicles) {
            if (!Array.isArray(object.vehicles))
                throw TypeError(".StepPurchases.vehicles: array expected");
            message.vehicles = [];
            for (let i = 0; i < object.vehicles.length; ++i) {
                if (typeof object.vehicles[i] !== "object")
                    throw TypeError(".StepPurchases.vehicles: object expected");
                message.vehicles[i] = $root.VehiclePurchase.fromObject(object.vehicles[i]);
            }
        }
        if (object.silosPurchased != null)
            message.silosPurchased = object.silosPurchased >>> 0;
        if (object.rockets) {
            if (!Array.isArray(object.rockets))
                throw TypeError(".StepPurchases.rockets: array expected");
            message.rockets = [];
            for (let i = 0; i < object.rockets.length; ++i) {
                if (typeof object.rockets[i] !== "object")
                    throw TypeError(".StepPurchases.rockets: object expected");
                message.rockets[i] = $root.RocketLaunch.fromObject(object.rockets[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a StepPurchases message. Also converts values to other types if specified.
     * @function toObject
     * @memberof StepPurchases
     * @static
     * @param {StepPurchases} message StepPurchases
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    StepPurchases.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults) {
            object.research = [];
            object.habs = [];
            object.vehicles = [];
            object.rockets = [];
        }
        if (options.defaults)
            object.silosPurchased = 0;
        if (message.research && message.research.length) {
            object.research = [];
            for (let j = 0; j < message.research.length; ++j)
                object.research[j] = $root.ResearchPurchase.toObject(message.research[j], options);
        }
        if (message.habs && message.habs.length) {
            object.habs = [];
            for (let j = 0; j < message.habs.length; ++j)
                object.habs[j] = $root.HabPurchase.toObject(message.habs[j], options);
        }
        if (message.vehicles && message.vehicles.length) {
            object.vehicles = [];
            for (let j = 0; j < message.vehicles.length; ++j)
                object.vehicles[j] = $root.VehiclePurchase.toObject(message.vehicles[j], options);
        }
        if (message.silosPurchased != null && message.hasOwnProperty("silosPurchased"))
            object.silosPurchased = message.silosPurchased;
        if (message.rockets && message.rockets.length) {
            object.rockets = [];
            for (let j = 0; j < message.rockets.length; ++j)
                object.rockets[j] = $root.RocketLaunch.toObject(message.rockets[j], options);
        }
        return object;
    };

    /**
     * Converts this StepPurchases to JSON.
     * @function toJSON
     * @memberof StepPurchases
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    StepPurchases.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for StepPurchases
     * @function getTypeUrl
     * @memberof StepPurchases
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    StepPurchases.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/StepPurchases";
    };

    return StepPurchases;
})();

export const ResearchPurchase = $root.ResearchPurchase = (() => {

    /**
     * Properties of a ResearchPurchase.
     * @exports IResearchPurchase
     * @interface IResearchPurchase
     * @property {string|null} [researchId] ResearchPurchase researchId
     * @property {number|null} [levels] ResearchPurchase levels
     */

    /**
     * Constructs a new ResearchPurchase.
     * @exports ResearchPurchase
     * @classdesc Represents a ResearchPurchase.
     * @implements IResearchPurchase
     * @constructor
     * @param {IResearchPurchase=} [properties] Properties to set
     */
    function ResearchPurchase(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ResearchPurchase researchId.
     * @member {string} researchId
     * @memberof ResearchPurchase
     * @instance
     */
    ResearchPurchase.prototype.researchId = "";

    /**
     * ResearchPurchase levels.
     * @member {number} levels
     * @memberof ResearchPurchase
     * @instance
     */
    ResearchPurchase.prototype.levels = 0;

    /**
     * Creates a new ResearchPurchase instance using the specified properties.
     * @function create
     * @memberof ResearchPurchase
     * @static
     * @param {IResearchPurchase=} [properties] Properties to set
     * @returns {ResearchPurchase} ResearchPurchase instance
     */
    ResearchPurchase.create = function create(properties) {
        return new ResearchPurchase(properties);
    };

    /**
     * Encodes the specified ResearchPurchase message. Does not implicitly {@link ResearchPurchase.verify|verify} messages.
     * @function encode
     * @memberof ResearchPurchase
     * @static
     * @param {IResearchPurchase} message ResearchPurchase message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ResearchPurchase.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.researchId != null && Object.hasOwnProperty.call(message, "researchId"))
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.researchId);
        if (message.levels != null && Object.hasOwnProperty.call(message, "levels"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.levels);
        return writer;
    };

    /**
     * Encodes the specified ResearchPurchase message, length delimited. Does not implicitly {@link ResearchPurchase.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ResearchPurchase
     * @static
     * @param {IResearchPurchase} message ResearchPurchase message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ResearchPurchase.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a ResearchPurchase message from the specified reader or buffer.
     * @function decode
     * @memberof ResearchPurchase
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ResearchPurchase} ResearchPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ResearchPurchase.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ResearchPurchase();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.researchId = reader.string();
                    break;
                }
            case 2: {
                    message.levels = reader.uint32();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a ResearchPurchase message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ResearchPurchase
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ResearchPurchase} ResearchPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ResearchPurchase.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a ResearchPurchase message.
     * @function verify
     * @memberof ResearchPurchase
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ResearchPurchase.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.researchId != null && message.hasOwnProperty("researchId"))
            if (!$util.isString(message.researchId))
                return "researchId: string expected";
        if (message.levels != null && message.hasOwnProperty("levels"))
            if (!$util.isInteger(message.levels))
                return "levels: integer expected";
        return null;
    };

    /**
     * Creates a ResearchPurchase message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ResearchPurchase
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ResearchPurchase} ResearchPurchase
     */
    ResearchPurchase.fromObject = function fromObject(object) {
        if (object instanceof $root.ResearchPurchase)
            return object;
        let message = new $root.ResearchPurchase();
        if (object.researchId != null)
            message.researchId = String(object.researchId);
        if (object.levels != null)
            message.levels = object.levels >>> 0;
        return message;
    };

    /**
     * Creates a plain object from a ResearchPurchase message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ResearchPurchase
     * @static
     * @param {ResearchPurchase} message ResearchPurchase
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ResearchPurchase.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.researchId = "";
            object.levels = 0;
        }
        if (message.researchId != null && message.hasOwnProperty("researchId"))
            object.researchId = message.researchId;
        if (message.levels != null && message.hasOwnProperty("levels"))
            object.levels = message.levels;
        return object;
    };

    /**
     * Converts this ResearchPurchase to JSON.
     * @function toJSON
     * @memberof ResearchPurchase
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ResearchPurchase.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for ResearchPurchase
     * @function getTypeUrl
     * @memberof ResearchPurchase
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    ResearchPurchase.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/ResearchPurchase";
    };

    return ResearchPurchase;
})();

export const HabPurchase = $root.HabPurchase = (() => {

    /**
     * Properties of a HabPurchase.
     * @exports IHabPurchase
     * @interface IHabPurchase
     * @property {number|null} [habIndex] HabPurchase habIndex
     * @property {number|null} [habType] HabPurchase habType
     */

    /**
     * Constructs a new HabPurchase.
     * @exports HabPurchase
     * @classdesc Represents a HabPurchase.
     * @implements IHabPurchase
     * @constructor
     * @param {IHabPurchase=} [properties] Properties to set
     */
    function HabPurchase(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * HabPurchase habIndex.
     * @member {number} habIndex
     * @memberof HabPurchase
     * @instance
     */
    HabPurchase.prototype.habIndex = 0;

    /**
     * HabPurchase habType.
     * @member {number} habType
     * @memberof HabPurchase
     * @instance
     */
    HabPurchase.prototype.habType = 0;

    /**
     * Creates a new HabPurchase instance using the specified properties.
     * @function create
     * @memberof HabPurchase
     * @static
     * @param {IHabPurchase=} [properties] Properties to set
     * @returns {HabPurchase} HabPurchase instance
     */
    HabPurchase.create = function create(properties) {
        return new HabPurchase(properties);
    };

    /**
     * Encodes the specified HabPurchase message. Does not implicitly {@link HabPurchase.verify|verify} messages.
     * @function encode
     * @memberof HabPurchase
     * @static
     * @param {IHabPurchase} message HabPurchase message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    HabPurchase.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.habIndex != null && Object.hasOwnProperty.call(message, "habIndex"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.habIndex);
        if (message.habType != null && Object.hasOwnProperty.call(message, "habType"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.habType);
        return writer;
    };

    /**
     * Encodes the specified HabPurchase message, length delimited. Does not implicitly {@link HabPurchase.verify|verify} messages.
     * @function encodeDelimited
     * @memberof HabPurchase
     * @static
     * @param {IHabPurchase} message HabPurchase message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    HabPurchase.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a HabPurchase message from the specified reader or buffer.
     * @function decode
     * @memberof HabPurchase
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {HabPurchase} HabPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    HabPurchase.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.HabPurchase();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.habIndex = reader.uint32();
                    break;
                }
            case 2: {
                    message.habType = reader.uint32();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a HabPurchase message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof HabPurchase
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {HabPurchase} HabPurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    HabPurchase.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a HabPurchase message.
     * @function verify
     * @memberof HabPurchase
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    HabPurchase.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.habIndex != null && message.hasOwnProperty("habIndex"))
            if (!$util.isInteger(message.habIndex))
                return "habIndex: integer expected";
        if (message.habType != null && message.hasOwnProperty("habType"))
            if (!$util.isInteger(message.habType))
                return "habType: integer expected";
        return null;
    };

    /**
     * Creates a HabPurchase message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof HabPurchase
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {HabPurchase} HabPurchase
     */
    HabPurchase.fromObject = function fromObject(object) {
        if (object instanceof $root.HabPurchase)
            return object;
        let message = new $root.HabPurchase();
        if (object.habIndex != null)
            message.habIndex = object.habIndex >>> 0;
        if (object.habType != null)
            message.habType = object.habType >>> 0;
        return message;
    };

    /**
     * Creates a plain object from a HabPurchase message. Also converts values to other types if specified.
     * @function toObject
     * @memberof HabPurchase
     * @static
     * @param {HabPurchase} message HabPurchase
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    HabPurchase.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.habIndex = 0;
            object.habType = 0;
        }
        if (message.habIndex != null && message.hasOwnProperty("habIndex"))
            object.habIndex = message.habIndex;
        if (message.habType != null && message.hasOwnProperty("habType"))
            object.habType = message.habType;
        return object;
    };

    /**
     * Converts this HabPurchase to JSON.
     * @function toJSON
     * @memberof HabPurchase
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    HabPurchase.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for HabPurchase
     * @function getTypeUrl
     * @memberof HabPurchase
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    HabPurchase.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/HabPurchase";
    };

    return HabPurchase;
})();

export const VehiclePurchase = $root.VehiclePurchase = (() => {

    /**
     * Properties of a VehiclePurchase.
     * @exports IVehiclePurchase
     * @interface IVehiclePurchase
     * @property {number|null} [vehicleIndex] VehiclePurchase vehicleIndex
     * @property {number|null} [vehicleType] VehiclePurchase vehicleType
     */

    /**
     * Constructs a new VehiclePurchase.
     * @exports VehiclePurchase
     * @classdesc Represents a VehiclePurchase.
     * @implements IVehiclePurchase
     * @constructor
     * @param {IVehiclePurchase=} [properties] Properties to set
     */
    function VehiclePurchase(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * VehiclePurchase vehicleIndex.
     * @member {number} vehicleIndex
     * @memberof VehiclePurchase
     * @instance
     */
    VehiclePurchase.prototype.vehicleIndex = 0;

    /**
     * VehiclePurchase vehicleType.
     * @member {number} vehicleType
     * @memberof VehiclePurchase
     * @instance
     */
    VehiclePurchase.prototype.vehicleType = 0;

    /**
     * Creates a new VehiclePurchase instance using the specified properties.
     * @function create
     * @memberof VehiclePurchase
     * @static
     * @param {IVehiclePurchase=} [properties] Properties to set
     * @returns {VehiclePurchase} VehiclePurchase instance
     */
    VehiclePurchase.create = function create(properties) {
        return new VehiclePurchase(properties);
    };

    /**
     * Encodes the specified VehiclePurchase message. Does not implicitly {@link VehiclePurchase.verify|verify} messages.
     * @function encode
     * @memberof VehiclePurchase
     * @static
     * @param {IVehiclePurchase} message VehiclePurchase message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    VehiclePurchase.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.vehicleIndex != null && Object.hasOwnProperty.call(message, "vehicleIndex"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.vehicleIndex);
        if (message.vehicleType != null && Object.hasOwnProperty.call(message, "vehicleType"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.vehicleType);
        return writer;
    };

    /**
     * Encodes the specified VehiclePurchase message, length delimited. Does not implicitly {@link VehiclePurchase.verify|verify} messages.
     * @function encodeDelimited
     * @memberof VehiclePurchase
     * @static
     * @param {IVehiclePurchase} message VehiclePurchase message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    VehiclePurchase.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a VehiclePurchase message from the specified reader or buffer.
     * @function decode
     * @memberof VehiclePurchase
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {VehiclePurchase} VehiclePurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    VehiclePurchase.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.VehiclePurchase();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.vehicleIndex = reader.uint32();
                    break;
                }
            case 2: {
                    message.vehicleType = reader.uint32();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a VehiclePurchase message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof VehiclePurchase
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {VehiclePurchase} VehiclePurchase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    VehiclePurchase.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a VehiclePurchase message.
     * @function verify
     * @memberof VehiclePurchase
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    VehiclePurchase.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.vehicleIndex != null && message.hasOwnProperty("vehicleIndex"))
            if (!$util.isInteger(message.vehicleIndex))
                return "vehicleIndex: integer expected";
        if (message.vehicleType != null && message.hasOwnProperty("vehicleType"))
            if (!$util.isInteger(message.vehicleType))
                return "vehicleType: integer expected";
        return null;
    };

    /**
     * Creates a VehiclePurchase message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof VehiclePurchase
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {VehiclePurchase} VehiclePurchase
     */
    VehiclePurchase.fromObject = function fromObject(object) {
        if (object instanceof $root.VehiclePurchase)
            return object;
        let message = new $root.VehiclePurchase();
        if (object.vehicleIndex != null)
            message.vehicleIndex = object.vehicleIndex >>> 0;
        if (object.vehicleType != null)
            message.vehicleType = object.vehicleType >>> 0;
        return message;
    };

    /**
     * Creates a plain object from a VehiclePurchase message. Also converts values to other types if specified.
     * @function toObject
     * @memberof VehiclePurchase
     * @static
     * @param {VehiclePurchase} message VehiclePurchase
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    VehiclePurchase.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.vehicleIndex = 0;
            object.vehicleType = 0;
        }
        if (message.vehicleIndex != null && message.hasOwnProperty("vehicleIndex"))
            object.vehicleIndex = message.vehicleIndex;
        if (message.vehicleType != null && message.hasOwnProperty("vehicleType"))
            object.vehicleType = message.vehicleType;
        return object;
    };

    /**
     * Converts this VehiclePurchase to JSON.
     * @function toJSON
     * @memberof VehiclePurchase
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    VehiclePurchase.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for VehiclePurchase
     * @function getTypeUrl
     * @memberof VehiclePurchase
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    VehiclePurchase.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/VehiclePurchase";
    };

    return VehiclePurchase;
})();

export const RocketLaunch = $root.RocketLaunch = (() => {

    /**
     * Properties of a RocketLaunch.
     * @exports IRocketLaunch
     * @interface IRocketLaunch
     * @property {number|null} [shipType] RocketLaunch shipType
     * @property {number|null} [missionType] RocketLaunch missionType
     * @property {number|null} [curiosityFuel] RocketLaunch curiosityFuel
     * @property {number|null} [integrityFuel] RocketLaunch integrityFuel
     * @property {number|null} [kindnessFuel] RocketLaunch kindnessFuel
     * @property {number|null} [humilityFuel] RocketLaunch humilityFuel
     * @property {number|null} [resilienceFuel] RocketLaunch resilienceFuel
     */

    /**
     * Constructs a new RocketLaunch.
     * @exports RocketLaunch
     * @classdesc Represents a RocketLaunch.
     * @implements IRocketLaunch
     * @constructor
     * @param {IRocketLaunch=} [properties] Properties to set
     */
    function RocketLaunch(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * RocketLaunch shipType.
     * @member {number} shipType
     * @memberof RocketLaunch
     * @instance
     */
    RocketLaunch.prototype.shipType = 0;

    /**
     * RocketLaunch missionType.
     * @member {number} missionType
     * @memberof RocketLaunch
     * @instance
     */
    RocketLaunch.prototype.missionType = 0;

    /**
     * RocketLaunch curiosityFuel.
     * @member {number} curiosityFuel
     * @memberof RocketLaunch
     * @instance
     */
    RocketLaunch.prototype.curiosityFuel = 0;

    /**
     * RocketLaunch integrityFuel.
     * @member {number} integrityFuel
     * @memberof RocketLaunch
     * @instance
     */
    RocketLaunch.prototype.integrityFuel = 0;

    /**
     * RocketLaunch kindnessFuel.
     * @member {number} kindnessFuel
     * @memberof RocketLaunch
     * @instance
     */
    RocketLaunch.prototype.kindnessFuel = 0;

    /**
     * RocketLaunch humilityFuel.
     * @member {number} humilityFuel
     * @memberof RocketLaunch
     * @instance
     */
    RocketLaunch.prototype.humilityFuel = 0;

    /**
     * RocketLaunch resilienceFuel.
     * @member {number} resilienceFuel
     * @memberof RocketLaunch
     * @instance
     */
    RocketLaunch.prototype.resilienceFuel = 0;

    /**
     * Creates a new RocketLaunch instance using the specified properties.
     * @function create
     * @memberof RocketLaunch
     * @static
     * @param {IRocketLaunch=} [properties] Properties to set
     * @returns {RocketLaunch} RocketLaunch instance
     */
    RocketLaunch.create = function create(properties) {
        return new RocketLaunch(properties);
    };

    /**
     * Encodes the specified RocketLaunch message. Does not implicitly {@link RocketLaunch.verify|verify} messages.
     * @function encode
     * @memberof RocketLaunch
     * @static
     * @param {IRocketLaunch} message RocketLaunch message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RocketLaunch.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.shipType != null && Object.hasOwnProperty.call(message, "shipType"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.shipType);
        if (message.missionType != null && Object.hasOwnProperty.call(message, "missionType"))
            writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.missionType);
        if (message.curiosityFuel != null && Object.hasOwnProperty.call(message, "curiosityFuel"))
            writer.uint32(/* id 10, wireType 1 =*/81).double(message.curiosityFuel);
        if (message.integrityFuel != null && Object.hasOwnProperty.call(message, "integrityFuel"))
            writer.uint32(/* id 11, wireType 1 =*/89).double(message.integrityFuel);
        if (message.kindnessFuel != null && Object.hasOwnProperty.call(message, "kindnessFuel"))
            writer.uint32(/* id 12, wireType 1 =*/97).double(message.kindnessFuel);
        if (message.humilityFuel != null && Object.hasOwnProperty.call(message, "humilityFuel"))
            writer.uint32(/* id 13, wireType 1 =*/105).double(message.humilityFuel);
        if (message.resilienceFuel != null && Object.hasOwnProperty.call(message, "resilienceFuel"))
            writer.uint32(/* id 14, wireType 1 =*/113).double(message.resilienceFuel);
        return writer;
    };

    /**
     * Encodes the specified RocketLaunch message, length delimited. Does not implicitly {@link RocketLaunch.verify|verify} messages.
     * @function encodeDelimited
     * @memberof RocketLaunch
     * @static
     * @param {IRocketLaunch} message RocketLaunch message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    RocketLaunch.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a RocketLaunch message from the specified reader or buffer.
     * @function decode
     * @memberof RocketLaunch
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {RocketLaunch} RocketLaunch
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RocketLaunch.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.RocketLaunch();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.shipType = reader.uint32();
                    break;
                }
            case 2: {
                    message.missionType = reader.uint32();
                    break;
                }
            case 10: {
                    message.curiosityFuel = reader.double();
                    break;
                }
            case 11: {
                    message.integrityFuel = reader.double();
                    break;
                }
            case 12: {
                    message.kindnessFuel = reader.double();
                    break;
                }
            case 13: {
                    message.humilityFuel = reader.double();
                    break;
                }
            case 14: {
                    message.resilienceFuel = reader.double();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a RocketLaunch message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof RocketLaunch
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {RocketLaunch} RocketLaunch
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    RocketLaunch.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a RocketLaunch message.
     * @function verify
     * @memberof RocketLaunch
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    RocketLaunch.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.shipType != null && message.hasOwnProperty("shipType"))
            if (!$util.isInteger(message.shipType))
                return "shipType: integer expected";
        if (message.missionType != null && message.hasOwnProperty("missionType"))
            if (!$util.isInteger(message.missionType))
                return "missionType: integer expected";
        if (message.curiosityFuel != null && message.hasOwnProperty("curiosityFuel"))
            if (typeof message.curiosityFuel !== "number")
                return "curiosityFuel: number expected";
        if (message.integrityFuel != null && message.hasOwnProperty("integrityFuel"))
            if (typeof message.integrityFuel !== "number")
                return "integrityFuel: number expected";
        if (message.kindnessFuel != null && message.hasOwnProperty("kindnessFuel"))
            if (typeof message.kindnessFuel !== "number")
                return "kindnessFuel: number expected";
        if (message.humilityFuel != null && message.hasOwnProperty("humilityFuel"))
            if (typeof message.humilityFuel !== "number")
                return "humilityFuel: number expected";
        if (message.resilienceFuel != null && message.hasOwnProperty("resilienceFuel"))
            if (typeof message.resilienceFuel !== "number")
                return "resilienceFuel: number expected";
        return null;
    };

    /**
     * Creates a RocketLaunch message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof RocketLaunch
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {RocketLaunch} RocketLaunch
     */
    RocketLaunch.fromObject = function fromObject(object) {
        if (object instanceof $root.RocketLaunch)
            return object;
        let message = new $root.RocketLaunch();
        if (object.shipType != null)
            message.shipType = object.shipType >>> 0;
        if (object.missionType != null)
            message.missionType = object.missionType >>> 0;
        if (object.curiosityFuel != null)
            message.curiosityFuel = Number(object.curiosityFuel);
        if (object.integrityFuel != null)
            message.integrityFuel = Number(object.integrityFuel);
        if (object.kindnessFuel != null)
            message.kindnessFuel = Number(object.kindnessFuel);
        if (object.humilityFuel != null)
            message.humilityFuel = Number(object.humilityFuel);
        if (object.resilienceFuel != null)
            message.resilienceFuel = Number(object.resilienceFuel);
        return message;
    };

    /**
     * Creates a plain object from a RocketLaunch message. Also converts values to other types if specified.
     * @function toObject
     * @memberof RocketLaunch
     * @static
     * @param {RocketLaunch} message RocketLaunch
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    RocketLaunch.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.shipType = 0;
            object.missionType = 0;
            object.curiosityFuel = 0;
            object.integrityFuel = 0;
            object.kindnessFuel = 0;
            object.humilityFuel = 0;
            object.resilienceFuel = 0;
        }
        if (message.shipType != null && message.hasOwnProperty("shipType"))
            object.shipType = message.shipType;
        if (message.missionType != null && message.hasOwnProperty("missionType"))
            object.missionType = message.missionType;
        if (message.curiosityFuel != null && message.hasOwnProperty("curiosityFuel"))
            object.curiosityFuel = options.json && !isFinite(message.curiosityFuel) ? String(message.curiosityFuel) : message.curiosityFuel;
        if (message.integrityFuel != null && message.hasOwnProperty("integrityFuel"))
            object.integrityFuel = options.json && !isFinite(message.integrityFuel) ? String(message.integrityFuel) : message.integrityFuel;
        if (message.kindnessFuel != null && message.hasOwnProperty("kindnessFuel"))
            object.kindnessFuel = options.json && !isFinite(message.kindnessFuel) ? String(message.kindnessFuel) : message.kindnessFuel;
        if (message.humilityFuel != null && message.hasOwnProperty("humilityFuel"))
            object.humilityFuel = options.json && !isFinite(message.humilityFuel) ? String(message.humilityFuel) : message.humilityFuel;
        if (message.resilienceFuel != null && message.hasOwnProperty("resilienceFuel"))
            object.resilienceFuel = options.json && !isFinite(message.resilienceFuel) ? String(message.resilienceFuel) : message.resilienceFuel;
        return object;
    };

    /**
     * Converts this RocketLaunch to JSON.
     * @function toJSON
     * @memberof RocketLaunch
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    RocketLaunch.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for RocketLaunch
     * @function getTypeUrl
     * @memberof RocketLaunch
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    RocketLaunch.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/RocketLaunch";
    };

    return RocketLaunch;
})();

export const FuelTankAction = $root.FuelTankAction = (() => {

    /**
     * Properties of a FuelTankAction.
     * @exports IFuelTankAction
     * @interface IFuelTankAction
     * @property {FuelActionType|null} [actionType] FuelTankAction actionType
     * @property {VirtueEgg|null} [eggType] FuelTankAction eggType
     * @property {number|null} [amount] FuelTankAction amount
     */

    /**
     * Constructs a new FuelTankAction.
     * @exports FuelTankAction
     * @classdesc Represents a FuelTankAction.
     * @implements IFuelTankAction
     * @constructor
     * @param {IFuelTankAction=} [properties] Properties to set
     */
    function FuelTankAction(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * FuelTankAction actionType.
     * @member {FuelActionType} actionType
     * @memberof FuelTankAction
     * @instance
     */
    FuelTankAction.prototype.actionType = 0;

    /**
     * FuelTankAction eggType.
     * @member {VirtueEgg} eggType
     * @memberof FuelTankAction
     * @instance
     */
    FuelTankAction.prototype.eggType = 0;

    /**
     * FuelTankAction amount.
     * @member {number} amount
     * @memberof FuelTankAction
     * @instance
     */
    FuelTankAction.prototype.amount = 0;

    /**
     * Creates a new FuelTankAction instance using the specified properties.
     * @function create
     * @memberof FuelTankAction
     * @static
     * @param {IFuelTankAction=} [properties] Properties to set
     * @returns {FuelTankAction} FuelTankAction instance
     */
    FuelTankAction.create = function create(properties) {
        return new FuelTankAction(properties);
    };

    /**
     * Encodes the specified FuelTankAction message. Does not implicitly {@link FuelTankAction.verify|verify} messages.
     * @function encode
     * @memberof FuelTankAction
     * @static
     * @param {IFuelTankAction} message FuelTankAction message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FuelTankAction.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.actionType != null && Object.hasOwnProperty.call(message, "actionType"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.actionType);
        if (message.eggType != null && Object.hasOwnProperty.call(message, "eggType"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.eggType);
        if (message.amount != null && Object.hasOwnProperty.call(message, "amount"))
            writer.uint32(/* id 3, wireType 1 =*/25).double(message.amount);
        return writer;
    };

    /**
     * Encodes the specified FuelTankAction message, length delimited. Does not implicitly {@link FuelTankAction.verify|verify} messages.
     * @function encodeDelimited
     * @memberof FuelTankAction
     * @static
     * @param {IFuelTankAction} message FuelTankAction message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    FuelTankAction.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a FuelTankAction message from the specified reader or buffer.
     * @function decode
     * @memberof FuelTankAction
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {FuelTankAction} FuelTankAction
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FuelTankAction.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.FuelTankAction();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1: {
                    message.actionType = reader.int32();
                    break;
                }
            case 2: {
                    message.eggType = reader.int32();
                    break;
                }
            case 3: {
                    message.amount = reader.double();
                    break;
                }
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a FuelTankAction message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof FuelTankAction
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {FuelTankAction} FuelTankAction
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    FuelTankAction.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a FuelTankAction message.
     * @function verify
     * @memberof FuelTankAction
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    FuelTankAction.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.actionType != null && message.hasOwnProperty("actionType"))
            switch (message.actionType) {
            default:
                return "actionType: enum value expected";
            case 0:
            case 1:
            case 2:
                break;
            }
        if (message.eggType != null && message.hasOwnProperty("eggType"))
            switch (message.eggType) {
            default:
                return "eggType: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                break;
            }
        if (message.amount != null && message.hasOwnProperty("amount"))
            if (typeof message.amount !== "number")
                return "amount: number expected";
        return null;
    };

    /**
     * Creates a FuelTankAction message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof FuelTankAction
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {FuelTankAction} FuelTankAction
     */
    FuelTankAction.fromObject = function fromObject(object) {
        if (object instanceof $root.FuelTankAction)
            return object;
        let message = new $root.FuelTankAction();
        switch (object.actionType) {
        default:
            if (typeof object.actionType === "number") {
                message.actionType = object.actionType;
                break;
            }
            break;
        case "FUEL_ACTION_UNKNOWN":
        case 0:
            message.actionType = 0;
            break;
        case "FUEL_ACTION_FILL":
        case 1:
            message.actionType = 1;
            break;
        case "FUEL_ACTION_USE":
        case 2:
            message.actionType = 2;
            break;
        }
        switch (object.eggType) {
        default:
            if (typeof object.eggType === "number") {
                message.eggType = object.eggType;
                break;
            }
            break;
        case "VIRTUE_EGG_UNKNOWN":
        case 0:
            message.eggType = 0;
            break;
        case "CURIOSITY":
        case 1:
            message.eggType = 1;
            break;
        case "INTEGRITY":
        case 2:
            message.eggType = 2;
            break;
        case "KINDNESS":
        case 3:
            message.eggType = 3;
            break;
        case "HUMILITY":
        case 4:
            message.eggType = 4;
            break;
        case "RESILIENCE":
        case 5:
            message.eggType = 5;
            break;
        }
        if (object.amount != null)
            message.amount = Number(object.amount);
        return message;
    };

    /**
     * Creates a plain object from a FuelTankAction message. Also converts values to other types if specified.
     * @function toObject
     * @memberof FuelTankAction
     * @static
     * @param {FuelTankAction} message FuelTankAction
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    FuelTankAction.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.actionType = options.enums === String ? "FUEL_ACTION_UNKNOWN" : 0;
            object.eggType = options.enums === String ? "VIRTUE_EGG_UNKNOWN" : 0;
            object.amount = 0;
        }
        if (message.actionType != null && message.hasOwnProperty("actionType"))
            object.actionType = options.enums === String ? $root.FuelActionType[message.actionType] === undefined ? message.actionType : $root.FuelActionType[message.actionType] : message.actionType;
        if (message.eggType != null && message.hasOwnProperty("eggType"))
            object.eggType = options.enums === String ? $root.VirtueEgg[message.eggType] === undefined ? message.eggType : $root.VirtueEgg[message.eggType] : message.eggType;
        if (message.amount != null && message.hasOwnProperty("amount"))
            object.amount = options.json && !isFinite(message.amount) ? String(message.amount) : message.amount;
        return object;
    };

    /**
     * Converts this FuelTankAction to JSON.
     * @function toJSON
     * @memberof FuelTankAction
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    FuelTankAction.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Gets the default type url for FuelTankAction
     * @function getTypeUrl
     * @memberof FuelTankAction
     * @static
     * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
     * @returns {string} The default type url
     */
    FuelTankAction.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
        if (typeUrlPrefix === undefined) {
            typeUrlPrefix = "type.googleapis.com";
        }
        return typeUrlPrefix + "/FuelTankAction";
    };

    return FuelTankAction;
})();

/**
 * FuelActionType enum.
 * @exports FuelActionType
 * @enum {number}
 * @property {number} FUEL_ACTION_UNKNOWN=0 FUEL_ACTION_UNKNOWN value
 * @property {number} FUEL_ACTION_FILL=1 FUEL_ACTION_FILL value
 * @property {number} FUEL_ACTION_USE=2 FUEL_ACTION_USE value
 */
export const FuelActionType = $root.FuelActionType = (() => {
    const valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "FUEL_ACTION_UNKNOWN"] = 0;
    values[valuesById[1] = "FUEL_ACTION_FILL"] = 1;
    values[valuesById[2] = "FUEL_ACTION_USE"] = 2;
    return values;
})();

/**
 * VirtueEgg enum.
 * @exports VirtueEgg
 * @enum {number}
 * @property {number} VIRTUE_EGG_UNKNOWN=0 VIRTUE_EGG_UNKNOWN value
 * @property {number} CURIOSITY=1 CURIOSITY value
 * @property {number} INTEGRITY=2 INTEGRITY value
 * @property {number} KINDNESS=3 KINDNESS value
 * @property {number} HUMILITY=4 HUMILITY value
 * @property {number} RESILIENCE=5 RESILIENCE value
 */
export const VirtueEgg = $root.VirtueEgg = (() => {
    const valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "VIRTUE_EGG_UNKNOWN"] = 0;
    values[valuesById[1] = "CURIOSITY"] = 1;
    values[valuesById[2] = "INTEGRITY"] = 2;
    values[valuesById[3] = "KINDNESS"] = 3;
    values[valuesById[4] = "HUMILITY"] = 4;
    values[valuesById[5] = "RESILIENCE"] = 5;
    return values;
})();

export { $root as default };
