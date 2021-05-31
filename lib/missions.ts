import dayjs, { Dayjs } from 'dayjs';

import { eggIconPath, eggName } from './eggs';
import { ei } from './proto';
import { formatDuration } from './time';
import { formatEIValue } from './units';

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

  get defaultCapacity(): number {
    return missionCapacityInfo[this.shipType][this.durationType];
  }

  get defaultDurationSeconds(): number {
    return missionDurationSecondsInfo[this.shipType][this.durationType];
  }

  get defaultDurationDisplay(): string {
    return formatDuration(this.defaultDurationSeconds, true);
  }

  get defaultFuels(): MissionFuels {
    return missionFuelsInfo[this.shipType][this.durationType];
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

// jq '.missionParameters[].durations[].capacity' ../_common/eiafx/eiafx-config.json
//
// Invalid tutorial missions are included for type safety and have zero capacity.
const missionCapacityInfo: MissionTypeMap<number> = {
  [Spaceship.CHICKEN_ONE]: {
    [DurationType.TUTORIAL]: 4,
    [DurationType.SHORT]: 4,
    [DurationType.LONG]: 5,
    [DurationType.EPIC]: 6,
  },
  [Spaceship.CHICKEN_NINE]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 7,
    [DurationType.LONG]: 8,
    [DurationType.EPIC]: 9,
  },
  [Spaceship.CHICKEN_HEAVY]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 12,
    [DurationType.LONG]: 14,
    [DurationType.EPIC]: 15,
  },
  [Spaceship.BCR]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 18,
    [DurationType.LONG]: 20,
    [DurationType.EPIC]: 22,
  },
  [Spaceship.MILLENIUM_CHICKEN]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 10,
    [DurationType.LONG]: 12,
    [DurationType.EPIC]: 14,
  },
  [Spaceship.CORELLIHEN_CORVETTE]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 18,
    [DurationType.LONG]: 21,
    [DurationType.EPIC]: 24,
  },
  [Spaceship.GALEGGTICA]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 27,
    [DurationType.LONG]: 30,
    [DurationType.EPIC]: 35,
  },
  [Spaceship.CHICKFIANT]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 20,
    [DurationType.LONG]: 24,
    [DurationType.EPIC]: 28,
  },
  [Spaceship.VOYEGGER]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 30,
    [DurationType.LONG]: 35,
    [DurationType.EPIC]: 40,
  },
  [Spaceship.HENERPRISE]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 45,
    [DurationType.LONG]: 50,
    [DurationType.EPIC]: 56,
  },
};

// jq '.missionParameters[].durations[].seconds' ../_common/eiafx/eiafx-config.json
//
// Invalid tutorial missions are included for type safety and have zero duration.
const missionDurationSecondsInfo: MissionTypeMap<number> = {
  [Spaceship.CHICKEN_ONE]: {
    [DurationType.TUTORIAL]: 60,
    [DurationType.SHORT]: 1200,
    [DurationType.LONG]: 3600,
    [DurationType.EPIC]: 7200,
  },
  [Spaceship.CHICKEN_NINE]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 1800,
    [DurationType.LONG]: 3600,
    [DurationType.EPIC]: 10800,
  },
  [Spaceship.CHICKEN_HEAVY]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 2700,
    [DurationType.LONG]: 5400,
    [DurationType.EPIC]: 14400,
  },
  [Spaceship.BCR]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 5400,
    [DurationType.LONG]: 14400,
    [DurationType.EPIC]: 28800,
  },
  [Spaceship.MILLENIUM_CHICKEN]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 10800,
    [DurationType.LONG]: 21600,
    [DurationType.EPIC]: 43200,
  },
  [Spaceship.CORELLIHEN_CORVETTE]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 14400,
    [DurationType.LONG]: 43200,
    [DurationType.EPIC]: 86400,
  },
  [Spaceship.GALEGGTICA]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 21600,
    [DurationType.LONG]: 57600,
    [DurationType.EPIC]: 108000,
  },
  [Spaceship.CHICKFIANT]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 28800,
    [DurationType.LONG]: 86400,
    [DurationType.EPIC]: 172800,
  },
  [Spaceship.VOYEGGER]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 43200,
    [DurationType.LONG]: 129600,
    [DurationType.EPIC]: 259200,
  },
  [Spaceship.HENERPRISE]: {
    [DurationType.TUTORIAL]: 0,
    [DurationType.SHORT]: 86400,
    [DurationType.LONG]: 172800,
    [DurationType.EPIC]: 345600,
  },
};

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
