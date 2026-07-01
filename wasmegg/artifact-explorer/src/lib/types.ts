import { ei, MissionType } from 'lib';

// documents intent only, not enforced
type integer = number;
export type { integer };

export interface LaunchOption {
  id: string;
  ship: MissionType;
  target: string | null;
  targetAfxId: ei.ArtifactSpec.Name; // UNKNOWN when untargeted
  actualFuel: number;
  fuelByEgg: Map<ei.Egg, number>;
  actualTime: number;
  // everything this launch drops, per batch — display only
  supplyVector: Map<string, number>;
  // subset of supplyVector restricted to recipe ingredients; this is what
  // the optimizer feeds the inner LP
  yieldVector: Map<string, number>;
  legendaryYieldVector: Map<string, number>;
}

export interface DAGChildRef {
  nodeId: string;
  quantity: integer;
}

export interface DAGNode {
  id: string;
  isLeaf: boolean; // raw drop only, not craftable
  children: DAGChildRef[];
  legendaryCraftProbability: number; // non-zero only on the targeted root
}

export type RecipeDAG = Map<string, DAGNode>;

export interface LaunchSolution {
  ship: MissionType;
  actualFuel: number;
  actualFuelByEgg: Map<ei.Egg, number>;
  actualTime: number;
  target: string;
  targetAfxId: ei.ArtifactSpec.Name;
  numShipsLaunched: integer;
  supplyVector: Map<string, number>;
  legendarySupplyVector: Map<string, number>;
}

export interface DropRow {
  itemId: string;
  name: string;
  iconUrl: string;
  expected: number;
  relevant: boolean;
}

export interface TargetProbability {
  nodeId: string;
  bestProbability: number;
  craftProbability: number;
  dropProbability: number;
  expectedCrafts: number;
}

export interface OptimizerSolution {
  // the scalar probability fields describe the primary target; multi-target
  // consumers should read perTarget instead
  bestProbability: number;
  craftProbability: number;
  dropProbability: number;
  expectedCrafts: number;
  fuelUsed: number;
  fuelByEgg: Map<ei.Egg, number>;
  timeUnitsUsed: integer;
  choiceHistory: LaunchSolution[];
  expectedDrops: DropRow[];
  finalYieldVector: Map<string, number>;
  // owned-inventory head start already baked into finalYieldVector
  baseYield: Map<string, number>;
  recipeDag: RecipeDAG;
  craftPrimal: Map<string, number>;
  perTarget: TargetProbability[]; // perTarget[0] mirrors the scalar fields
}

export interface OptimizerConfig {
  desiredArtifactNodeIds: string[];
  includeNotEnoughData: boolean;
  fuelTankCapacity: integer;
  timeBudgetSeconds: number;
}
