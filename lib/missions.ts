import dayjs, { Dayjs } from 'dayjs';

import { eggIconPath, eggName } from './eggs';
import { ei } from './proto';
import { formatDuration } from './time';
import { formatEIValue } from './units';
import eiafxConfig, { MissionTypeParameters } from './eiafx-config.json';

import Spaceship = ei.MissionInfo.Spaceship;
import DurationType = ei.MissionInfo.DurationType;
import Status = ei.MissionInfo.Status;

export const spaceshipList = [
  Spaceship.CHICKEN_ONE,
  Spaceship.CHICKEN_NINE,
  Spaceship.CHICKEN_HEAVY,
  Spaceship.BCR,
  Spaceship.MILLENIUM_CHICKEN,
  Spaceship.CORELLIHEN_CORVETTE,
  Spaceship.GALEGGTICA,
  Spaceship.CHICKFIANT,
  Spaceship.VOYEGGER,
  Spaceship.HENERPRISE,
];

export const missionDurationTypeList = [
  DurationType.TUTORIAL,
  DurationType.SHORT,
  DurationType.LONG,
  DurationType.EPIC,
];

export interface ShipsConfig {
  epicResearchFTLLevel: number;
  epicResearchZerogLevel: number;
  shipLevels: { [key in Spaceship]: number };
}

export function newShipsConfig(progress?: ei.Backup.IGame): ShipsConfig {
  let epicResearchFTLLevel = 0;
  let epicResearchZerogLevel = 0;
  if (progress) {
    for (const r of progress.epicResearch || []) {
      if (r.id === 'afx_mission_time') {
        epicResearchFTLLevel = r.level!;
      }
      if (r.id === 'afx_mission_capacity') {
        epicResearchZerogLevel = r.level!;
      }
    }
  }
  return {
    epicResearchFTLLevel,
    epicResearchZerogLevel,
    shipLevels: {
      [Spaceship.CHICKEN_ONE]: 0,
      [Spaceship.CHICKEN_NINE]: 0,
      [Spaceship.CHICKEN_HEAVY]: 0,
      [Spaceship.BCR]: 0,
      [Spaceship.MILLENIUM_CHICKEN]: 0,
      [Spaceship.CORELLIHEN_CORVETTE]: 0,
      [Spaceship.GALEGGTICA]: 0,
      [Spaceship.CHICKFIANT]: 0,
      [Spaceship.VOYEGGER]: 0,
      [Spaceship.HENERPRISE]: 0,
    },
  };
}

export function isShipsConfig(x: unknown): x is ShipsConfig {
  if (typeof x !== 'object' || x === null) {
    return false;
  }
  if ((x as ShipsConfig).epicResearchFTLLevel === undefined) {
    return false;
  }
  if ((x as ShipsConfig).epicResearchZerogLevel === undefined) {
    return false;
  }
  const shipLevels = (x as ShipsConfig).shipLevels as unknown;
  if (typeof shipLevels !== 'object' || shipLevels === null) {
    return false;
  }
  for (const level of spaceshipList) {
    if ((shipLevels as { [key in Spaceship]: number })[level] === undefined) {
      return false;
    }
  }
  return true;
}

export class MissionType {
  shipType: Spaceship;
  durationType: DurationType;

  constructor(shipType: Spaceship, durationType: DurationType) {
    this.shipType = shipType;
    this.durationType = durationType;
  }

  get shipName(): string {
    return spaceshipName(this.shipType);
  }

  get shipIconPath(): string {
    return spaceshipIconPath(this.shipType);
  }

  get durationTypeName(): string {
    return missionDurationTypeName(this.durationType);
  }

  get params(): MissionTypeParameters {
    return missionTypeParams[this.shipType][this.durationType];
  }

  get maxLevel(): number {
    return shipMaxLevel(this.shipType);
  }

  get levelLaunchPointThresholds(): number[] {
    return shipLevelLaunchPointThresholds(this.shipType);
  }

  get defaultCapacity(): number {
    return this.params.capacity;
  }

  get defaultDurationSeconds(): number {
    return this.params.seconds;
  }

  get defaultDurationDisplay(): string {
    return formatDuration(this.defaultDurationSeconds, true);
  }

