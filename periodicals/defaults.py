import os
import ei

current_client_version = 999
client_version = 45
version = '1.25.4'
build = '111225'
platform = "IOS"
event_file = "data/events.json"
contract_file = "data/contracts.json"
# Get egg id from environment variable
user_id = os.environ.get('EI_USERID') or ""
url = 'https://www.auxbrain.com/ei/get_periodicals'

def rinfo() -> "ei.BasicRequestInfo":
    return ei.BasicRequestInfo(
            build          = build,
            client_version = client_version,
            ei_user_id     = user_id,
            platform       = platform,
            version        = version)
