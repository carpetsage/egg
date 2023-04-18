import base64
from typing import TypeVar
import betterproto
import ei
import zlib

T = TypeVar("T", bound=betterproto.Message)

def encode(message: "betterproto.Message") -> str:
    return base64.b64encode(bytes(message)).decode('utf-8')

def decode(proto: T, encoded: bytes, authenticated = True) -> T:
    if authenticated:
      auth_msg = decode(ei.AuthenticatedMessage(),encoded, False)
      message = auth_msg.message if not auth_msg.compressed else zlib.decompress(auth_msg.message)
      return proto.parse(message)
    return proto.parse(base64.b64decode(encoded))
