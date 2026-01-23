// Core types for the Ascension Planner

export type VirtueEgg = 'curiosity' | 'integrity' | 'kindness' | 'humility' | 'resilience';

export const VIRTUE_EGG_ABBREV: Record<VirtueEgg, string> = {
  curiosity: 'C',
  integrity: 'I',
  kindness: 'K',
  humility: 'H',
  resilience: 'R',
};

export const VIRTUE_EGG_NAMES: Record<VirtueEgg, string> = {
  curiosity: 'Curiosity',
  integrity: 'Integrity',
  kindness: 'Kindness',
  humility: 'Humility',
  resilience: 'Resilience',
};

export const VIRTUE_EGG_CATEGORIES: Record<VirtueEgg, string> = {
  curiosity: 'Research',
  integrity: 'Habs',
  kindness: 'Vehicles',
  humility: 'Rockets & Artifacts',
  resilience: 'Silos',
};

export interface Modifiers {
  earnings: number;
  awayEarnings: number;
  ihr: number;
  elr: number;
  shippingCap: number;
  habCap: number;
  vehicleCost: number;
  habCost: number;
  researchCost: number;
}

export interface FuelTankState {
  // TODO: Define fuel tank capacity and contents
  capacity: number;
  stored: Record<VirtueEgg, number>;
}

// Scheduled rocket launch for Humility step
export interface ScheduledLaunch {
  id: string;
  shipType: number;           // ei.MissionInfo.Spaceship
  durationType: number;       // ei.MissionInfo.DurationType
  shipLevel: number;          // Ship star level (0-7 or higher)
  targetArtifact?: number;    // Target artifact for FTL ships (sensor targeting)
  launchTimeOffset: number;   // Seconds from step start when this launches
}

export interface ResearchLogEntry {
  id: string;
  serialId: number;
  level: number;
  cost: number;
  timestamp: number;
}

export interface VehicleLogEntry {
  id: string;
  type: 'buy' | 'add_car' | 'remove';
  slotIndex: number;
  vehicleId: number;
  trainLength: number;
  cost: number;
  timestamp: number;
}

export interface ArtifactSlot {
  artifactId: string;
  rarity: number;
  stones: string[];
}

export type ArtifactLoadout = (ArtifactSlot | null)[];

export interface AscensionStep {
  id: string;
  eggType: VirtueEgg;
  // Track which visit number this is for this egg type (1st, 2nd, etc.)
  visitNumber: number;
  expanded: boolean;
  researchLog: ResearchLogEntry[];
  vehicleLog?: VehicleLogEntry[];
  artifacts?: ArtifactLoadout;
  modifiers?: Modifiers;
  scheduledLaunches?: ScheduledLaunch[];  // All scheduled rocket launches for Humility visits
  // TODO: Add duration, fuel actions, etc.
}

export interface AscensionPlan {
  steps: AscensionStep[];
  // TODO: Add initial state, total SE, etc.
}

// Helper to generate step label like "C1", "I2", etc.
export function getStepLabel(step: AscensionStep): string {
  return `${VIRTUE_EGG_ABBREV[step.eggType]}${step.visitNumber}`;
}

// Helper to generate unique ID for a step
export function generateStepId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Helper to generate unique ID for a scheduled launch
export function generateLaunchId(): string {
  return 'launch-' + Math.random().toString(36).substring(2, 9);
}

// Calculate visit numbers for a sequence of steps
export function calculateVisitNumbers(steps: AscensionStep[]): void {
  const visitCounts: Record<VirtueEgg, number> = {
    curiosity: 0,
    integrity: 0,
    kindness: 0,
    humility: 0,
    resilience: 0,
  };

  for (const step of steps) {
    visitCounts[step.eggType]++;
    step.visitNumber = visitCounts[step.eggType];
  }
}

// Epic research levels relevant to virtue planning
export interface EpicResearchLevels {
  siloCapacity: number;           // +6 min/silo (Resilience)
  cheaperContractors: number;     // -5% hab cost (Integrity)
  bustUnions: number;             // -5% vehicle cost (Kindness)
  transportationLobbyist: number; // +5% shipping capacity (Kindness)
  labUpgrade: number;             // -5% research cost (Curiosity)
  afxMissionTime: number;         // FTL Drive: -1% mission duration per level (max 60)
  afxMissionCapacity: number;     // Zero-g Quantum: +5% capacity per level (max 10)
}

// Initial data passed from player backup
export interface InitialData {
  soulEggs: number;
  truthEggs: number;
  totalShifts: number;
  totalResets: number;
  virtueEggsLaid: Record<VirtueEgg, number>;
  clothedTruthEggs: number;
  artifacts: ArtifactLoadout;
  modifiers?: Modifiers;
  epicResearch: EpicResearchLevels;
}

// Serialization helpers moved to lib/serialization.ts (using protobuf)
