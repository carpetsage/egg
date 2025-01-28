#!/usr/bin/env python3
import requests
import os
import ei_pb2
import base64
from google.protobuf.json_format import MessageToJson
import zlib

def extract_payload(resp: requests.Response) -> bytes:
    buf = base64.b64decode(resp.content)
    auth_msg = ei_pb2.AuthenticatedMessage().FromString(buf)

    res = zlib.decompress(auth_msg.message)
    return res

user_id = os.getenv('EI_USERID')

config_request = ei_pb2.ConfigRequest()
config_request.rinfo.ei_user_id        = user_id
config_request.rinfo.client_version    = 68
config_request.rinfo.version           = '1.34.1'
config_request.rinfo.build             = '111300'
config_request.rinfo.platform          = "IOS"

url = 'https://www.auxbrain.com/ei/get_config'
data = { 'data' : base64.b64encode(config_request.SerializeToString()).decode('utf-8') }
response = requests.post(url, data = data)

message = extract_payload(response)

config_response = ei_pb2.ConfigResponse()
config_response.ParseFromString(message)

print(MessageToJson(config_response))

