import dayjs, { Dayjs } from 'dayjs';

import {
  ei,
  Mission,
  missionDurationTypeList,
  MissionType,
  newMissionTypeMap,
  spaceshipIconPath,
  spaceshipList,
  spaceshipName,
} from 'lib';

import Spaceship = ei.MissionInfo.Spaceship;
import DurationType = ei.MissionInfo.DurationType;

export class Statistics {
  ships: ShipStatistics[];

  constructor(ships?: ShipStatistics[]) {
    this.ships = ships || [];
  }
}

export class ShipStatistics {
  shipType: Spaceship;
  durations: MissionTypeStatistics[];

  constructor(shipType: Spaceship, durationTypes?: MissionTypeStatistics[]) {
    this.shipType = shipType;
    this.durations = durationTypes || [];
  }

  get shipName(): string {
    return spaceshipName(this.shipType);
  }

  get shipIconPath(): string {
    return spaceshipIconPath(this.shipType);
  }

  get count(): number {
    return this.durations.reduce((count, dt) => count + dt.count, 0);
  }

  get requiredTotalLaunchesToUnlockNextShip(): number {
    switch (this.shipType) {
      case Spaceship.CHICKEN_ONE:
        return 4;
      case Spaceship.CHICKEN_NINE:
        return 6;
      case Spaceship.CHICKEN_HEAVY:
        return 12;
      case Spaceship.BCR:
        return 15;
      case Spaceship.MILLENIUM_CHICKEN:
        return 18;
      case Spaceship.CORELLIHEN_CORVETTE:
        return 21;
      case Spaceship.GALEGGTICA:
        return 24;
      case Spaceship.CHICKFIANT:
        return 27;
      case Spaceship.VOYEGGER:
        return 30;
      case Spaceship.HENERPRISE:
        return Infinity;
    }
  }

  get requiredRemainingLaunchesToUnlockNextShip(): number {
    return Math.max(this.requiredTotalLaunchesToUnlockNextShip - this.count, 0);
  }

  earliestTimeTheNextShipCanBeLaunched(activeMissions: Mission[]): Dayjs {
    const missionSlots = 3;
    const launchedMissions = activeMissions.filter(mission => !mission.statusIsFueling);
    if (launchedMissions.length > missionSlots) {
      throw new Error(
        `the impossible happened: ${launchedMissions.length} missions in ${missionSlots} slots`
      );
    }
    const now = dayjs();
    // returnQueue is a FIFO queue holding return timestamps of launched
    // missions (or the current timestamp, for returned but not yet collected
    // missions). At most missionSlots members are in the queue at a time.
    const returnQueue = <Dayjs[]>[];
    // Initialize the queue with currently active missions, filling the empty
    // slots with the current timestamp (can be thought of as imaginary missions
    // that are currently collectible).
    const currentlyEmptySlots = missionSlots - launchedMissions.length;
    for (let i = 0; i < currentlyEmptySlots; i++) {
      returnQueue.push(now);
    }
    launchedMissions.forEach(mission => {
      const returnTime = mission.returnTime;
      if (!returnTime) {
        throw new Error(
          'the impossible happend: cannot calculate return timestamp for launched mission'
        );
      }
      returnQueue.push(returnTime.isBefore(now) ? now : returnTime);
    });
    // Start simulating launching missions.
    let remaining = this.requiredRemainingLaunchesToUnlockNextShip;
    const shortestMissionDurationSeconds = new MissionType(this.shipType, DurationType.SHORT)
      .defaultDurationSeconds;
    while (true) {
      if (remaining === 0) {
        return returnQueue[0];
      }
      const returnTime = returnQueue.shift()!;
      returnQueue.push(returnTime.add(shortestMissionDurationSeconds, 'seconds'));
      remaining--;
    }
  }
}

export class MissionTypeStatistics {
  mission: MissionType;
  count: number;

  constructor(shipType: Spaceship, durationType: DurationType, count = 0) {
    this.mission = new MissionType(shipType, durationType);
    this.count = count;
  }
}

// Sorted in chronological order.
export function getLaunchedMissions(artifactsDB: ei.IArtifactsDB): ei.IMissionInfo[] {
  return (artifactsDB.missionArchive || [])
    .concat(artifactsDB.missionInfos || [])
    .filter(m => m.status! >= ei.MissionInfo.Status.EXPLORING)
    .sort((m1, m2) => m1.startTimeDerived! - m2.startTimeDerived!);
}

export function getMissionStatistics(artifactsDB: ei.IArtifactsDB): Statistics {
  const missions = getLaunchedMissions(artifactsDB);
  const missionTypeCounts = newMissionTypeMap(0);
  for (const mission of missions) {
    missionTypeCounts[mission.ship!][mission.durationType!]++;
  }
  const stats = new Statistics();
  for (const shipType of spaceshipList) {
    const shipStats = new ShipStatistics(shipType);
    for (const durationType of missionDurationTypeList) {
      const count = missionTypeCounts[shipType][durationType];
      if (count > 0) {
        shipStats.durations.push(new MissionTypeStatistics(shipType, durationType, count));
      }
    }
    if (shipStats.durations.length > 0) {
      stats.ships.push(shipStats);
    }
  }
  return stats;
}

export class LaunchLog {
  dates: DailyLaunchLog[];

  constructor() {
    this.dates = [];
  }

  addDate(date: Dayjs, missions: Mission[]): void {
    this.dates.push(new DailyLaunchLog(date, missions));
  }

  sort(): void {
    this.dates.sort((d1, d2) => d2.date.valueOf() - d1.date.valueOf());
  }

  filtered(lastNDays?: number): DailyLaunchLog[] {
    const dateCutoff = lastNDays
      ? dayjs()
          .startOf('day')
          .subtract(lastNDays - 1, 'days')
      : dayjs(0);
    return this.dates.filter(date => !date.date.isBefore(dateCutoff));
  }
}

export class DailyLaunchLog {
  date: Dayjs;
  missions: Mission[];

  constructor(date: Dayjs, missions: Mission[]) {
    this.date = date;
    this.missions = missions.sort((m1, m2) => m2.launchTimestamp! - m1.launchTimestamp!);
  }

  get dateDisplay(): string {
    return this.date.format('YYYY-MM-DD');
  }
}

export function getLaunchLog(artifactsDB: ei.IArtifactsDB): LaunchLog {
  type EpochMilliseconds = number;
  const missions = getLaunchedMissions(artifactsDB).map(m => new Mission(m));
  const dateToMissions = new Map<EpochMilliseconds, Mission[]>();
  for (const mission of missions) {
    const launchTime = mission.launchTime;
    if (!launchTime) {
      throw new Error(`mission ${mission.id}: launch timestamp not found`);
    }
    const dateTimestamp: EpochMilliseconds = launchTime.startOf('day').valueOf();
    if (dateToMissions.has(dateTimestamp)) {
      dateToMissions.get(dateTimestamp)!.push(mission);
    } else {
      dateToMissions.set(dateTimestamp, [mission]);
    }
  }
  const log = new LaunchLog();
  dateToMissions.forEach((missions, date) => {
    log.addDate(dayjs(date), missions);
  });
  log.sort();
  return log;
}
