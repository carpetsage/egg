/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const Builds = $root.Builds = (() => {

    /**
     * Properties of a Builds.
     * @exports IBuilds
     * @interface IBuilds
     * @property {Array.<IBuild>|null} [builds] Builds builds
     * @property {IConfig|null} [config] Builds config
     */

    /**
     * Constructs a new Builds.
     * @exports Builds
     * @classdesc Represents a Builds.
     * @implements IBuilds
     * @constructor
     * @param {IBuilds=} [properties] Properties to set
     */
    function Builds(properties) {
        this.builds = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Builds builds.
     * @member {Array.<IBuild>} builds
     * @memberof Builds
     * @instance
     */
    Builds.prototype.builds = $util.emptyArray;

    /**
     * Builds config.
     * @member {IConfig|null|undefined} config
     * @memberof Builds
     * @instance
     */
    Builds.prototype.config = null;

    /**
     * Creates a new Builds instance using the specified properties.
     * @function create
     * @memberof Builds
     * @static
     * @param {IBuilds=} [properties] Properties to set
     * @returns {Builds} Builds instance
     */
    Builds.create = function create(properties) {
        return new Builds(properties);
    };

    /**
     * Encodes the specified Builds message. Does not implicitly {@link Builds.verify|verify} messages.
     * @function encode
     * @memberof Builds
     * @static
     * @param {IBuilds} message Builds message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Builds.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.builds != null && message.builds.length)
            for (let i = 0; i < message.builds.length; ++i)
                $root.Build.encode(message.builds[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        if (message.config != null && Object.hasOwnProperty.call(message, "config"))
            $root.Config.encode(message.config, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified Builds message, length delimited. Does not implicitly {@link Builds.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Builds
     * @static
     * @param {IBuilds} message Builds message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Builds.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Builds message from the specified reader or buffer.
     * @function decode
     * @memberof Builds
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Builds} Builds
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Builds.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Builds();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                if (!(message.builds && message.builds.length))
                    message.builds = [];
                message.builds.push($root.Build.decode(reader, reader.uint32()));
                break;
            case 2:
                message.config = $root.Config.decode(reader, reader.uint32());
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Builds message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Builds
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Builds} Builds
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Builds.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Builds message.
     * @function verify
     * @memberof Builds
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Builds.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.builds != null && message.hasOwnProperty("builds")) {
            if (!Array.isArray(message.builds))
                return "builds: array expected";
            for (let i = 0; i < message.builds.length; ++i) {
                let error = $root.Build.verify(message.builds[i]);
                if (error)
                    return "builds." + error;
            }
        }
        if (message.config != null && message.hasOwnProperty("config")) {
            let error = $root.Config.verify(message.config);
            if (error)
                return "config." + error;
        }
        return null;
    };

    /**
     * Creates a Builds message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Builds
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Builds} Builds
     */
    Builds.fromObject = function fromObject(object) {
        if (object instanceof $root.Builds)
            return object;
        let message = new $root.Builds();
        if (object.builds) {
            if (!Array.isArray(object.builds))
                throw TypeError(".Builds.builds: array expected");
            message.builds = [];
            for (let i = 0; i < object.builds.length; ++i) {
                if (typeof object.builds[i] !== "object")
                    throw TypeError(".Builds.builds: object expected");
                message.builds[i] = $root.Build.fromObject(object.builds[i]);
            }
        }
        if (object.config != null) {
            if (typeof object.config !== "object")
                throw TypeError(".Builds.config: object expected");
            message.config = $root.Config.fromObject(object.config);
        }
        return message;
    };

    /**
     * Creates a plain object from a Builds message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Builds
     * @static
     * @param {Builds} message Builds
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Builds.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.builds = [];
        if (options.defaults)
            object.config = null;
        if (message.builds && message.builds.length) {
            object.builds = [];
            for (let j = 0; j < message.builds.length; ++j)
                object.builds[j] = $root.Build.toObject(message.builds[j], options);
        }
        if (message.config != null && message.hasOwnProperty("config"))
            object.config = $root.Config.toObject(message.config, options);
        return object;
    };

    /**
     * Converts this Builds to JSON.
     * @function toJSON
     * @memberof Builds
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Builds.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Builds;
})();

export const Build = $root.Build = (() => {

    /**
     * Properties of a Build.
     * @exports IBuild
     * @interface IBuild
     * @property {Array.<IArtifact>|null} [artifacts] Build artifacts
     */

    /**
     * Constructs a new Build.
     * @exports Build
     * @classdesc Represents a Build.
     * @implements IBuild
     * @constructor
     * @param {IBuild=} [properties] Properties to set
     */
    function Build(properties) {
        this.artifacts = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Build artifacts.
     * @member {Array.<IArtifact>} artifacts
     * @memberof Build
     * @instance
     */
    Build.prototype.artifacts = $util.emptyArray;

    /**
     * Creates a new Build instance using the specified properties.
     * @function create
     * @memberof Build
     * @static
     * @param {IBuild=} [properties] Properties to set
     * @returns {Build} Build instance
     */
    Build.create = function create(properties) {
        return new Build(properties);
    };

    /**
     * Encodes the specified Build message. Does not implicitly {@link Build.verify|verify} messages.
     * @function encode
     * @memberof Build
     * @static
     * @param {IBuild} message Build message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Build.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.artifacts != null && message.artifacts.length)
            for (let i = 0; i < message.artifacts.length; ++i)
                $root.Artifact.encode(message.artifacts[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
        return writer;
    };

    /**
     * Encodes the specified Build message, length delimited. Does not implicitly {@link Build.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Build
     * @static
     * @param {IBuild} message Build message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Build.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Build message from the specified reader or buffer.
     * @function decode
     * @memberof Build
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Build} Build
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Build.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Build();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                if (!(message.artifacts && message.artifacts.length))
                    message.artifacts = [];
                message.artifacts.push($root.Artifact.decode(reader, reader.uint32()));
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Build message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Build
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Build} Build
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Build.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Build message.
     * @function verify
     * @memberof Build
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Build.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
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
     * Creates a Build message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Build
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Build} Build
     */
    Build.fromObject = function fromObject(object) {
        if (object instanceof $root.Build)
            return object;
        let message = new $root.Build();
        if (object.artifacts) {
            if (!Array.isArray(object.artifacts))
                throw TypeError(".Build.artifacts: array expected");
            message.artifacts = [];
            for (let i = 0; i < object.artifacts.length; ++i) {
                if (typeof object.artifacts[i] !== "object")
                    throw TypeError(".Build.artifacts: object expected");
                message.artifacts[i] = $root.Artifact.fromObject(object.artifacts[i]);
            }
        }
        return message;
    };

    /**
     * Creates a plain object from a Build message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Build
     * @static
     * @param {Build} message Build
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Build.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.arrays || options.defaults)
            object.artifacts = [];
        if (message.artifacts && message.artifacts.length) {
            object.artifacts = [];
            for (let j = 0; j < message.artifacts.length; ++j)
                object.artifacts[j] = $root.Artifact.toObject(message.artifacts[j], options);
        }
        return object;
    };

    /**
     * Converts this Build to JSON.
     * @function toJSON
     * @memberof Build
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Build.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Build;
})();

export const Artifact = $root.Artifact = (() => {

    /**
     * Properties of an Artifact.
     * @exports IArtifact
     * @interface IArtifact
     * @property {ArtifactSpec.Name|null} [afxId] Artifact afxId
     * @property {ArtifactSpec.Level|null} [afxLevel] Artifact afxLevel
     * @property {ArtifactSpec.Rarity|null} [afxRarity] Artifact afxRarity
     * @property {Array.<IStone>|null} [stones] Artifact stones
     * @property {boolean|null} [isEmpty] Artifact isEmpty
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
     * @member {ArtifactSpec.Name} afxId
     * @memberof Artifact
     * @instance
     */
    Artifact.prototype.afxId = 0;

    /**
     * Artifact afxLevel.
     * @member {ArtifactSpec.Level} afxLevel
     * @memberof Artifact
     * @instance
     */
    Artifact.prototype.afxLevel = 0;

    /**
     * Artifact afxRarity.
     * @member {ArtifactSpec.Rarity} afxRarity
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
     * Artifact isEmpty.
     * @member {boolean} isEmpty
     * @memberof Artifact
     * @instance
     */
    Artifact.prototype.isEmpty = false;

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
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.afxId);
        if (message.afxLevel != null && Object.hasOwnProperty.call(message, "afxLevel"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.afxLevel);
        if (message.afxRarity != null && Object.hasOwnProperty.call(message, "afxRarity"))
            writer.uint32(/* id 3, wireType 0 =*/24).int32(message.afxRarity);
        if (message.stones != null && message.stones.length)
            for (let i = 0; i < message.stones.length; ++i)
                $root.Stone.encode(message.stones[i], writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
        if (message.isEmpty != null && Object.hasOwnProperty.call(message, "isEmpty"))
            writer.uint32(/* id 20, wireType 0 =*/160).bool(message.isEmpty);
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
            case 1:
                message.afxId = reader.int32();
                break;
            case 2:
                message.afxLevel = reader.int32();
                break;
            case 3:
                message.afxRarity = reader.int32();
                break;
            case 10:
                if (!(message.stones && message.stones.length))
                    message.stones = [];
                message.stones.push($root.Stone.decode(reader, reader.uint32()));
                break;
            case 20:
                message.isEmpty = reader.bool();
                break;
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
            switch (message.afxId) {
            default:
                return "afxId: enum value expected";
            case 0:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 21:
            case 22:
            case 23:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 29:
            case 30:
            case 1:
            case 31:
            case 32:
            case 33:
            case 34:
            case 39:
            case 36:
            case 37:
            case 38:
            case 40:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 35:
            case 41:
            case 42:
            case 43:
            case 2:
            case 44:
            case 45:
            case 46:
            case 47:
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 10000:
                break;
            }
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            switch (message.afxLevel) {
            default:
                return "afxLevel: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
                break;
            }
        if (message.afxRarity != null && message.hasOwnProperty("afxRarity"))
            switch (message.afxRarity) {
            default:
                return "afxRarity: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
                break;
            }
        if (message.stones != null && message.hasOwnProperty("stones")) {
            if (!Array.isArray(message.stones))
                return "stones: array expected";
            for (let i = 0; i < message.stones.length; ++i) {
                let error = $root.Stone.verify(message.stones[i]);
                if (error)
                    return "stones." + error;
            }
        }
        if (message.isEmpty != null && message.hasOwnProperty("isEmpty"))
            if (typeof message.isEmpty !== "boolean")
                return "isEmpty: boolean expected";
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
        switch (object.afxId) {
        case "LUNAR_TOTEM":
        case 0:
            message.afxId = 0;
            break;
        case "NEODYMIUM_MEDALLION":
        case 3:
            message.afxId = 3;
            break;
        case "BEAK_OF_MIDAS":
        case 4:
            message.afxId = 4;
            break;
        case "LIGHT_OF_EGGENDIL":
        case 5:
            message.afxId = 5;
            break;
        case "DEMETERS_NECKLACE":
        case 6:
            message.afxId = 6;
            break;
        case "VIAL_MARTIAN_DUST":
        case 7:
            message.afxId = 7;
            break;
        case "ORNATE_GUSSET":
        case 8:
            message.afxId = 8;
            break;
        case "THE_CHALICE":
        case 9:
            message.afxId = 9;
            break;
        case "BOOK_OF_BASAN":
        case 10:
            message.afxId = 10;
            break;
        case "PHOENIX_FEATHER":
        case 11:
            message.afxId = 11;
            break;
        case "TUNGSTEN_ANKH":
        case 12:
            message.afxId = 12;
            break;
        case "AURELIAN_BROOCH":
        case 21:
            message.afxId = 21;
            break;
        case "CARVED_RAINSTICK":
        case 22:
            message.afxId = 22;
            break;
        case "PUZZLE_CUBE":
        case 23:
            message.afxId = 23;
            break;
        case "QUANTUM_METRONOME":
        case 24:
            message.afxId = 24;
            break;
        case "SHIP_IN_A_BOTTLE":
        case 25:
            message.afxId = 25;
            break;
        case "TACHYON_DEFLECTOR":
        case 26:
            message.afxId = 26;
            break;
        case "INTERSTELLAR_COMPASS":
        case 27:
            message.afxId = 27;
            break;
        case "DILITHIUM_MONOCLE":
        case 28:
            message.afxId = 28;
            break;
        case "TITANIUM_ACTUATOR":
        case 29:
            message.afxId = 29;
            break;
        case "MERCURYS_LENS":
        case 30:
            message.afxId = 30;
            break;
        case "TACHYON_STONE":
        case 1:
            message.afxId = 1;
            break;
        case "DILITHIUM_STONE":
        case 31:
            message.afxId = 31;
            break;
        case "SHELL_STONE":
        case 32:
            message.afxId = 32;
            break;
        case "LUNAR_STONE":
        case 33:
            message.afxId = 33;
            break;
        case "SOUL_STONE":
        case 34:
            message.afxId = 34;
            break;
        case "PROPHECY_STONE":
        case 39:
            message.afxId = 39;
            break;
        case "QUANTUM_STONE":
        case 36:
            message.afxId = 36;
            break;
        case "TERRA_STONE":
        case 37:
            message.afxId = 37;
            break;
        case "LIFE_STONE":
        case 38:
            message.afxId = 38;
            break;
        case "CLARITY_STONE":
        case 40:
            message.afxId = 40;
            break;
        case "EXTRATERRESTRIAL_ALUMINUM":
        case 13:
            message.afxId = 13;
            break;
        case "ANCIENT_TUNGSTEN":
        case 14:
            message.afxId = 14;
            break;
        case "SPACE_ROCKS":
        case 15:
            message.afxId = 15;
            break;
        case "ALIEN_WOOD":
        case 16:
            message.afxId = 16;
            break;
        case "GOLD_METEORITE":
        case 17:
            message.afxId = 17;
            break;
        case "TAU_CETI_GEODE":
        case 18:
            message.afxId = 18;
            break;
        case "CENTAURIAN_STEEL":
        case 19:
            message.afxId = 19;
            break;
        case "ERIDANI_FEATHER":
        case 20:
            message.afxId = 20;
            break;
        case "DRONE_PARTS":
        case 35:
            message.afxId = 35;
            break;
        case "CELESTIAL_BRONZE":
        case 41:
            message.afxId = 41;
            break;
        case "LALANDE_HIDE":
        case 42:
            message.afxId = 42;
            break;
        case "SOLAR_TITANIUM":
        case 43:
            message.afxId = 43;
            break;
        case "TACHYON_STONE_FRAGMENT":
        case 2:
            message.afxId = 2;
            break;
        case "DILITHIUM_STONE_FRAGMENT":
        case 44:
            message.afxId = 44;
            break;
        case "SHELL_STONE_FRAGMENT":
        case 45:
            message.afxId = 45;
            break;
        case "LUNAR_STONE_FRAGMENT":
        case 46:
            message.afxId = 46;
            break;
        case "SOUL_STONE_FRAGMENT":
        case 47:
            message.afxId = 47;
            break;
        case "PROPHECY_STONE_FRAGMENT":
        case 48:
            message.afxId = 48;
            break;
        case "QUANTUM_STONE_FRAGMENT":
        case 49:
            message.afxId = 49;
            break;
        case "TERRA_STONE_FRAGMENT":
        case 50:
            message.afxId = 50;
            break;
        case "LIFE_STONE_FRAGMENT":
        case 51:
            message.afxId = 51;
            break;
        case "CLARITY_STONE_FRAGMENT":
        case 52:
            message.afxId = 52;
            break;
        case "UNKNOWN":
        case 10000:
            message.afxId = 10000;
            break;
        }
        switch (object.afxLevel) {
        case "INFERIOR":
        case 0:
            message.afxLevel = 0;
            break;
        case "LESSER":
        case 1:
            message.afxLevel = 1;
            break;
        case "NORMAL":
        case 2:
            message.afxLevel = 2;
            break;
        case "GREATER":
        case 3:
            message.afxLevel = 3;
            break;
        case "SUPERIOR":
        case 4:
            message.afxLevel = 4;
            break;
        }
        switch (object.afxRarity) {
        case "COMMON":
        case 0:
            message.afxRarity = 0;
            break;
        case "RARE":
        case 1:
            message.afxRarity = 1;
            break;
        case "EPIC":
        case 2:
            message.afxRarity = 2;
            break;
        case "LEGENDARY":
        case 3:
            message.afxRarity = 3;
            break;
        }
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
        if (object.isEmpty != null)
            message.isEmpty = Boolean(object.isEmpty);
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
            object.afxId = options.enums === String ? "LUNAR_TOTEM" : 0;
            object.afxLevel = options.enums === String ? "INFERIOR" : 0;
            object.afxRarity = options.enums === String ? "COMMON" : 0;
            object.isEmpty = false;
        }
        if (message.afxId != null && message.hasOwnProperty("afxId"))
            object.afxId = options.enums === String ? $root.ArtifactSpec.Name[message.afxId] : message.afxId;
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            object.afxLevel = options.enums === String ? $root.ArtifactSpec.Level[message.afxLevel] : message.afxLevel;
        if (message.afxRarity != null && message.hasOwnProperty("afxRarity"))
            object.afxRarity = options.enums === String ? $root.ArtifactSpec.Rarity[message.afxRarity] : message.afxRarity;
        if (message.stones && message.stones.length) {
            object.stones = [];
            for (let j = 0; j < message.stones.length; ++j)
                object.stones[j] = $root.Stone.toObject(message.stones[j], options);
        }
        if (message.isEmpty != null && message.hasOwnProperty("isEmpty"))
            object.isEmpty = message.isEmpty;
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

    return Artifact;
})();

export const Stone = $root.Stone = (() => {

    /**
     * Properties of a Stone.
     * @exports IStone
     * @interface IStone
     * @property {ArtifactSpec.Name|null} [afxId] Stone afxId
     * @property {ArtifactSpec.Level|null} [afxLevel] Stone afxLevel
     * @property {boolean|null} [isEmpty] Stone isEmpty
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
     * @member {ArtifactSpec.Name} afxId
     * @memberof Stone
     * @instance
     */
    Stone.prototype.afxId = 0;

    /**
     * Stone afxLevel.
     * @member {ArtifactSpec.Level} afxLevel
     * @memberof Stone
     * @instance
     */
    Stone.prototype.afxLevel = 0;

    /**
     * Stone isEmpty.
     * @member {boolean} isEmpty
     * @memberof Stone
     * @instance
     */
    Stone.prototype.isEmpty = false;

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
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.afxId);
        if (message.afxLevel != null && Object.hasOwnProperty.call(message, "afxLevel"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.afxLevel);
        if (message.isEmpty != null && Object.hasOwnProperty.call(message, "isEmpty"))
            writer.uint32(/* id 10, wireType 0 =*/80).bool(message.isEmpty);
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
            case 1:
                message.afxId = reader.int32();
                break;
            case 2:
                message.afxLevel = reader.int32();
                break;
            case 10:
                message.isEmpty = reader.bool();
                break;
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
            switch (message.afxId) {
            default:
                return "afxId: enum value expected";
            case 0:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 21:
            case 22:
            case 23:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 29:
            case 30:
            case 1:
            case 31:
            case 32:
            case 33:
            case 34:
            case 39:
            case 36:
            case 37:
            case 38:
            case 40:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 35:
            case 41:
            case 42:
            case 43:
            case 2:
            case 44:
            case 45:
            case 46:
            case 47:
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 10000:
                break;
            }
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            switch (message.afxLevel) {
            default:
                return "afxLevel: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
                break;
            }
        if (message.isEmpty != null && message.hasOwnProperty("isEmpty"))
            if (typeof message.isEmpty !== "boolean")
                return "isEmpty: boolean expected";
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
        switch (object.afxId) {
        case "LUNAR_TOTEM":
        case 0:
            message.afxId = 0;
            break;
        case "NEODYMIUM_MEDALLION":
        case 3:
            message.afxId = 3;
            break;
        case "BEAK_OF_MIDAS":
        case 4:
            message.afxId = 4;
            break;
        case "LIGHT_OF_EGGENDIL":
        case 5:
            message.afxId = 5;
            break;
        case "DEMETERS_NECKLACE":
        case 6:
            message.afxId = 6;
            break;
        case "VIAL_MARTIAN_DUST":
        case 7:
            message.afxId = 7;
            break;
        case "ORNATE_GUSSET":
        case 8:
            message.afxId = 8;
            break;
        case "THE_CHALICE":
        case 9:
            message.afxId = 9;
            break;
        case "BOOK_OF_BASAN":
        case 10:
            message.afxId = 10;
            break;
        case "PHOENIX_FEATHER":
        case 11:
            message.afxId = 11;
            break;
        case "TUNGSTEN_ANKH":
        case 12:
            message.afxId = 12;
            break;
        case "AURELIAN_BROOCH":
        case 21:
            message.afxId = 21;
            break;
        case "CARVED_RAINSTICK":
        case 22:
            message.afxId = 22;
            break;
        case "PUZZLE_CUBE":
        case 23:
            message.afxId = 23;
            break;
        case "QUANTUM_METRONOME":
        case 24:
            message.afxId = 24;
            break;
        case "SHIP_IN_A_BOTTLE":
        case 25:
            message.afxId = 25;
            break;
        case "TACHYON_DEFLECTOR":
        case 26:
            message.afxId = 26;
            break;
        case "INTERSTELLAR_COMPASS":
        case 27:
            message.afxId = 27;
            break;
        case "DILITHIUM_MONOCLE":
        case 28:
            message.afxId = 28;
            break;
        case "TITANIUM_ACTUATOR":
        case 29:
            message.afxId = 29;
            break;
        case "MERCURYS_LENS":
        case 30:
            message.afxId = 30;
            break;
        case "TACHYON_STONE":
        case 1:
            message.afxId = 1;
            break;
        case "DILITHIUM_STONE":
        case 31:
            message.afxId = 31;
            break;
        case "SHELL_STONE":
        case 32:
            message.afxId = 32;
            break;
        case "LUNAR_STONE":
        case 33:
            message.afxId = 33;
            break;
        case "SOUL_STONE":
        case 34:
            message.afxId = 34;
            break;
        case "PROPHECY_STONE":
        case 39:
            message.afxId = 39;
            break;
        case "QUANTUM_STONE":
        case 36:
            message.afxId = 36;
            break;
        case "TERRA_STONE":
        case 37:
            message.afxId = 37;
            break;
        case "LIFE_STONE":
        case 38:
            message.afxId = 38;
            break;
        case "CLARITY_STONE":
        case 40:
            message.afxId = 40;
            break;
        case "EXTRATERRESTRIAL_ALUMINUM":
        case 13:
            message.afxId = 13;
            break;
        case "ANCIENT_TUNGSTEN":
        case 14:
            message.afxId = 14;
            break;
        case "SPACE_ROCKS":
        case 15:
            message.afxId = 15;
            break;
        case "ALIEN_WOOD":
        case 16:
            message.afxId = 16;
            break;
        case "GOLD_METEORITE":
        case 17:
            message.afxId = 17;
            break;
        case "TAU_CETI_GEODE":
        case 18:
            message.afxId = 18;
            break;
        case "CENTAURIAN_STEEL":
        case 19:
            message.afxId = 19;
            break;
        case "ERIDANI_FEATHER":
        case 20:
            message.afxId = 20;
            break;
        case "DRONE_PARTS":
        case 35:
            message.afxId = 35;
            break;
        case "CELESTIAL_BRONZE":
        case 41:
            message.afxId = 41;
            break;
        case "LALANDE_HIDE":
        case 42:
            message.afxId = 42;
            break;
        case "SOLAR_TITANIUM":
        case 43:
            message.afxId = 43;
            break;
        case "TACHYON_STONE_FRAGMENT":
        case 2:
            message.afxId = 2;
            break;
        case "DILITHIUM_STONE_FRAGMENT":
        case 44:
            message.afxId = 44;
            break;
        case "SHELL_STONE_FRAGMENT":
        case 45:
            message.afxId = 45;
            break;
        case "LUNAR_STONE_FRAGMENT":
        case 46:
            message.afxId = 46;
            break;
        case "SOUL_STONE_FRAGMENT":
        case 47:
            message.afxId = 47;
            break;
        case "PROPHECY_STONE_FRAGMENT":
        case 48:
            message.afxId = 48;
            break;
        case "QUANTUM_STONE_FRAGMENT":
        case 49:
            message.afxId = 49;
            break;
        case "TERRA_STONE_FRAGMENT":
        case 50:
            message.afxId = 50;
            break;
        case "LIFE_STONE_FRAGMENT":
        case 51:
            message.afxId = 51;
            break;
        case "CLARITY_STONE_FRAGMENT":
        case 52:
            message.afxId = 52;
            break;
        case "UNKNOWN":
        case 10000:
            message.afxId = 10000;
            break;
        }
        switch (object.afxLevel) {
        case "INFERIOR":
        case 0:
            message.afxLevel = 0;
            break;
        case "LESSER":
        case 1:
            message.afxLevel = 1;
            break;
        case "NORMAL":
        case 2:
            message.afxLevel = 2;
            break;
        case "GREATER":
        case 3:
            message.afxLevel = 3;
            break;
        case "SUPERIOR":
        case 4:
            message.afxLevel = 4;
            break;
        }
        if (object.isEmpty != null)
            message.isEmpty = Boolean(object.isEmpty);
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
            object.afxId = options.enums === String ? "LUNAR_TOTEM" : 0;
            object.afxLevel = options.enums === String ? "INFERIOR" : 0;
            object.isEmpty = false;
        }
        if (message.afxId != null && message.hasOwnProperty("afxId"))
            object.afxId = options.enums === String ? $root.ArtifactSpec.Name[message.afxId] : message.afxId;
        if (message.afxLevel != null && message.hasOwnProperty("afxLevel"))
            object.afxLevel = options.enums === String ? $root.ArtifactSpec.Level[message.afxLevel] : message.afxLevel;
        if (message.isEmpty != null && message.hasOwnProperty("isEmpty"))
            object.isEmpty = message.isEmpty;
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

    return Stone;
})();

export const Config = $root.Config = (() => {

    /**
     * Properties of a Config.
     * @exports IConfig
     * @interface IConfig
     * @property {number|null} [prophecyEggs] Config prophecyEggs
     * @property {number|null} [soulEggs] Config soulEggs
     * @property {string|null} [soulEggsInput] Config soulEggsInput
     * @property {boolean|null} [isEnlightenment] Config isEnlightenment
     * @property {number|null} [missingSoulFood] Config missingSoulFood
     * @property {number|null} [missingProphecyBonus] Config missingProphecyBonus
     * @property {boolean|null} [birdFeedActive] Config birdFeedActive
     * @property {boolean|null} [tachyonPrismActive] Config tachyonPrismActive
     * @property {boolean|null} [soulBeaconActive] Config soulBeaconActive
     * @property {boolean|null} [boostBeaconActive] Config boostBeaconActive
     * @property {number|null} [tachyonDeflectorBonus] Config tachyonDeflectorBonus
     */

    /**
     * Constructs a new Config.
     * @exports Config
     * @classdesc Represents a Config.
     * @implements IConfig
     * @constructor
     * @param {IConfig=} [properties] Properties to set
     */
    function Config(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Config prophecyEggs.
     * @member {number} prophecyEggs
     * @memberof Config
     * @instance
     */
    Config.prototype.prophecyEggs = 0;

    /**
     * Config soulEggs.
     * @member {number} soulEggs
     * @memberof Config
     * @instance
     */
    Config.prototype.soulEggs = 0;

    /**
     * Config soulEggsInput.
     * @member {string} soulEggsInput
     * @memberof Config
     * @instance
     */
    Config.prototype.soulEggsInput = "";

    /**
     * Config isEnlightenment.
     * @member {boolean} isEnlightenment
     * @memberof Config
     * @instance
     */
    Config.prototype.isEnlightenment = false;

    /**
     * Config missingSoulFood.
     * @member {number} missingSoulFood
     * @memberof Config
     * @instance
     */
    Config.prototype.missingSoulFood = 0;

    /**
     * Config missingProphecyBonus.
     * @member {number} missingProphecyBonus
     * @memberof Config
     * @instance
     */
    Config.prototype.missingProphecyBonus = 0;

    /**
     * Config birdFeedActive.
     * @member {boolean} birdFeedActive
     * @memberof Config
     * @instance
     */
    Config.prototype.birdFeedActive = false;

    /**
     * Config tachyonPrismActive.
     * @member {boolean} tachyonPrismActive
     * @memberof Config
     * @instance
     */
    Config.prototype.tachyonPrismActive = false;

    /**
     * Config soulBeaconActive.
     * @member {boolean} soulBeaconActive
     * @memberof Config
     * @instance
     */
    Config.prototype.soulBeaconActive = false;

    /**
     * Config boostBeaconActive.
     * @member {boolean} boostBeaconActive
     * @memberof Config
     * @instance
     */
    Config.prototype.boostBeaconActive = false;

    /**
     * Config tachyonDeflectorBonus.
     * @member {number} tachyonDeflectorBonus
     * @memberof Config
     * @instance
     */
    Config.prototype.tachyonDeflectorBonus = 0;

    /**
     * Creates a new Config instance using the specified properties.
     * @function create
     * @memberof Config
     * @static
     * @param {IConfig=} [properties] Properties to set
     * @returns {Config} Config instance
     */
    Config.create = function create(properties) {
        return new Config(properties);
    };

    /**
     * Encodes the specified Config message. Does not implicitly {@link Config.verify|verify} messages.
     * @function encode
     * @memberof Config
     * @static
     * @param {IConfig} message Config message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Config.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.prophecyEggs != null && Object.hasOwnProperty.call(message, "prophecyEggs"))
            writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.prophecyEggs);
        if (message.soulEggs != null && Object.hasOwnProperty.call(message, "soulEggs"))
            writer.uint32(/* id 2, wireType 1 =*/17).double(message.soulEggs);
        if (message.soulEggsInput != null && Object.hasOwnProperty.call(message, "soulEggsInput"))
            writer.uint32(/* id 3, wireType 2 =*/26).string(message.soulEggsInput);
        if (message.isEnlightenment != null && Object.hasOwnProperty.call(message, "isEnlightenment"))
            writer.uint32(/* id 4, wireType 0 =*/32).bool(message.isEnlightenment);
        if (message.birdFeedActive != null && Object.hasOwnProperty.call(message, "birdFeedActive"))
            writer.uint32(/* id 10, wireType 0 =*/80).bool(message.birdFeedActive);
        if (message.tachyonPrismActive != null && Object.hasOwnProperty.call(message, "tachyonPrismActive"))
            writer.uint32(/* id 11, wireType 0 =*/88).bool(message.tachyonPrismActive);
        if (message.soulBeaconActive != null && Object.hasOwnProperty.call(message, "soulBeaconActive"))
            writer.uint32(/* id 12, wireType 0 =*/96).bool(message.soulBeaconActive);
        if (message.boostBeaconActive != null && Object.hasOwnProperty.call(message, "boostBeaconActive"))
            writer.uint32(/* id 13, wireType 0 =*/104).bool(message.boostBeaconActive);
        if (message.tachyonDeflectorBonus != null && Object.hasOwnProperty.call(message, "tachyonDeflectorBonus"))
            writer.uint32(/* id 14, wireType 1 =*/113).double(message.tachyonDeflectorBonus);
        if (message.missingSoulFood != null && Object.hasOwnProperty.call(message, "missingSoulFood"))
            writer.uint32(/* id 20, wireType 0 =*/160).uint32(message.missingSoulFood);
        if (message.missingProphecyBonus != null && Object.hasOwnProperty.call(message, "missingProphecyBonus"))
            writer.uint32(/* id 21, wireType 0 =*/168).uint32(message.missingProphecyBonus);
        return writer;
    };

    /**
     * Encodes the specified Config message, length delimited. Does not implicitly {@link Config.verify|verify} messages.
     * @function encodeDelimited
     * @memberof Config
     * @static
     * @param {IConfig} message Config message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Config.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes a Config message from the specified reader or buffer.
     * @function decode
     * @memberof Config
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Config} Config
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Config.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Config();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.prophecyEggs = reader.uint32();
                break;
            case 2:
                message.soulEggs = reader.double();
                break;
            case 3:
                message.soulEggsInput = reader.string();
                break;
            case 4:
                message.isEnlightenment = reader.bool();
                break;
            case 20:
                message.missingSoulFood = reader.uint32();
                break;
            case 21:
                message.missingProphecyBonus = reader.uint32();
                break;
            case 10:
                message.birdFeedActive = reader.bool();
                break;
            case 11:
                message.tachyonPrismActive = reader.bool();
                break;
            case 12:
                message.soulBeaconActive = reader.bool();
                break;
            case 13:
                message.boostBeaconActive = reader.bool();
                break;
            case 14:
                message.tachyonDeflectorBonus = reader.double();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes a Config message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof Config
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {Config} Config
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Config.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies a Config message.
     * @function verify
     * @memberof Config
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    Config.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.prophecyEggs != null && message.hasOwnProperty("prophecyEggs"))
            if (!$util.isInteger(message.prophecyEggs))
                return "prophecyEggs: integer expected";
        if (message.soulEggs != null && message.hasOwnProperty("soulEggs"))
            if (typeof message.soulEggs !== "number")
                return "soulEggs: number expected";
        if (message.soulEggsInput != null && message.hasOwnProperty("soulEggsInput"))
            if (!$util.isString(message.soulEggsInput))
                return "soulEggsInput: string expected";
        if (message.isEnlightenment != null && message.hasOwnProperty("isEnlightenment"))
            if (typeof message.isEnlightenment !== "boolean")
                return "isEnlightenment: boolean expected";
        if (message.missingSoulFood != null && message.hasOwnProperty("missingSoulFood"))
            if (!$util.isInteger(message.missingSoulFood))
                return "missingSoulFood: integer expected";
        if (message.missingProphecyBonus != null && message.hasOwnProperty("missingProphecyBonus"))
            if (!$util.isInteger(message.missingProphecyBonus))
                return "missingProphecyBonus: integer expected";
        if (message.birdFeedActive != null && message.hasOwnProperty("birdFeedActive"))
            if (typeof message.birdFeedActive !== "boolean")
                return "birdFeedActive: boolean expected";
        if (message.tachyonPrismActive != null && message.hasOwnProperty("tachyonPrismActive"))
            if (typeof message.tachyonPrismActive !== "boolean")
                return "tachyonPrismActive: boolean expected";
        if (message.soulBeaconActive != null && message.hasOwnProperty("soulBeaconActive"))
            if (typeof message.soulBeaconActive !== "boolean")
                return "soulBeaconActive: boolean expected";
        if (message.boostBeaconActive != null && message.hasOwnProperty("boostBeaconActive"))
            if (typeof message.boostBeaconActive !== "boolean")
                return "boostBeaconActive: boolean expected";
        if (message.tachyonDeflectorBonus != null && message.hasOwnProperty("tachyonDeflectorBonus"))
            if (typeof message.tachyonDeflectorBonus !== "number")
                return "tachyonDeflectorBonus: number expected";
        return null;
    };

    /**
     * Creates a Config message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof Config
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {Config} Config
     */
    Config.fromObject = function fromObject(object) {
        if (object instanceof $root.Config)
            return object;
        let message = new $root.Config();
        if (object.prophecyEggs != null)
            message.prophecyEggs = object.prophecyEggs >>> 0;
        if (object.soulEggs != null)
            message.soulEggs = Number(object.soulEggs);
        if (object.soulEggsInput != null)
            message.soulEggsInput = String(object.soulEggsInput);
        if (object.isEnlightenment != null)
            message.isEnlightenment = Boolean(object.isEnlightenment);
        if (object.missingSoulFood != null)
            message.missingSoulFood = object.missingSoulFood >>> 0;
        if (object.missingProphecyBonus != null)
            message.missingProphecyBonus = object.missingProphecyBonus >>> 0;
        if (object.birdFeedActive != null)
            message.birdFeedActive = Boolean(object.birdFeedActive);
        if (object.tachyonPrismActive != null)
            message.tachyonPrismActive = Boolean(object.tachyonPrismActive);
        if (object.soulBeaconActive != null)
            message.soulBeaconActive = Boolean(object.soulBeaconActive);
        if (object.boostBeaconActive != null)
            message.boostBeaconActive = Boolean(object.boostBeaconActive);
        if (object.tachyonDeflectorBonus != null)
            message.tachyonDeflectorBonus = Number(object.tachyonDeflectorBonus);
        return message;
    };

    /**
     * Creates a plain object from a Config message. Also converts values to other types if specified.
     * @function toObject
     * @memberof Config
     * @static
     * @param {Config} message Config
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    Config.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.prophecyEggs = 0;
            object.soulEggs = 0;
            object.soulEggsInput = "";
            object.isEnlightenment = false;
            object.birdFeedActive = false;
            object.tachyonPrismActive = false;
            object.soulBeaconActive = false;
            object.boostBeaconActive = false;
            object.tachyonDeflectorBonus = 0;
            object.missingSoulFood = 0;
            object.missingProphecyBonus = 0;
        }
        if (message.prophecyEggs != null && message.hasOwnProperty("prophecyEggs"))
            object.prophecyEggs = message.prophecyEggs;
        if (message.soulEggs != null && message.hasOwnProperty("soulEggs"))
            object.soulEggs = options.json && !isFinite(message.soulEggs) ? String(message.soulEggs) : message.soulEggs;
        if (message.soulEggsInput != null && message.hasOwnProperty("soulEggsInput"))
            object.soulEggsInput = message.soulEggsInput;
        if (message.isEnlightenment != null && message.hasOwnProperty("isEnlightenment"))
            object.isEnlightenment = message.isEnlightenment;
        if (message.birdFeedActive != null && message.hasOwnProperty("birdFeedActive"))
            object.birdFeedActive = message.birdFeedActive;
        if (message.tachyonPrismActive != null && message.hasOwnProperty("tachyonPrismActive"))
            object.tachyonPrismActive = message.tachyonPrismActive;
        if (message.soulBeaconActive != null && message.hasOwnProperty("soulBeaconActive"))
            object.soulBeaconActive = message.soulBeaconActive;
        if (message.boostBeaconActive != null && message.hasOwnProperty("boostBeaconActive"))
            object.boostBeaconActive = message.boostBeaconActive;
        if (message.tachyonDeflectorBonus != null && message.hasOwnProperty("tachyonDeflectorBonus"))
            object.tachyonDeflectorBonus = options.json && !isFinite(message.tachyonDeflectorBonus) ? String(message.tachyonDeflectorBonus) : message.tachyonDeflectorBonus;
        if (message.missingSoulFood != null && message.hasOwnProperty("missingSoulFood"))
            object.missingSoulFood = message.missingSoulFood;
        if (message.missingProphecyBonus != null && message.hasOwnProperty("missingProphecyBonus"))
            object.missingProphecyBonus = message.missingProphecyBonus;
        return object;
    };

    /**
     * Converts this Config to JSON.
     * @function toJSON
     * @memberof Config
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    Config.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    return Config;
})();

export const ArtifactSpec = $root.ArtifactSpec = (() => {

    /**
     * Properties of an ArtifactSpec.
     * @exports IArtifactSpec
     * @interface IArtifactSpec
     * @property {ArtifactSpec.Name|null} [name] ArtifactSpec name
     * @property {ArtifactSpec.Level|null} [level] ArtifactSpec level
     * @property {ArtifactSpec.Rarity|null} [rarity] ArtifactSpec rarity
     * @property {Egg|null} [egg] ArtifactSpec egg
     */

    /**
     * Constructs a new ArtifactSpec.
     * @exports ArtifactSpec
     * @classdesc Represents an ArtifactSpec.
     * @implements IArtifactSpec
     * @constructor
     * @param {IArtifactSpec=} [properties] Properties to set
     */
    function ArtifactSpec(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * ArtifactSpec name.
     * @member {ArtifactSpec.Name} name
     * @memberof ArtifactSpec
     * @instance
     */
    ArtifactSpec.prototype.name = 0;

    /**
     * ArtifactSpec level.
     * @member {ArtifactSpec.Level} level
     * @memberof ArtifactSpec
     * @instance
     */
    ArtifactSpec.prototype.level = 0;

    /**
     * ArtifactSpec rarity.
     * @member {ArtifactSpec.Rarity} rarity
     * @memberof ArtifactSpec
     * @instance
     */
    ArtifactSpec.prototype.rarity = 0;

    /**
     * ArtifactSpec egg.
     * @member {Egg} egg
     * @memberof ArtifactSpec
     * @instance
     */
    ArtifactSpec.prototype.egg = 0;

    /**
     * Creates a new ArtifactSpec instance using the specified properties.
     * @function create
     * @memberof ArtifactSpec
     * @static
     * @param {IArtifactSpec=} [properties] Properties to set
     * @returns {ArtifactSpec} ArtifactSpec instance
     */
    ArtifactSpec.create = function create(properties) {
        return new ArtifactSpec(properties);
    };

    /**
     * Encodes the specified ArtifactSpec message. Does not implicitly {@link ArtifactSpec.verify|verify} messages.
     * @function encode
     * @memberof ArtifactSpec
     * @static
     * @param {IArtifactSpec} message ArtifactSpec message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ArtifactSpec.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.name != null && Object.hasOwnProperty.call(message, "name"))
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.name);
        if (message.level != null && Object.hasOwnProperty.call(message, "level"))
            writer.uint32(/* id 2, wireType 0 =*/16).int32(message.level);
        if (message.rarity != null && Object.hasOwnProperty.call(message, "rarity"))
            writer.uint32(/* id 3, wireType 0 =*/24).int32(message.rarity);
        if (message.egg != null && Object.hasOwnProperty.call(message, "egg"))
            writer.uint32(/* id 4, wireType 0 =*/32).int32(message.egg);
        return writer;
    };

    /**
     * Encodes the specified ArtifactSpec message, length delimited. Does not implicitly {@link ArtifactSpec.verify|verify} messages.
     * @function encodeDelimited
     * @memberof ArtifactSpec
     * @static
     * @param {IArtifactSpec} message ArtifactSpec message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    ArtifactSpec.encodeDelimited = function encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    };

    /**
     * Decodes an ArtifactSpec message from the specified reader or buffer.
     * @function decode
     * @memberof ArtifactSpec
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {ArtifactSpec} ArtifactSpec
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ArtifactSpec.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.ArtifactSpec();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 1:
                message.name = reader.int32();
                break;
            case 2:
                message.level = reader.int32();
                break;
            case 3:
                message.rarity = reader.int32();
                break;
            case 4:
                message.egg = reader.int32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    /**
     * Decodes an ArtifactSpec message from the specified reader or buffer, length delimited.
     * @function decodeDelimited
     * @memberof ArtifactSpec
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @returns {ArtifactSpec} ArtifactSpec
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    ArtifactSpec.decodeDelimited = function decodeDelimited(reader) {
        if (!(reader instanceof $Reader))
            reader = new $Reader(reader);
        return this.decode(reader, reader.uint32());
    };

    /**
     * Verifies an ArtifactSpec message.
     * @function verify
     * @memberof ArtifactSpec
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    ArtifactSpec.verify = function verify(message) {
        if (typeof message !== "object" || message === null)
            return "object expected";
        if (message.name != null && message.hasOwnProperty("name"))
            switch (message.name) {
            default:
                return "name: enum value expected";
            case 0:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 21:
            case 22:
            case 23:
            case 24:
            case 25:
            case 26:
            case 27:
            case 28:
            case 29:
            case 30:
            case 1:
            case 31:
            case 32:
            case 33:
            case 34:
            case 39:
            case 36:
            case 37:
            case 38:
            case 40:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 35:
            case 41:
            case 42:
            case 43:
            case 2:
            case 44:
            case 45:
            case 46:
            case 47:
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 10000:
                break;
            }
        if (message.level != null && message.hasOwnProperty("level"))
            switch (message.level) {
            default:
                return "level: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
                break;
            }
        if (message.rarity != null && message.hasOwnProperty("rarity"))
            switch (message.rarity) {
            default:
                return "rarity: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
                break;
            }
        if (message.egg != null && message.hasOwnProperty("egg"))
            switch (message.egg) {
            default:
                return "egg: enum value expected";
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 100:
            case 101:
            case 102:
            case 103:
            case 104:
            case 1000:
                break;
            }
        return null;
    };

    /**
     * Creates an ArtifactSpec message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof ArtifactSpec
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {ArtifactSpec} ArtifactSpec
     */
    ArtifactSpec.fromObject = function fromObject(object) {
        if (object instanceof $root.ArtifactSpec)
            return object;
        let message = new $root.ArtifactSpec();
        switch (object.name) {
        case "LUNAR_TOTEM":
        case 0:
            message.name = 0;
            break;
        case "NEODYMIUM_MEDALLION":
        case 3:
            message.name = 3;
            break;
        case "BEAK_OF_MIDAS":
        case 4:
            message.name = 4;
            break;
        case "LIGHT_OF_EGGENDIL":
        case 5:
            message.name = 5;
            break;
        case "DEMETERS_NECKLACE":
        case 6:
            message.name = 6;
            break;
        case "VIAL_MARTIAN_DUST":
        case 7:
            message.name = 7;
            break;
        case "ORNATE_GUSSET":
        case 8:
            message.name = 8;
            break;
        case "THE_CHALICE":
        case 9:
            message.name = 9;
            break;
        case "BOOK_OF_BASAN":
        case 10:
            message.name = 10;
            break;
        case "PHOENIX_FEATHER":
        case 11:
            message.name = 11;
            break;
        case "TUNGSTEN_ANKH":
        case 12:
            message.name = 12;
            break;
        case "AURELIAN_BROOCH":
        case 21:
            message.name = 21;
            break;
        case "CARVED_RAINSTICK":
        case 22:
            message.name = 22;
            break;
        case "PUZZLE_CUBE":
        case 23:
            message.name = 23;
            break;
        case "QUANTUM_METRONOME":
        case 24:
            message.name = 24;
            break;
        case "SHIP_IN_A_BOTTLE":
        case 25:
            message.name = 25;
            break;
        case "TACHYON_DEFLECTOR":
        case 26:
            message.name = 26;
            break;
        case "INTERSTELLAR_COMPASS":
        case 27:
            message.name = 27;
            break;
        case "DILITHIUM_MONOCLE":
        case 28:
            message.name = 28;
            break;
        case "TITANIUM_ACTUATOR":
        case 29:
            message.name = 29;
            break;
        case "MERCURYS_LENS":
        case 30:
            message.name = 30;
            break;
        case "TACHYON_STONE":
        case 1:
            message.name = 1;
            break;
        case "DILITHIUM_STONE":
        case 31:
            message.name = 31;
            break;
        case "SHELL_STONE":
        case 32:
            message.name = 32;
            break;
        case "LUNAR_STONE":
        case 33:
            message.name = 33;
            break;
        case "SOUL_STONE":
        case 34:
            message.name = 34;
            break;
        case "PROPHECY_STONE":
        case 39:
            message.name = 39;
            break;
        case "QUANTUM_STONE":
        case 36:
            message.name = 36;
            break;
        case "TERRA_STONE":
        case 37:
            message.name = 37;
            break;
        case "LIFE_STONE":
        case 38:
            message.name = 38;
            break;
        case "CLARITY_STONE":
        case 40:
            message.name = 40;
            break;
        case "EXTRATERRESTRIAL_ALUMINUM":
        case 13:
            message.name = 13;
            break;
        case "ANCIENT_TUNGSTEN":
        case 14:
            message.name = 14;
            break;
        case "SPACE_ROCKS":
        case 15:
            message.name = 15;
            break;
        case "ALIEN_WOOD":
        case 16:
            message.name = 16;
            break;
        case "GOLD_METEORITE":
        case 17:
            message.name = 17;
            break;
        case "TAU_CETI_GEODE":
        case 18:
            message.name = 18;
            break;
        case "CENTAURIAN_STEEL":
        case 19:
            message.name = 19;
            break;
        case "ERIDANI_FEATHER":
        case 20:
            message.name = 20;
            break;
        case "DRONE_PARTS":
        case 35:
            message.name = 35;
            break;
        case "CELESTIAL_BRONZE":
        case 41:
            message.name = 41;
            break;
        case "LALANDE_HIDE":
        case 42:
            message.name = 42;
            break;
        case "SOLAR_TITANIUM":
        case 43:
            message.name = 43;
            break;
        case "TACHYON_STONE_FRAGMENT":
        case 2:
            message.name = 2;
            break;
        case "DILITHIUM_STONE_FRAGMENT":
        case 44:
            message.name = 44;
            break;
        case "SHELL_STONE_FRAGMENT":
        case 45:
            message.name = 45;
            break;
        case "LUNAR_STONE_FRAGMENT":
        case 46:
            message.name = 46;
            break;
        case "SOUL_STONE_FRAGMENT":
        case 47:
            message.name = 47;
            break;
        case "PROPHECY_STONE_FRAGMENT":
        case 48:
            message.name = 48;
            break;
        case "QUANTUM_STONE_FRAGMENT":
        case 49:
            message.name = 49;
            break;
        case "TERRA_STONE_FRAGMENT":
        case 50:
            message.name = 50;
            break;
        case "LIFE_STONE_FRAGMENT":
        case 51:
            message.name = 51;
            break;
        case "CLARITY_STONE_FRAGMENT":
        case 52:
            message.name = 52;
            break;
        case "UNKNOWN":
        case 10000:
            message.name = 10000;
            break;
        }
        switch (object.level) {
        case "INFERIOR":
        case 0:
            message.level = 0;
            break;
        case "LESSER":
        case 1:
            message.level = 1;
            break;
        case "NORMAL":
        case 2:
            message.level = 2;
            break;
        case "GREATER":
        case 3:
            message.level = 3;
            break;
        case "SUPERIOR":
        case 4:
            message.level = 4;
            break;
        }
        switch (object.rarity) {
        case "COMMON":
        case 0:
            message.rarity = 0;
            break;
        case "RARE":
        case 1:
            message.rarity = 1;
            break;
        case "EPIC":
        case 2:
            message.rarity = 2;
            break;
        case "LEGENDARY":
        case 3:
            message.rarity = 3;
            break;
        }
        switch (object.egg) {
        case "INVALID_EGG":
        case 0:
            message.egg = 0;
            break;
        case "EDIBLE":
        case 1:
            message.egg = 1;
            break;
        case "SUPERFOOD":
        case 2:
            message.egg = 2;
            break;
        case "MEDICAL":
        case 3:
            message.egg = 3;
            break;
        case "ROCKET_FUEL":
        case 4:
            message.egg = 4;
            break;
        case "SUPER_MATERIAL":
        case 5:
            message.egg = 5;
            break;
        case "FUSION":
        case 6:
            message.egg = 6;
            break;
        case "QUANTUM":
        case 7:
            message.egg = 7;
            break;
        case "IMMORTALITY":
        case 8:
            message.egg = 8;
            break;
        case "TACHYON":
        case 9:
            message.egg = 9;
            break;
        case "GRAVITON":
        case 10:
            message.egg = 10;
            break;
        case "DILITHIUM":
        case 11:
            message.egg = 11;
            break;
        case "PRODIGY":
        case 12:
            message.egg = 12;
            break;
        case "TERRAFORM":
        case 13:
            message.egg = 13;
            break;
        case "ANTIMATTER":
        case 14:
            message.egg = 14;
            break;
        case "DARK_MATTER":
        case 15:
            message.egg = 15;
            break;
        case "AI":
        case 16:
            message.egg = 16;
            break;
        case "NEBULA":
        case 17:
            message.egg = 17;
            break;
        case "UNIVERSE":
        case 18:
            message.egg = 18;
            break;
        case "ENLIGHTENMENT":
        case 19:
            message.egg = 19;
            break;
        case "CHOCOLATE":
        case 100:
            message.egg = 100;
            break;
        case "EASTER":
        case 101:
            message.egg = 101;
            break;
        case "WATERBALLOON":
        case 102:
            message.egg = 102;
            break;
        case "FIREWORK":
        case 103:
            message.egg = 103;
            break;
        case "PUMPKIN":
        case 104:
            message.egg = 104;
            break;
        case "UNKNOWN":
        case 1000:
            message.egg = 1000;
            break;
        }
        return message;
    };

    /**
     * Creates a plain object from an ArtifactSpec message. Also converts values to other types if specified.
     * @function toObject
     * @memberof ArtifactSpec
     * @static
     * @param {ArtifactSpec} message ArtifactSpec
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    ArtifactSpec.toObject = function toObject(message, options) {
        if (!options)
            options = {};
        let object = {};
        if (options.defaults) {
            object.name = options.enums === String ? "LUNAR_TOTEM" : 0;
            object.level = options.enums === String ? "INFERIOR" : 0;
            object.rarity = options.enums === String ? "COMMON" : 0;
            object.egg = options.enums === String ? "INVALID_EGG" : 0;
        }
        if (message.name != null && message.hasOwnProperty("name"))
            object.name = options.enums === String ? $root.ArtifactSpec.Name[message.name] : message.name;
        if (message.level != null && message.hasOwnProperty("level"))
            object.level = options.enums === String ? $root.ArtifactSpec.Level[message.level] : message.level;
        if (message.rarity != null && message.hasOwnProperty("rarity"))
            object.rarity = options.enums === String ? $root.ArtifactSpec.Rarity[message.rarity] : message.rarity;
        if (message.egg != null && message.hasOwnProperty("egg"))
            object.egg = options.enums === String ? $root.Egg[message.egg] : message.egg;
        return object;
    };

    /**
     * Converts this ArtifactSpec to JSON.
     * @function toJSON
     * @memberof ArtifactSpec
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    ArtifactSpec.prototype.toJSON = function toJSON() {
        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
    };

    /**
     * Name enum.
     * @name ArtifactSpec.Name
     * @enum {number}
     * @property {number} LUNAR_TOTEM=0 LUNAR_TOTEM value
     * @property {number} NEODYMIUM_MEDALLION=3 NEODYMIUM_MEDALLION value
     * @property {number} BEAK_OF_MIDAS=4 BEAK_OF_MIDAS value
     * @property {number} LIGHT_OF_EGGENDIL=5 LIGHT_OF_EGGENDIL value
     * @property {number} DEMETERS_NECKLACE=6 DEMETERS_NECKLACE value
     * @property {number} VIAL_MARTIAN_DUST=7 VIAL_MARTIAN_DUST value
     * @property {number} ORNATE_GUSSET=8 ORNATE_GUSSET value
     * @property {number} THE_CHALICE=9 THE_CHALICE value
     * @property {number} BOOK_OF_BASAN=10 BOOK_OF_BASAN value
     * @property {number} PHOENIX_FEATHER=11 PHOENIX_FEATHER value
     * @property {number} TUNGSTEN_ANKH=12 TUNGSTEN_ANKH value
     * @property {number} AURELIAN_BROOCH=21 AURELIAN_BROOCH value
     * @property {number} CARVED_RAINSTICK=22 CARVED_RAINSTICK value
     * @property {number} PUZZLE_CUBE=23 PUZZLE_CUBE value
     * @property {number} QUANTUM_METRONOME=24 QUANTUM_METRONOME value
     * @property {number} SHIP_IN_A_BOTTLE=25 SHIP_IN_A_BOTTLE value
     * @property {number} TACHYON_DEFLECTOR=26 TACHYON_DEFLECTOR value
     * @property {number} INTERSTELLAR_COMPASS=27 INTERSTELLAR_COMPASS value
     * @property {number} DILITHIUM_MONOCLE=28 DILITHIUM_MONOCLE value
     * @property {number} TITANIUM_ACTUATOR=29 TITANIUM_ACTUATOR value
     * @property {number} MERCURYS_LENS=30 MERCURYS_LENS value
     * @property {number} TACHYON_STONE=1 TACHYON_STONE value
     * @property {number} DILITHIUM_STONE=31 DILITHIUM_STONE value
     * @property {number} SHELL_STONE=32 SHELL_STONE value
     * @property {number} LUNAR_STONE=33 LUNAR_STONE value
     * @property {number} SOUL_STONE=34 SOUL_STONE value
     * @property {number} PROPHECY_STONE=39 PROPHECY_STONE value
     * @property {number} QUANTUM_STONE=36 QUANTUM_STONE value
     * @property {number} TERRA_STONE=37 TERRA_STONE value
     * @property {number} LIFE_STONE=38 LIFE_STONE value
     * @property {number} CLARITY_STONE=40 CLARITY_STONE value
     * @property {number} EXTRATERRESTRIAL_ALUMINUM=13 EXTRATERRESTRIAL_ALUMINUM value
     * @property {number} ANCIENT_TUNGSTEN=14 ANCIENT_TUNGSTEN value
     * @property {number} SPACE_ROCKS=15 SPACE_ROCKS value
     * @property {number} ALIEN_WOOD=16 ALIEN_WOOD value
     * @property {number} GOLD_METEORITE=17 GOLD_METEORITE value
     * @property {number} TAU_CETI_GEODE=18 TAU_CETI_GEODE value
     * @property {number} CENTAURIAN_STEEL=19 CENTAURIAN_STEEL value
     * @property {number} ERIDANI_FEATHER=20 ERIDANI_FEATHER value
     * @property {number} DRONE_PARTS=35 DRONE_PARTS value
     * @property {number} CELESTIAL_BRONZE=41 CELESTIAL_BRONZE value
     * @property {number} LALANDE_HIDE=42 LALANDE_HIDE value
     * @property {number} SOLAR_TITANIUM=43 SOLAR_TITANIUM value
     * @property {number} TACHYON_STONE_FRAGMENT=2 TACHYON_STONE_FRAGMENT value
     * @property {number} DILITHIUM_STONE_FRAGMENT=44 DILITHIUM_STONE_FRAGMENT value
     * @property {number} SHELL_STONE_FRAGMENT=45 SHELL_STONE_FRAGMENT value
     * @property {number} LUNAR_STONE_FRAGMENT=46 LUNAR_STONE_FRAGMENT value
     * @property {number} SOUL_STONE_FRAGMENT=47 SOUL_STONE_FRAGMENT value
     * @property {number} PROPHECY_STONE_FRAGMENT=48 PROPHECY_STONE_FRAGMENT value
     * @property {number} QUANTUM_STONE_FRAGMENT=49 QUANTUM_STONE_FRAGMENT value
     * @property {number} TERRA_STONE_FRAGMENT=50 TERRA_STONE_FRAGMENT value
     * @property {number} LIFE_STONE_FRAGMENT=51 LIFE_STONE_FRAGMENT value
     * @property {number} CLARITY_STONE_FRAGMENT=52 CLARITY_STONE_FRAGMENT value
     * @property {number} UNKNOWN=10000 UNKNOWN value
     */
    ArtifactSpec.Name = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "LUNAR_TOTEM"] = 0;
        values[valuesById[3] = "NEODYMIUM_MEDALLION"] = 3;
        values[valuesById[4] = "BEAK_OF_MIDAS"] = 4;
        values[valuesById[5] = "LIGHT_OF_EGGENDIL"] = 5;
        values[valuesById[6] = "DEMETERS_NECKLACE"] = 6;
        values[valuesById[7] = "VIAL_MARTIAN_DUST"] = 7;
        values[valuesById[8] = "ORNATE_GUSSET"] = 8;
        values[valuesById[9] = "THE_CHALICE"] = 9;
        values[valuesById[10] = "BOOK_OF_BASAN"] = 10;
        values[valuesById[11] = "PHOENIX_FEATHER"] = 11;
        values[valuesById[12] = "TUNGSTEN_ANKH"] = 12;
        values[valuesById[21] = "AURELIAN_BROOCH"] = 21;
        values[valuesById[22] = "CARVED_RAINSTICK"] = 22;
        values[valuesById[23] = "PUZZLE_CUBE"] = 23;
        values[valuesById[24] = "QUANTUM_METRONOME"] = 24;
        values[valuesById[25] = "SHIP_IN_A_BOTTLE"] = 25;
        values[valuesById[26] = "TACHYON_DEFLECTOR"] = 26;
        values[valuesById[27] = "INTERSTELLAR_COMPASS"] = 27;
        values[valuesById[28] = "DILITHIUM_MONOCLE"] = 28;
        values[valuesById[29] = "TITANIUM_ACTUATOR"] = 29;
        values[valuesById[30] = "MERCURYS_LENS"] = 30;
        values[valuesById[1] = "TACHYON_STONE"] = 1;
        values[valuesById[31] = "DILITHIUM_STONE"] = 31;
        values[valuesById[32] = "SHELL_STONE"] = 32;
        values[valuesById[33] = "LUNAR_STONE"] = 33;
        values[valuesById[34] = "SOUL_STONE"] = 34;
        values[valuesById[39] = "PROPHECY_STONE"] = 39;
        values[valuesById[36] = "QUANTUM_STONE"] = 36;
        values[valuesById[37] = "TERRA_STONE"] = 37;
        values[valuesById[38] = "LIFE_STONE"] = 38;
        values[valuesById[40] = "CLARITY_STONE"] = 40;
        values[valuesById[13] = "EXTRATERRESTRIAL_ALUMINUM"] = 13;
        values[valuesById[14] = "ANCIENT_TUNGSTEN"] = 14;
        values[valuesById[15] = "SPACE_ROCKS"] = 15;
        values[valuesById[16] = "ALIEN_WOOD"] = 16;
        values[valuesById[17] = "GOLD_METEORITE"] = 17;
        values[valuesById[18] = "TAU_CETI_GEODE"] = 18;
        values[valuesById[19] = "CENTAURIAN_STEEL"] = 19;
        values[valuesById[20] = "ERIDANI_FEATHER"] = 20;
        values[valuesById[35] = "DRONE_PARTS"] = 35;
        values[valuesById[41] = "CELESTIAL_BRONZE"] = 41;
        values[valuesById[42] = "LALANDE_HIDE"] = 42;
        values[valuesById[43] = "SOLAR_TITANIUM"] = 43;
        values[valuesById[2] = "TACHYON_STONE_FRAGMENT"] = 2;
        values[valuesById[44] = "DILITHIUM_STONE_FRAGMENT"] = 44;
        values[valuesById[45] = "SHELL_STONE_FRAGMENT"] = 45;
        values[valuesById[46] = "LUNAR_STONE_FRAGMENT"] = 46;
        values[valuesById[47] = "SOUL_STONE_FRAGMENT"] = 47;
        values[valuesById[48] = "PROPHECY_STONE_FRAGMENT"] = 48;
        values[valuesById[49] = "QUANTUM_STONE_FRAGMENT"] = 49;
        values[valuesById[50] = "TERRA_STONE_FRAGMENT"] = 50;
        values[valuesById[51] = "LIFE_STONE_FRAGMENT"] = 51;
        values[valuesById[52] = "CLARITY_STONE_FRAGMENT"] = 52;
        values[valuesById[10000] = "UNKNOWN"] = 10000;
        return values;
    })();

    /**
     * Level enum.
     * @name ArtifactSpec.Level
     * @enum {number}
     * @property {number} INFERIOR=0 INFERIOR value
     * @property {number} LESSER=1 LESSER value
     * @property {number} NORMAL=2 NORMAL value
     * @property {number} GREATER=3 GREATER value
     * @property {number} SUPERIOR=4 SUPERIOR value
     */
    ArtifactSpec.Level = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "INFERIOR"] = 0;
        values[valuesById[1] = "LESSER"] = 1;
        values[valuesById[2] = "NORMAL"] = 2;
        values[valuesById[3] = "GREATER"] = 3;
        values[valuesById[4] = "SUPERIOR"] = 4;
        return values;
    })();

    /**
     * Rarity enum.
     * @name ArtifactSpec.Rarity
     * @enum {number}
     * @property {number} COMMON=0 COMMON value
     * @property {number} RARE=1 RARE value
     * @property {number} EPIC=2 EPIC value
     * @property {number} LEGENDARY=3 LEGENDARY value
     */
    ArtifactSpec.Rarity = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "COMMON"] = 0;
        values[valuesById[1] = "RARE"] = 1;
        values[valuesById[2] = "EPIC"] = 2;
        values[valuesById[3] = "LEGENDARY"] = 3;
        return values;
    })();

    /**
     * Type enum.
     * @name ArtifactSpec.Type
     * @enum {number}
     * @property {number} ARTIFACT=0 ARTIFACT value
     * @property {number} STONE=1 STONE value
     * @property {number} INGREDIENT=2 INGREDIENT value
     * @property {number} STONE_INGREDIENT=3 STONE_INGREDIENT value
     */
    ArtifactSpec.Type = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ARTIFACT"] = 0;
        values[valuesById[1] = "STONE"] = 1;
        values[valuesById[2] = "INGREDIENT"] = 2;
        values[valuesById[3] = "STONE_INGREDIENT"] = 3;
        return values;
    })();

    return ArtifactSpec;
})();

