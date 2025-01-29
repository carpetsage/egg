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
    if "contractseasons" in sys.argv:
        season_info_response = requestSeasonInfo()
        season_info = utils.decode(ei.ContractSeasonInfos(), season_info_response)
        updateContractSeasons(season_info, defaults.contract_seasons_file)


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

# Get list of all contract seasons
def getContractSeasons(season_info: ei.ContractSeasonInfos, file: str) -> list["ContractSeasonStore"]:

    # read existing contract seasons into list
    with open(file, 'r', encoding="utf-8") as f:
        past_contract_season_protos = json.load(f)
    existing = [utils.decode(ei.ContractSeasonInfo(), contract_season['proto'], False)
            for contract_season in past_contract_season_protos]

    # dedupe, replacing saved data with live api data
    updated_list = sorted(
        unique_everseen(season_info.infos + existing,
                        key = lambda x: x.id),
        key = lambda x: x .start_time)

    # return list of all contracts in { id: contract id, proto: b64 contract proto } form
    return [ ContractSeasonStore(contract_season) for contract_season in updated_list ]

def updateContractSeasons(season_info: ei.ContractSeasonInfos, file: str):
    # At time of writing there's no .start_time returned for four of the seasons.
    # Fill them in using the start time of the first contract in that season.
    # Note though the times we do have for other seasons are often an hour before this, or a few days.
    for season in season_info.infos:
        if season.start_time == 0:
            match season.id:
                case 'fall_2023':
                    season.start_time = 1695657600 # Monday 25th September 2023 (baking-season-2023)
                case 'winter_2024':
                    season.start_time = 1703610000 # Tuesday 26th December 2023 (bike-boo-boos-2023)
                case 'spring_2024':
                    season.start_time = 1711382400 # Monday 25th March 2024 (neuro-threads-2024)
                case 'summer_2024':
                    season.start_time = 1719244800 # Monday 24th June 2024 (summer-here-2024)

    all_contract_seasons = getContractSeasons(season_info, file)

    with open(file, 'w', encoding="utf-8") as f:
        json.dump(all_contract_seasons, f, sort_keys=True, indent=2)


def requestPeriodicals() -> bytes:
    periodicals_request = ei.GetPeriodicalsRequest(
    current_client_version = defaults.current_client_version,
    user_id                = defaults.user_id,
    rinfo                  = defaults.rinfo()
    )

    data = { 'data' : utils.encode(periodicals_request) }

    return requests.post(defaults.url, data = data).content

def requestSeasonInfo() -> bytes:
    # GetPeriodicalsRequest works fine here too
    periodicals_request = ei.GetPeriodicalsRequest(
        current_client_version = defaults.current_client_version,
        user_id                = defaults.user_id,
        rinfo                  = defaults.rinfo()
    )

    data = { 'data' : utils.encode(periodicals_request) }

    return requests.post(defaults.season_info_url, data = data).content

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

# contract season info object formatted to persist with json
class ContractSeasonStore(dict):
    def __init__(self, contract_season: "ei.ContractSeasonInfo"):
        dict.__init__(self,
                      id    = contract_season.id,
                      proto = utils.encode(contract_season))

    def toJson(self):
        return json.dumps(self, default=lambda o: o.__dict__)

if __name__ == "__main__":
    main()
