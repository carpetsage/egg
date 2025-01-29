import sys
import requests
import time
import json
import base64
from more_itertools import unique_everseen
# local imports
import ei
import defaults
import utils

def main():
    # api request to get current events
    periodicals_response = requestPeriodicals()
    periodicals = utils.decode(
        ei.PeriodicalsResponse(), periodicals_response)
    if "events" in sys.argv:
         updateEvents(periodicals.events.events, defaults.event_file)
    if "contracts" in sys.argv:
        updateContracts(periodicals.contracts.contracts, defaults.contract_file)
    if "customeggs" in sys.argv:
        updateCustomEggs(periodicals.contracts.custom_eggs, defaults.egg_file)


def updateCustomEggs(customEggs: list["ei.CustomEgg"], file: str):
    if len(customEggs) == 0:
        print("Error fetching custom eggs")
        return
    # print egg list for convenience
    [print(egg.name) for egg in customEggs]
    # write json array of customegg protos
    with open(file, 'w', encoding="utf-8") as f:
        json.dump([base64.b64encode(bytes(egg)).decode("utf-8") for egg in customEggs], f, sort_keys=True, indent=2)

# events: list of currently active events
# updates existing list of events with current events
def getEvents(events: list["ei.EggIncEvent"], file: str) -> list["Event"]:

    # create array of current events
    active = sorted([Event(event) for event in events],
                    key=lambda x: (x['startTimestamp'], x['id']),
                    )

    # read past events into object
    with open(file, 'r', encoding="utf-8") as f:
        past = json.load(f)

    # list of all events in order
    return [ event for event in past if not listContainsEvent(active, event) ] + active

def listContainsEvent(eventList: list["Event"], event: "Event") -> bool:
    for e in eventList:
        # Events are considered the same if they have the same id and start within 2 days of each other
        if event['id'] == e['id'] and abs(event['startTimestamp'] - e['startTimestamp']) < 2*86400:
            return True
    return False

# get events and persist to file
def updateEvents(activeEvents:list[ei.EggIncEvent], file: str):

    events = getEvents(activeEvents, file)

    with open(file, 'w', encoding="utf-8") as f:
        json.dump(events, f, sort_keys=True, indent=2)

# get list of all contracts from active contracts and past contract list
def getContracts(active: list["ei.Contract"], file: str) -> list["ContractStore"]:
    # remove first-contract from list
    active = [c for c in active if c.identifier != 'first-contract']

    # save some space and remove goals/goalsets from contracts with grade_specs
    for c in active:
        if c.grade_specs:
            c.goal_sets = []
            c.goals = []

    # read past events into list
    with open(file, 'r', encoding="utf-8") as f:
        past_contract_protos = json.load(f)
    past = [utils.decode(ei.Contract(),contract['proto'], False)
                      for contract in past_contract_protos]

    recent = []
    old = []
    # get contracts that are still running
    for c in past:
        if c.expiration_time > time.time():
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

def updateContracts(contracts: list[ei.Contract], file: str):
    allContracts = getContracts(contracts, file)

    with open(file, 'w', encoding="utf-8") as f:
        json.dump(allContracts, f, sort_keys=True, indent=2)



def requestPeriodicals() -> bytes:
    periodicals_request = ei.GetPeriodicalsRequest(
    current_client_version = defaults.current_client_version,
    user_id                = defaults.user_id,
    rinfo                  = defaults.rinfo()
    )

    data = { 'data' : utils.encode(periodicals_request) }

    return requests.post(defaults.url, data = data).content

# event object formatted in the way wasmegg/events wants it
class Event(dict):
    def __init__(self, EggIncEvent: "ei.EggIncEvent"):
        dict.__init__(self,
        id              = EggIncEvent.identifier,
        type            = EggIncEvent.type,
        multiplier      = EggIncEvent.multiplier,
        message         = EggIncEvent.subtitle,
        startTimestamp  = EggIncEvent.start_time,
        endTimestamp    = EggIncEvent.start_time + EggIncEvent.duration,
        ultra           = EggIncEvent.cc_only)

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
