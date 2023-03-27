import requests
import json
import os
import ei_pb2 as ei
import base64
import zlib
import google.protobuf.json_format as json_format
from google.protobuf.json_format import MessageToJson
from google.protobuf.json_format import MessageToDict

# event object formatted in the way wasmegg/events wants it
class Event(dict):
    def __init__(self,EggIncEvent):
        dict.__init__(self,
        id              = EggIncEvent['identifier'],
        type            = EggIncEvent['type'],
        multiplier      = EggIncEvent['multiplier'],
        message         = EggIncEvent['subtitle'],
        startTimestamp  = EggIncEvent['startTime'],
        endTimestamp    = EggIncEvent['startTime'] + EggIncEvent['duration'])

    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)


def extract_payload(resp: requests.Response) -> bytes:
    buf = base64.b64decode(resp.content)
    auth_msg = ei.AuthenticatedMessage().FromString(buf)

    res = zlib.decompress(auth_msg.message)
    return res

def parse_message(Type,Message):
    response = Type
    response.ParseFromString(Message)
    return MessageToDict(response)

# periodicals: python dict form of a periodicalsresponse
# file: path of file to write events to
# updates existing list of events with current events
def update_events(periodicals, file):

    # create array of current events
    events = sorted([Event(event) for event in periodicals['events']['events']],
                    key=lambda x: (x['startTimestamp'], x['type']),
                    reverse=True
                    )

    # read past events into object
    with open(file, 'r', encoding="utf-8") as f:
        past_events = json.load(f)
    
    # ensure uniqueness. live data prioritized over old data
    for e in events:
        for p in past_events:
            # events are the same if they have the same id and start within a week of each other
            if p['id'] == e['id'] and abs(e['startTimestamp'] - p['startTimestamp']) < 7*86400:
                # if we encounter duplicate events kev probably fucked something up 
                # so delete the old one and take the new one
                past_events.remove(p)

    # write all events back to file for wasmegg/events to use
    all_events = events + past_events

    with open(file, 'w', encoding="utf-8") as f:
        json.dump(all_events, f, sort_keys=True, indent=2)


def main():
    event_file = "data/events.json"
    contract_file = "data/contracts.json"
    user_id = os.environ.get('EI_USERID')
    client_version = 45
    version = '1.25.4'
    build = '111225'
    platform = "IOS"
    url = 'https://www.auxbrain.com/ei/get_periodicals'
    
    
    periodicals_request = ei.GetPeriodicalsRequest()
    periodicals_request.current_client_version = 999
    periodicals_request.user_id                = user_id
    periodicals_request.rinfo.build            = build
    periodicals_request.rinfo.client_version   = client_version
    periodicals_request.rinfo.ei_user_id       = user_id
    periodicals_request.rinfo.platform         = platform
    periodicals_request.rinfo.version          = version
    
    data = { 'data' : base64.b64encode(periodicals_request.SerializeToString()).decode('utf-8') }
    response = requests.post(url, data = data)
    
    # parse and decompress authenticated response
    message = extract_payload(response)
    periodicals = parse_message(ei.PeriodicalsResponse(), message)
    
    # write current events to past events file
    update_events(periodicals, event_file)


if __name__ == "__main__":
    main()

