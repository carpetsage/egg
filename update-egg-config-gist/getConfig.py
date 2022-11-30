#!/usr/bin/env python3
import requests
import ei_pb2
import base64
from google.protobuf.json_format import MessageToJson
import zlib

def extract_payload(resp: requests.Response) -> bytes:
    buf = base64.b64decode(resp.content)
    auth_msg = ei_pb2.AuthenticatedMessage().FromString(buf)

    res = zlib.decompress(auth_msg.message)
    return res

user_id = 'EI4834105282002944'

config_request = ei_pb2.ConfigRequest()
config_request.rinfo.ei_user_id = user_id
config_request.rinfo.client_version = 43
config_request.rinfo.version = '1.24.1'
config_request.rinfo.build = '1.24.1.0'
config_request.rinfo.platform = "IOS"

url = 'https://www.auxbrain.com/ei/get_config'
data = { 'data' : base64.b64encode(config_request.SerializeToString()).decode('utf-8') }
response = requests.post(url, data = data)

message = extract_payload(response)
#buf = base64.b64decode(response.text)
#authenticated_message = ei_pb2.AuthenticatedMessage().FromString(buf)
#if auth_msg.compressed == 1:
#  res = zlib.decompress(authenticated_message.message)
#  return res
#
#authenticated_message.ParseFromString(base64.b64decode(response.text))

config_response = ei_pb2.ConfigResponse()
config_response.ParseFromString(message)

print(MessageToJson(config_response))

