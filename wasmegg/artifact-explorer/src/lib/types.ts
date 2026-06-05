// ============================================================
// Path of Virtue Optimizer — Core Types
// ============================================================

import { ei, MissionType } from 'lib';

/** Marks a `number` that is logically an integer. Documents intent only; not enforced at runtime. */
type integer = number;
export type { integer };

/** Phase 0 + Phase 1 output: one enumerated launch option */
export interface LaunchOption {
  id: string; // `${ship.id}::${target?.id ?? "none"}`
  ship: MissionType;
  target: string | null;
  targetAfxId: ei.ArtifactSpec.Name; // numeric enum, UNKNOWN when no target
  actual_fuel: number;
  fuel_by_egg: Map<ei.Egg, number>;
  actual_time: number;
  // Every item this launch drops (node_id → expected count per launch batch), including
  // items that are not recipe ingredients. Drives the "expected drops" display only.
  supply_vector: Map<string, number>;
  // The subset of supply_vector restricted to recipe-DAG ingredients. This is what the
  // optimizer feeds into the inner crafting LP.
  yield_vector: Map<string, number>;
  // node_id → expected legendary drops per launch batch (for the root and any
  // legendary-bearing ingredient).
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
  is_leaf: boolean; // true = raw drop only; false = craftable
  children: DAGChildRef[]; // empty for leaf nodes
  legendaryCraftProbability: number; // per-craft chance of a legendary; non-zero only on the targeted root
}

/** Full recipe DAG: keyed by node_id */
export type RecipeDAG = Map<string, DAGNode>;

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
  supply_vector: Map<string, number>; // node_id → expected drops per launch
  legendary_supply_vector: Map<string, number>; // node_id → legendary drops per batch
}

export interface DropRow {
  itemId: string;
  name: string;
  iconUrl: string;
  expected: number;
  relevant: boolean;
}

/** Per-target probability breakdown for multi-target runs. */
export interface TargetProbability {
  nodeId: string;
  best_probability: number;
  craft_probability: number;
  drop_probability: number;
  expected_crafts: number;
}

export interface OptimizerSolution {
  // Scalar fields report the primary target (desired_artifact_node_ids[0]).
  best_probability: number;
  craft_probability: number;
  drop_probability: number;
  expected_crafts: number;
  fuel_used: number;
  fuel_by_egg: Map<ei.Egg, number>;
  time_units_used: integer;
  choice_history: LaunchSolution[];
  expected_drops: DropRow[];
  final_yield_vector: Map<string, number>;
  recipe_dag: RecipeDAG;
  craft_primal: Map<string, number>;
  /** One entry per desired target, in order; per_target[0] mirrors the scalar fields. */
  per_target: TargetProbability[];
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
