export type EventTypeId =
  | 'app-update'
  | 'epic-research-sale'
  | 'piggy-boost'
  | 'piggy-cap-boost'
  | 'prestige-boost'
  | 'earnings-boost'
  | 'gift-boost'
  | 'drone-boost'
  | 'research-sale'
  | 'hab-sale'
  | 'vehicle-sale'
  | 'boost-sale'
  | 'boost-duration'
  | 'crafting-sale'
  | 'mission-fuel'
  | 'mission-capacity'
  | 'mission-duration'
  | 'shell-sale';

export type InGameEventTypeId = Exclude<EventTypeId, 'app-update'>;

export type InGameEventParams = {
  id: string;
  type: InGameEventTypeId;
  multiplier: number;
  message: string;
  startTimestamp: number;
  endTimestamp: number;
};

export type EventTypeSwitches = { [key in EventTypeId]: boolean };
