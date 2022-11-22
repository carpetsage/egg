#!/usr/bin/env python3
import subprocess
import ei_pb2
import base64

#rinfo = ei_pb2.BasicRequestInfo()
#config_request.rinfo = rinfo
config_request = ei_pb2.ConfigRequest()
config_request.rinfo.build = '1.25.3.0'
config_request.rinfo.client_version = 43
config_request.rinfo.ei_user_id = 'EI4552624608641024'
config_request.rinfo.platform = 'IOS'
config_request.rinfo.version = '1.25.3'

url = 'https://www.auxbrain.com/ei/get_config' 
#data = base64.b64encode(config_request.SerializeToString()).decode('utf-8')
data = 'Ci0KEkVJNDU1MjYyNDYwODY0MTAyNBAoGgYxLjI0LjMiCDEuMjQuMy4wKgNJT1M='
response = subprocess.run(["curl", "-s", "--data", data, url], capture_output=True).stdout.decode('utf-8')
print(response)
authenticated_message = ei_pb2.AuthenticatedMessage()
authenticated_message.ParseFromString(base64.b64decode(response))

config_response = ei_pb2.ConfigResponse()
config_response.ParseFromString(authenticated_message.message)

#print(config_response)
