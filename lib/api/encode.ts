import { ProtobufType } from './types';
import { uint8ArrayToBinaryString } from './utils';

/**
 * Encode message object as base64-encoded protobuf.
 * @param message - Message type, e.g. ei.ContractCoopStatusRequest.
 * @param messageObj - Plain object of payload to be encoded.
 * @param authenticated - Whether to encode as AuthenticatedMessage.
 * @returns
 * @throws Throws on encoding failure.
 */
export function encodeMessage(
  message: ProtobufType,
  messageObj: unknown,
  authenticated = false
): string {
  if (authenticated) {
    throw new Error(`Authenticated encoding not implemented.`);
  }

  try {
    const buf = message.encode(messageObj).finish();
    return btoa(uint8ArrayToBinaryString(buf));
  } catch (e) {
    throw new Error(`Encoding ${JSON.stringify(messageObj)}: ${e}.`);
  }
}