/**
 * Egg enum.
 * @exports Egg
 * @enum {number}
 * @property {number} INVALID_EGG=0 INVALID_EGG value
 * @property {number} EDIBLE=1 EDIBLE value
 * @property {number} SUPERFOOD=2 SUPERFOOD value
 * @property {number} MEDICAL=3 MEDICAL value
 * @property {number} ROCKET_FUEL=4 ROCKET_FUEL value
 * @property {number} SUPER_MATERIAL=5 SUPER_MATERIAL value
 * @property {number} FUSION=6 FUSION value
 * @property {number} QUANTUM=7 QUANTUM value
 * @property {number} IMMORTALITY=8 IMMORTALITY value
 * @property {number} TACHYON=9 TACHYON value
 * @property {number} GRAVITON=10 GRAVITON value
 * @property {number} DILITHIUM=11 DILITHIUM value
 * @property {number} PRODIGY=12 PRODIGY value
 * @property {number} TERRAFORM=13 TERRAFORM value
 * @property {number} ANTIMATTER=14 ANTIMATTER value
 * @property {number} DARK_MATTER=15 DARK_MATTER value
 * @property {number} AI=16 AI value
 * @property {number} NEBULA=17 NEBULA value
 * @property {number} UNIVERSE=18 UNIVERSE value
 * @property {number} ENLIGHTENMENT=19 ENLIGHTENMENT value
 * @property {number} CHOCOLATE=100 CHOCOLATE value
 * @property {number} EASTER=101 EASTER value
 * @property {number} WATERBALLOON=102 WATERBALLOON value
 * @property {number} FIREWORK=103 FIREWORK value
 * @property {number} PUMPKIN=104 PUMPKIN value
 * @property {number} UNKNOWN=1000 UNKNOWN value
 */
