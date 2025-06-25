import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { EventTypeId, InGameEventParams } from './types';

import inGameEventsData from '@/events.json';
import legacyInGameEventsData from '@/legacy_events.json';
import appVersionsData from '@/version_history.json';

const inGameEvents = inGameEventsData as InGameEventParams[];
const legacyInGameEvents = legacyInGameEventsData as InGameEventParams[];
const appVersions = appVersionsData as { versionDisplay: string; releaseNotes: string; releaseDate: string }[];

dayjs.extend(utc);

export class EventType {
  constructor(public id: EventTypeId) {}

  get name(): string {
    switch (this.id) {
      case 'app-update':
        return 'APP UPDATE';
      case 'epic-research-sale':
        return 'EPIC RESEARCH SALE';
      case 'piggy-boost':
        return 'PIGGY GROWTH';
      case 'piggy-cap-boost':
        return 'UNLIMITED PIGGY';
      case 'prestige-boost':
        return 'PRESTIGE BOOST';
      case 'earnings-boost':
        return 'CASH BOOST';
      case 'gift-boost':
        return 'GENEROUS GIFTS';
      case 'drone-boost':
        return 'GENEROUS DRONES';
      case 'research-sale':
        return 'RESEARCH SALE';
      case 'hab-sale':
        return 'HEN HOUSE SALE';
      case 'vehicle-sale':
        return 'VEHICLE SALE';
      case 'boost-sale':
        return 'BOOST SALE';
      case 'boost-duration':
        return 'BOOST TIME+';
      case 'crafting-sale':
        return 'CRAFTING SALE';
      case 'mission-fuel':
        return 'MISSION FUEL BOOST';
      case 'mission-capacity':
        return 'MISSION CAPACITY BOOST';
      case 'mission-duration':
        return 'MISSION DURATION CUT';
      case 'shell-sale':
        return 'SHELL SALE';
    }
  }

  get color(): string {
    switch (this.id) {
      case 'app-update':
        return 'gray';
      case 'epic-research-sale':
        return 'red';
      case 'piggy-boost':
        return 'orange';
      case 'piggy-cap-boost':
        return 'amber';
      case 'prestige-boost':
        return 'yellow';
      case 'earnings-boost':
        return 'lime';
      case 'gift-boost':
        return 'green';
      case 'drone-boost':
        return 'emerald';
      case 'research-sale':
        return 'teal';
      case 'hab-sale':
        return 'cyan';
      case 'vehicle-sale':
        return 'sky';
      case 'boost-sale':
        return 'blue';
      case 'boost-duration':
        return 'indigo';
      case 'crafting-sale':
        return 'violet';
      case 'mission-fuel':
        return 'purple';
      case 'mission-capacity':
        return 'fuchsia';
      case 'mission-duration':
        return 'pink';
      case 'shell-sale':
        return 'rose';
    }
  }

  get fgClass(): string {
    return `text-${this.color}-500`;
  }

  get brightFgClass(): string {
    return `text-${this.color}-300`;
  }

  get bgClass(): string {
    return `bg-${this.color}-500`;
  }

  get icon(): string {
    switch (this.id) {
      case 'app-update':
        // SVG icon.
        return '';
      case 'epic-research-sale':
        return 'egginc-extras/icon_research_sale.png';
      case 'piggy-boost':
        return 'egginc/icon_piggy.png';
      case 'piggy-cap-boost':
        return 'egginc/icon_piggy.png';
      case 'prestige-boost':
        return 'egginc-extras/icon_prestige_boost.png';
      case 'earnings-boost':
        return 'egginc-extras/icon_earnings_boost.png';
      case 'gift-boost':
        return 'egginc-extras/icon_gift_boost.png';
      case 'drone-boost':
        return 'egginc-extras/icon_drone_boost.png';
      case 'research-sale':
        return 'egginc-extras/icon_research_sale.png';
      case 'hab-sale':
        return 'egginc-extras/icon_hab_sale.png';
      case 'vehicle-sale':
        return 'egginc-extras/icon_vehicle_sale.png';
      case 'boost-sale':
        return 'egginc-extras/icon_lightning.png';
      case 'boost-duration':
        return 'egginc-extras/icon_boost_duration.png';
      case 'crafting-sale':
        return 'egginc/icon_afx_craft.png';
      case 'mission-fuel':
        return 'egginc/icon_afx_mission_fuel.png';
      case 'mission-capacity':
        return 'egginc/icon_afx_chest_2.png';
      case 'mission-duration':
        return 'egginc/icon_afx_mission_duration.png';
      case 'shell-sale':
        return 'egginc/icon_shells_v2.png';
    }
  }
}