  get defaultFuels(): MissionFuels {
    return missionFuelsInfo[this.shipType][this.durationType];
  }

  boostedCapacity(config: ShipsConfig): number {
    return Math.floor(
      (this.defaultCapacity + this.params.levelCapacityBump * config.shipLevels[this.shipType]) *
        (1 + 0.05 * config.epicResearchZerogLevel)
    );
  }

  boostedDurationSeconds(config: ShipsConfig): number {
    return this.shipType >= Spaceship.MILLENIUM_CHICKEN
      ? this.defaultDurationSeconds * (1 - 0.01 * config.epicResearchFTLLevel)
      : this.defaultDurationSeconds;
  }

  boostedDurationDisplay(config: ShipsConfig): string {
    return formatDuration(this.boostedDurationSeconds(config), true);
  }
}

export class Mission extends MissionType {
  missionInfo: ei.IMissionInfo;

  constructor(m: ei.IMissionInfo) {
    super(m.ship!, m.durationType!);
    this.missionInfo = m;
  }

  get id(): string {
    return this.missionInfo.identifier!;
  }

  get capacity(): number {
    return this.missionInfo.capacity!;
  }

  get status(): Status {
    return this.missionInfo.status!;
  }

  get statusName(): string {
    return missionStatusName(this.status);
  }

  get statusIsFueling(): boolean {
    return this.status === Status.FUELING;
  }

  get launchTimestamp(): number | null {
    return this.missionInfo.startTimeDerived || null;
  }

  get launchTime(): Dayjs | null {
    return this.launchTimestamp ? dayjs(this.launchTimestamp * 1000) : null;
  }

  get launchDateDisplay(): string {
    const time = this.launchTime;
    return time ? time.format('YYYY-MM-DD') : '\u2013';
  }

  get launchTimeDisplay(): string {
    const time = this.launchTime;
    return time ? time.format('HH:mm:ss') : '\u2013';
  }

  get durationSeconds(): number | null {
    return this.missionInfo.durationSeconds || null;
  }

  get durationDisplay(): string | null {
    return this.durationSeconds ? formatDuration(this.durationSeconds, true) : '\u2013';
  }

  get returnTimestamp(): number | null {
    return this.launchTimestamp && this.durationSeconds
      ? this.launchTimestamp + this.durationSeconds
      : null;
  }

  get returnTime(): Dayjs | null {
    return this.returnTimestamp ? dayjs(this.returnTimestamp * 1000) : null;
  }

  get hasReturned(): boolean {
    return this.returnTime !== null && this.returnTime.isBefore(dayjs());
  }

  get fuels(): MissionFuels {
    return this.missionInfo.fuel?.map(fuel => new MissionFuel(fuel.egg!, fuel.amount!)) || [];
  }
}

export class MissionFuel {
  egg: ei.Egg;
  amount: number;

  constructor(egg: ei.Egg, amount: number) {
    this.egg = egg;
    this.amount = amount;
  }

  get eggName(): string {
    return eggName(this.egg);
  }

  get eggIconPath(): string {
    return eggIconPath(this.egg);
  }

  get amountDisplay(): string {
    return formatEIValue(this.amount, { trim: true });
  }
}

export type MissionFuels = MissionFuel[];

export type MissionTypeMap<T> = {
  [key in Spaceship]: { [key in DurationType]: T };
};

export function newMissionTypeMap<T>(defaultValue: T): MissionTypeMap<T> {
  return newMissionTypeMapFromFactory(() => defaultValue);
}

