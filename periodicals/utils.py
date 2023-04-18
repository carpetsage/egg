import base64
from typing import TypeVar
import betterproto
import ei
import zlib

T = TypeVar("T", bound=betterproto.Message)
# Parse and decompress authenticaded message
def extractPayload(response: str) -> bytes:
    auth_msg = decode(ei.AuthenticatedMessage(),response)
    return zlib.decompress(auth_msg.message)

def encode(message: "betterproto.Message") -> str:
    return base64.b64encode(bytes(message)).decode('utf-8')

def decode(proto: T, encoded: str) -> T:
    return proto.parse(base64.b64decode(encoded))
