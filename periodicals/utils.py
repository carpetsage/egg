import base64
import betterproto
import ei
import zlib

# Parse and decompress authenticaded message
def extractPayload(response: str) -> bytes:
    auth_msg = decode(ei.AuthenticatedMessage(),response)
    return zlib.decompress(auth_msg.message)

def encode(message: "betterproto.Message") -> str:
    return base64.b64encode(bytes(message)).decode('utf-8')

def decode(proto: "betterproto.Message", encoded: str) -> str:
    return proto.parse(base64.b64decode(encoded))
