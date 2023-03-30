import requests
import time
import json
from typing import List
from more_itertools import unique_everseen
import base64
import ei
# local file with shared defaults
import defaults
# local file with shared utils
import utils


def main():
    # api request to get current events
    periodicals_response = requestPeriodicals()
    message = utils.extractPayload(periodicals_response.content)

    periodicals = ei.PeriodicalsResponse().parse(message)

    # munge api data with stored contracts/events and update stored lists
    #updateContracts(periodicals.contracts.contracts, defaults.contract_file)
    updateEvents(periodicals.events.events, defaults.event_file)


# periodicals: python dict form of a periodicalsresponse
# file: path of file to write events to
# updates existing list of events with current events
def getEvents(events: List["ei.EggIncEvent"], file: str) -> List["Event"]:

    # create array of current events
    active = sorted([Event(event) for event in events],
                    key=lambda x: (x['startTimestamp'], x['type']),
                    )

    # read past events into object
    with open(file, 'r', encoding="utf-8") as f:
        past = json.load(f)
    
    # write all events back to file for wasmegg/events to use
    return [ event for event in past if not listContainsEvent(active, event) ] + active

def listContainsEvent(eventList: List["Event"], event: "Event") -> bool:
    for e in eventList:
        # Events are considered the same if they have the same id and start within 7 days of each other
        if event['id'] == e['id'] and abs(event['startTimestamp'] - e['startTimestamp']) < 7*86400:
            return True
    return False

# get events and persist to file
def updateEvents(periodicals:dict, file: str):

    events = getEvents(periodicals, file)

    with open(file, 'w', encoding="utf-8") as f:
        json.dump(events, f, sort_keys=True, indent=2)

# get list of all contracts from active contracts and past contract list
def getContracts(active: List["ei.Contract"], file: str) -> List[dict]: 
    # remove first-contract from list
    active = [c for c in active if c.identifier != 'first-contract']

    # read past events into list
    with open(file, 'r', encoding="utf-8") as f:
        past_contract_protos = json.load(f)
    past = [utils.decode(ei.Contract(),contract['proto'])
                      for contract in past_contract_protos]

    recent = []
    old = []
    # get contracts ran in the past 30 days
    for c in past:
        if c.start_time > time.time() - 30*86400:
            recent.append(c)
            continue
        old.append(c)

    # dedupe recent contract list, always replacing saved data with live api data
    contracts = sorted(
            unique_everseen(active + recent,
                            key = lambda x: x.identifier), 
            key=lambda x: x .start_time)

    # return list of all contracts in { id: contract id, proto: b64 contract proto } form
    return [ ContractStore(contract) for contract in old + contracts ]

def updateContracts(periodicals: dict, file: str):
    contracts = getContracts(periodicals, file)

    with open(file, 'w', encoding="utf-8") as f:
        json.dump(contracts, f, sort_keys=True, indent=2)



def requestPeriodicals():
    periodicals_request = ei.GetPeriodicalsRequest()
    periodicals_request.current_client_version = defaults.current_client_version
    periodicals_request.user_id                = defaults.user_id
    periodicals_request.rinfo.build            = defaults.build
    periodicals_request.rinfo.client_version   = defaults.client_version
    periodicals_request.rinfo.ei_user_id       = defaults.user_id
    periodicals_request.rinfo.platform         = defaults.platform
    periodicals_request.rinfo.version          = defaults.version

    print(periodicals_request.to_json())
    data = { 'data' : utils.encode(periodicals_request) }

    return requests.post(defaults.url, data = data)

# event object formatted in the way wasmegg/events wants it
class Event(dict):
    def __init__(self, EggIncEvent: "ei.EggIncEvent"):
        dict.__init__(self,
        id              = EggIncEvent.identifier,
        type            = EggIncEvent.type,
        multiplier      = EggIncEvent.multiplier,
        message         = EggIncEvent.subtitle,
        startTimestamp  = EggIncEvent.start_time,
        endTimestamp    = EggIncEvent.start_time + EggIncEvent.duration)

    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)

# contract object formatted to persist with json
class ContractStore(dict):
    def __init__(self, contract: "ei.Contract"):
        dict.__init__(self,
        id    = contract.identifier,
        proto = utils.encode(contract))

    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)

if __name__ == "__main__":
    main()