export function newMissionTypeMapFromFactory<T>(
  defaultFactory: (shipType: Spaceship, durationType: DurationType) => T
): MissionTypeMap<T> {
  const innerFactory = (shipType: Spaceship) => ({
    [DurationType.TUTORIAL]: defaultFactory(shipType, DurationType.TUTORIAL),
    [DurationType.SHORT]: defaultFactory(shipType, DurationType.SHORT),
    [DurationType.LONG]: defaultFactory(shipType, DurationType.LONG),
    [DurationType.EPIC]: defaultFactory(shipType, DurationType.EPIC),
  });
  return {
    [Spaceship.CHICKEN_ONE]: innerFactory(Spaceship.CHICKEN_ONE),
    [Spaceship.CHICKEN_NINE]: innerFactory(Spaceship.CHICKEN_NINE),
    [Spaceship.CHICKEN_HEAVY]: innerFactory(Spaceship.CHICKEN_HEAVY),
    [Spaceship.BCR]: innerFactory(Spaceship.BCR),
    [Spaceship.MILLENIUM_CHICKEN]: innerFactory(Spaceship.MILLENIUM_CHICKEN),
    [Spaceship.CORELLIHEN_CORVETTE]: innerFactory(Spaceship.CORELLIHEN_CORVETTE),
    [Spaceship.GALEGGTICA]: innerFactory(Spaceship.GALEGGTICA),
    [Spaceship.CHICKFIANT]: innerFactory(Spaceship.CHICKFIANT),
    [Spaceship.VOYEGGER]: innerFactory(Spaceship.VOYEGGER),
    [Spaceship.HENERPRISE]: innerFactory(Spaceship.HENERPRISE),
  };
}

export function spaceshipName(spaceship: Spaceship): string {
  switch (spaceship) {
    case Spaceship.CHICKEN_ONE:
      return 'Chicken One';
    case Spaceship.CHICKEN_NINE:
      return 'Chicken Nine';
    case Spaceship.CHICKEN_HEAVY:
      return 'Chicken Heavy';
    case Spaceship.BCR:
      return 'BCR';
    case Spaceship.MILLENIUM_CHICKEN:
      return 'Quintillion Chicken';
    case Spaceship.CORELLIHEN_CORVETTE:
      return 'Cornish-Hen Corvette';
    case Spaceship.GALEGGTICA:
      return 'Galeggtica';
    case Spaceship.CHICKFIANT:
      return 'Defihent';
    case Spaceship.VOYEGGER:
      return 'Voyegger';
    case Spaceship.HENERPRISE:
      return 'Henerprise';
    default:
      return 'Unknown';
  }
}

export function spaceshipIconPath(spaceship: Spaceship): string {
  switch (spaceship) {
    case Spaceship.CHICKEN_ONE:
      return 'egginc/afx_ship_chicken_1.png';
    case Spaceship.CHICKEN_NINE:
      return 'egginc/afx_ship_chicken_9.png';
    case Spaceship.CHICKEN_HEAVY:
      return 'egginc/afx_ship_chicken_heavy.png';
    case Spaceship.BCR:
      return 'egginc/afx_ship_bcr.png';
    case Spaceship.MILLENIUM_CHICKEN:
      return 'egginc/afx_ship_millenium_chicken.png';
    case Spaceship.CORELLIHEN_CORVETTE:
      return 'egginc/afx_ship_corellihen_corvette.png';
    case Spaceship.GALEGGTICA:
      return 'egginc/afx_ship_galeggtica.png';
    case Spaceship.CHICKFIANT:
      return 'egginc/afx_ship_defihent.png';
    case Spaceship.VOYEGGER:
      return 'egginc/afx_ship_voyegger.png';
    case Spaceship.HENERPRISE:
      return 'egginc/afx_ship_henerprise.png';
    default:
      return 'egginc/icon_help.png';
  }
}

export function missionStatusName(status: Status): string {
  switch (status) {
    case Status.FUELING:
      return 'Fueling';
    case Status.PREPARE_TO_LAUNCH:
      return 'Prepare to Launch';
    case Status.EXPLORING:
      return 'Exploring';
    case Status.RETURNED:
      return 'Returned';
    case Status.ANALYZING:
      return 'Analyzing';
    case Status.COMPLETE:
      return 'Complete';
    case Status.ARCHIVED:
      return 'Archived';
    default:
      return 'Unknown';
  }
}

export function missionDurationTypeName(type: DurationType): string {
  switch (type) {
    case DurationType.TUTORIAL:
      return 'Tutorial';
    case DurationType.SHORT:
      return 'Short';
    case DurationType.LONG:
      return 'Standard';
    case DurationType.EPIC:
      return 'Extended';
    default:
      return 'Unknown';
  }
}

