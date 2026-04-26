// ============================================================
// Path of Virtue Optimizer — Core Types
// ============================================================

import { ei, MissionType } from 'lib';

/** A sensor target the player can designate */
export interface SensorTarget {
  id: string;
  name: string;
  node_id: string; // DAG node being targeted
}

/** Phase 0 + Phase 1 output: one enumerated launch option */
export interface LaunchOption {
  id: string; // `${ship.id}::${target?.id ?? "none"}`
  ship: MissionType;
  target: string | null;
  targetAfxId: ei.ArtifactSpec.Name; // numeric enum, UNKNOWN when no target
  actual_fuel: number;
  fuel_by_egg: Map<ei.Egg, number>;
  actual_time: number;
  fuel_units: integer; // copied from ship.fuel_cost
  time_units: integer; // set in Phase 2
  num_ships_launched: integer;
  supply_vector: Map<string, number>; // node_id → expected drops per launch
  yield_vector: Map<string, number>; // node_id → expected drops per launch
  legendary_yield_vector: Map<string, number>;
}

// ============================================================
// Recipe DAG
// ============================================================

export interface DAGChildRef {
  node_id: string;
  quantity: integer;
}

export interface DAGNode {
  id: string;
  display_name: string;
  is_leaf: boolean; // true = raw drop only; false = craftable
  is_root: boolean;
  required_quantity: integer; // how many needed to satisfy this node
  children: DAGChildRef[]; // empty for leaf nodes
  legendaryCraftProbability: number;
}

/** Full recipe DAG: keyed by node_id */
export type RecipeDAG = Map<string, DAGNode>;

// ============================================================
// DP Structures
// ============================================================

export interface DPCell {
  best_probability: number;
  craft_probability: number;
  drop_probability: number;
  yield_vector: Map<string, number>;
  legendary_yield_vector: Map<string, number>;
  choice_history: LaunchOption[];
}

/** dp[fuel_remaining][time_remaining] */
export type DPTable = DPCell[][];

// ============================================================
// Solution
// ============================================================

export interface LaunchSolution {
  ship: MissionType;
  actual_fuel: number;
  actual_fuel_by_egg: Map<ei.Egg, number>;
  actual_time: number;
  target: string;
  targetAfxId: ei.ArtifactSpec.Name;
  num_ships_launched: integer;
  /** true = chosen by Frank-Wolfe relaxation; false = added by local search fill */
  from_fw: boolean;
  supply_vector: Map<string, number>; // node_id → expected drops per launch
}

export interface DropRow {
  itemId: string;
  name: string;
  iconUrl: string;
  expected: number;
  relevant: boolean;
}

export interface OptimizerSolution {
  best_probability: number;
  craft_probability: number;
  drop_probability: number;
  fuel_used: number;
  fuel_by_egg: Map<ei.Egg, number>;
  time_units_used: integer;
  choice_history: LaunchSolution[];
  expected_drops: DropRow[];
  final_yield_vector: Map<string, number>;
  /** Raw Frank-Wolfe fractional solution before integer rounding + local search */
  fw_fractional?: {
    yield_vector: Map<string, number>;
    probability: number;
  };
}

// ============================================================
// Optimizer Config
// ============================================================

export interface OptimizerConfig {
  desired_artifact_node_ids: string[]; // top-level DAG nodes the player wants
  include_not_enough_data: boolean;
  fuel_tank_capacity: integer;
  time_budget_seconds: number;
}

// ============================================================
// Monte Carlo (validation)
// ============================================================

export interface SimulationConfig {
  choice_history: LaunchOption[];
  recipe_dag: RecipeDAG;
  desired_artifact_node_ids: string[];
  num_trials: integer;
}

export interface SimulationResult {
  empirical_probability: number;
  num_trials: integer;
  /** per desired-artifact empirical success rates */
  per_artifact_rates: Map<string, number>;
}

// ============================================================
// Utility alias
// ============================================================
type integer = number; // documents intent; no runtime enforcement needed
export type { integer };
