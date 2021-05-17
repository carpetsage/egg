import * as $protobuf from 'protobufjs/minimal';

export class ProtobufMessage {
  toJSON(): { [k: string]: any };
}

export class ProtobufType {
  encode(message: object, writer?: $protobuf.Writer): $protobuf.Writer;

  /**
   * @throws {Error} If the payload is not a reader or valid buffer
   * @throws {$protobuf.util.ProtocolError} If required fields are missing
   */
  decode(reader: $protobuf.Reader | Uint8Array, length?: number): ProtobufMessage;

  toObject(message: ProtobufMessage, options?: $protobuf.IConversionOptions): { [k: string]: any };
}