const allEventTypes = (<EventTypeId[]>[
  'app-update',
  'epic-research-sale',
  'piggy-boost',
  'piggy-cap-boost',
  'prestige-boost',
  'earnings-boost',
  'gift-boost',
  'drone-boost',
  'research-sale',
  'hab-sale',
  'vehicle-sale',
  'boost-sale',
  'boost-duration',
  'crafting-sale',
  'mission-fuel',
  'mission-capacity',
  'mission-duration',
  'shell-sale',
]).map(id => new EventType(id));

class _GameEvent {
  type: EventType;

  constructor(type_id: EventTypeId) {
    this.type = new EventType(type_id);
  }

  get name(): string {
    return this.type.name;
  }

  get fgClass(): string {
    return this.type.fgClass;
  }

  get brightFgClass(): string {
    return this.type.brightFgClass;
  }

  get bgClass(): string {
    return this.type.bgClass;
  }

  get icon(): string {
    return this.type.icon;
  }

  isInGameEvent(): this is InGameEvent {
    return this instanceof InGameEvent;
  }

  isAppUpdateEvent(): this is AppUpdateEvent {
    return this instanceof AppUpdateEvent;
  }
}

export class InGameEvent extends _GameEvent {
  id: string;
  multiplier: number;
  message: string;
  startTimestamp: number;
  endTimestamp: number;
  ultra: boolean;

  constructor(params: InGameEventParams) {
    super(params.type);
    this.id = params.id;
    this.multiplier = params.multiplier;
    this.message = params.message;
    this.startTimestamp = params.startTimestamp;
    this.endTimestamp = params.endTimestamp;
    this.ultra = params.ultra ?? false;
  }

  get startTime(): Dayjs {
    return dayjs(this.startTimestamp * 1000);
  }

  get endTime(): Dayjs {
    return dayjs(this.endTimestamp * 1000);
  }

  get durationSeconds(): number {
    return this.endTimestamp - this.startTimestamp;
  }

  get caption(): string {
    switch (this.type.id) {
      // 'app-update' isn't possible for InGameEvent.
      case 'app-update':
        return '';
      case 'prestige-boost':
      case 'earnings-boost':
      case 'gift-boost':
      case 'drone-boost':
      case 'boost-duration':
      case 'mission-fuel':
      case 'mission-capacity':
        return `${this.multiplier}x`;
      case 'epic-research-sale':
      case 'research-sale':
      case 'hab-sale':
      case 'vehicle-sale':
      case 'boost-sale':
      case 'crafting-sale':
      case 'shell-sale':
        return `${Math.round((1 - this.multiplier) * 100)}% OFF`;
      case 'mission-duration':
        return `-${Math.round((1 - this.multiplier) * 100)}%`;
      case 'piggy-boost':
        return `+${this.multiplier}`;
      case 'piggy-cap-boost':
        return 'NO CAP';
    }
  }
}

export class AppUpdateEvent extends _GameEvent {
  version: string;
  startTimestamp: number;
  releaseNotes: string;

  constructor(version: string, releaseDate: string, releaseNotes: string) {
    super('app-update');
    this.version = version;
    this.startTimestamp = dayjs.utc(releaseDate).unix();
    this.releaseNotes = releaseNotes;
  }

  get startTime(): Dayjs {
    return dayjs(this.startTimestamp * 1000);
  }
}

export type GameEvent = InGameEvent | AppUpdateEvent;

export const events: GameEvent[] = [
  ...[...legacyInGameEvents, ...inGameEvents].map(params => new InGameEvent(params)),
  ...appVersions
    .filter(params => !params.releaseDate.startsWith('2019-'))
    .map(params => new AppUpdateEvent(params.versionDisplay, params.releaseDate, params.releaseNotes)),
].sort((e1, e2) => e1.startTimestamp - e2.startTimestamp);

const existingEventTypes = new Set(events.map(e => e.type.id));
export const eventTypes = allEventTypes.filter(type => existingEventTypes.has(type.id));

// A list of classes used, for purgecss.
[
  'text-gray-500',
  'text-red-500',
  'text-orange-500',
  'text-amber-500',
  'text-yellow-500',
  'text-lime-500',
  'text-green-500',
  'text-emerald-500',
  'text-teal-500',
  'text-cyan-500',
  'text-sky-500',
  'text-blue-500',
  'text-indigo-500',
  'text-violet-500',
  'text-purple-500',
  'text-fuchsia-500',
  'text-pink-500',
  'text-rose-500',

  'text-gray-300',
  'text-red-300',
  'text-orange-300',
  'text-amber-300',
  'text-yellow-300',
  'text-lime-300',
  'text-green-300',
  'text-emerald-300',
  'text-teal-300',
  'text-cyan-300',
  'text-sky-300',
  'text-blue-300',
  'text-indigo-300',
  'text-violet-300',
  'text-purple-300',
  'text-fuchsia-300',
  'text-pink-300',
  'text-rose-300',

  'bg-gray-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
];