export const Egg = $root.Egg = (() => {
    const valuesById = {}, values = Object.create(valuesById);
    values[valuesById[0] = "INVALID_EGG"] = 0;
    values[valuesById[1] = "EDIBLE"] = 1;
    values[valuesById[2] = "SUPERFOOD"] = 2;
    values[valuesById[3] = "MEDICAL"] = 3;
    values[valuesById[4] = "ROCKET_FUEL"] = 4;
    values[valuesById[5] = "SUPER_MATERIAL"] = 5;
    values[valuesById[6] = "FUSION"] = 6;
    values[valuesById[7] = "QUANTUM"] = 7;
    values[valuesById[8] = "IMMORTALITY"] = 8;
    values[valuesById[9] = "TACHYON"] = 9;
    values[valuesById[10] = "GRAVITON"] = 10;
    values[valuesById[11] = "DILITHIUM"] = 11;
    values[valuesById[12] = "PRODIGY"] = 12;
    values[valuesById[13] = "TERRAFORM"] = 13;
    values[valuesById[14] = "ANTIMATTER"] = 14;
    values[valuesById[15] = "DARK_MATTER"] = 15;
    values[valuesById[16] = "AI"] = 16;
    values[valuesById[17] = "NEBULA"] = 17;
    values[valuesById[18] = "UNIVERSE"] = 18;
    values[valuesById[19] = "ENLIGHTENMENT"] = 19;
    values[valuesById[100] = "CHOCOLATE"] = 100;
    values[valuesById[101] = "EASTER"] = 101;
    values[valuesById[102] = "WATERBALLOON"] = 102;
    values[valuesById[103] = "FIREWORK"] = 103;
    values[valuesById[104] = "PUMPKIN"] = 104;
    values[valuesById[1000] = "UNKNOWN"] = 1000;
    return values;
})();

export { $root as default };