const missionTypeParams: MissionTypeMap<MissionTypeParameters> = (() => {
  const info = newMissionTypeMapFromFactory<MissionTypeParameters>(() => ({
    durationType: 'SHORT',
    quality: 0,
    seconds: 0,
    minQuality: 0,
    maxQuality: 0,
    capacity: 0,
    levelCapacityBump: 0,
    levelQualityBump: 0,
  }));
  for (const mp of eiafxConfig.missionParameters) {
    const ship = Spaceship[mp.ship];
    for (const d of mp.durations) {
      const durationType = DurationType[d.durationType];
      info[ship][durationType] = d;
    }
  }
  return info;
})();

// Generated from mission-list/main.go.
//
// Invalid tutorial missions are included for type safety and have no fuel.
const missionFuelsInfo: MissionTypeMap<MissionFuels> = {
  [Spaceship.CHICKEN_ONE]: {
    [DurationType.TUTORIAL]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 1e5)],
    [DurationType.SHORT]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 2e6)],
    [DurationType.LONG]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 3e6)],
    [DurationType.EPIC]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 10e6)],
  },
  [Spaceship.CHICKEN_NINE]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 10e6)],
    [DurationType.LONG]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 15e6)],
    [DurationType.EPIC]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 25e6)],
  },
  [Spaceship.CHICKEN_HEAVY]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [new MissionFuel(ei.Egg.ROCKET_FUEL, 100e6)],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.ROCKET_FUEL, 50e6),
      new MissionFuel(ei.Egg.FUSION, 5e6),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.ROCKET_FUEL, 75e6),
      new MissionFuel(ei.Egg.FUSION, 25e6),
    ],
  },
  [Spaceship.BCR]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [
      new MissionFuel(ei.Egg.ROCKET_FUEL, 250e6),
      new MissionFuel(ei.Egg.FUSION, 50e6),
    ],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.ROCKET_FUEL, 400e6),
      new MissionFuel(ei.Egg.FUSION, 75e6),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.SUPERFOOD, 5e6),
      new MissionFuel(ei.Egg.ROCKET_FUEL, 300e6),
      new MissionFuel(ei.Egg.FUSION, 100e6),
    ],
  },
  [Spaceship.MILLENIUM_CHICKEN]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [
      new MissionFuel(ei.Egg.FUSION, 5e9),
      new MissionFuel(ei.Egg.GRAVITON, 1e9),
    ],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.FUSION, 7e9),
      new MissionFuel(ei.Egg.GRAVITON, 5e9),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.SUPERFOOD, 10e6),
      new MissionFuel(ei.Egg.FUSION, 10e9),
      new MissionFuel(ei.Egg.GRAVITON, 15e9),
    ],
  },
  [Spaceship.CORELLIHEN_CORVETTE]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [
      new MissionFuel(ei.Egg.FUSION, 15e9),
      new MissionFuel(ei.Egg.GRAVITON, 2e9),
    ],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.FUSION, 20e9),
      new MissionFuel(ei.Egg.GRAVITON, 3e9),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.SUPERFOOD, 500e6),
      new MissionFuel(ei.Egg.FUSION, 25e9),
      new MissionFuel(ei.Egg.GRAVITON, 5e9),
    ],
  },
  [Spaceship.GALEGGTICA]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [
      new MissionFuel(ei.Egg.FUSION, 50e9),
      new MissionFuel(ei.Egg.GRAVITON, 10e9),
    ],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.FUSION, 75e9),
      new MissionFuel(ei.Egg.GRAVITON, 25e9),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.FUSION, 100e9),
      new MissionFuel(ei.Egg.GRAVITON, 50e9),
      new MissionFuel(ei.Egg.ANTIMATTER, 1e9),
    ],
  },
  [Spaceship.CHICKFIANT]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [
      new MissionFuel(ei.Egg.DILITHIUM, 200e9),
      new MissionFuel(ei.Egg.ANTIMATTER, 50e9),
    ],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.DILITHIUM, 250e9),
      new MissionFuel(ei.Egg.ANTIMATTER, 150e9),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.TACHYON, 25e9),
      new MissionFuel(ei.Egg.DILITHIUM, 250e9),
      new MissionFuel(ei.Egg.ANTIMATTER, 250e9),
    ],
  },
  [Spaceship.VOYEGGER]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [
      new MissionFuel(ei.Egg.DILITHIUM, 1e12),
      new MissionFuel(ei.Egg.ANTIMATTER, 1e12),
    ],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.DILITHIUM, 1.5e12),
      new MissionFuel(ei.Egg.ANTIMATTER, 1.5e12),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.TACHYON, 100e9),
      new MissionFuel(ei.Egg.DILITHIUM, 2e12),
      new MissionFuel(ei.Egg.ANTIMATTER, 2e12),
    ],
  },
  [Spaceship.HENERPRISE]: {
    [DurationType.TUTORIAL]: [],
    [DurationType.SHORT]: [
      new MissionFuel(ei.Egg.DILITHIUM, 2e12),
      new MissionFuel(ei.Egg.ANTIMATTER, 2e12),
    ],
    [DurationType.LONG]: [
      new MissionFuel(ei.Egg.DILITHIUM, 3e12),
      new MissionFuel(ei.Egg.ANTIMATTER, 3e12),
      new MissionFuel(ei.Egg.DARK_MATTER, 3e12),
    ],
    [DurationType.EPIC]: [
      new MissionFuel(ei.Egg.TACHYON, 1e12),
      new MissionFuel(ei.Egg.DILITHIUM, 3e12),
      new MissionFuel(ei.Egg.ANTIMATTER, 3e12),
      new MissionFuel(ei.Egg.DARK_MATTER, 3e12),
    ],
  },
};

export function requiredTotalLaunchesToUnlockNextShip(shipType: Spaceship): number {
  switch (shipType) {
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

const shipLevelRequirements: { [key in Spaceship]: number[] } = (() => {
  const levels: { [key in Spaceship]: number[] } = {
    [Spaceship.CHICKEN_ONE]: [],
    [Spaceship.CHICKEN_NINE]: [],
    [Spaceship.CHICKEN_HEAVY]: [],
    [Spaceship.BCR]: [],
    [Spaceship.MILLENIUM_CHICKEN]: [],
    [Spaceship.CORELLIHEN_CORVETTE]: [],
    [Spaceship.GALEGGTICA]: [],
    [Spaceship.CHICKFIANT]: [],
    [Spaceship.VOYEGGER]: [],
    [Spaceship.HENERPRISE]: [],
  };
  for (const mp of eiafxConfig.missionParameters) {
    const ship = Spaceship[mp.ship];
    levels[ship] = mp.levelMissionRequirements;
  }
  return levels;
})();

export function shipMaxLevel(shipType: Spaceship): number {
  return shipLevelRequirements[shipType].length;
}

export function shipLevelLaunchPointThresholds(shipType: Spaceship): number[] {
  const deltas = shipLevelRequirements[shipType];
  let sum = 0;
  const thresholds = [0];
  for (const delta of deltas) {
    sum += delta;
    thresholds.push(sum);
  }
  return thresholds;
}

export const perfectShipsConfig: ShipsConfig = {
  epicResearchFTLLevel: 25,
  epicResearchZerogLevel: 10,
  shipLevels: {
    [Spaceship.CHICKEN_ONE]: shipMaxLevel(Spaceship.CHICKEN_ONE),
    [Spaceship.CHICKEN_NINE]: shipMaxLevel(Spaceship.CHICKEN_NINE),
    [Spaceship.CHICKEN_HEAVY]: shipMaxLevel(Spaceship.CHICKEN_HEAVY),
    [Spaceship.BCR]: shipMaxLevel(Spaceship.BCR),
    [Spaceship.MILLENIUM_CHICKEN]: shipMaxLevel(Spaceship.MILLENIUM_CHICKEN),
    [Spaceship.CORELLIHEN_CORVETTE]: shipMaxLevel(Spaceship.CORELLIHEN_CORVETTE),
    [Spaceship.GALEGGTICA]: shipMaxLevel(Spaceship.GALEGGTICA),
    [Spaceship.CHICKFIANT]: shipMaxLevel(Spaceship.CHICKFIANT),
    [Spaceship.VOYEGGER]: shipMaxLevel(Spaceship.VOYEGGER),
    [Spaceship.HENERPRISE]: shipMaxLevel(Spaceship.HENERPRISE),
  },
};
