// Shared fixtures for the optimizer specs: hand-built DAG nodes and launch
// options with small controlled numbers so tests can assert exact arithmetic.

import { ei, MissionType } from 'lib';
import type { DAGNode, LaunchOption } from './types';

export function makeNode(id: string, isLeaf: boolean, children: [string, number][] = [], pCraft = 0): DAGNode {
  return {
    id,
    isLeaf,
    children: children.map(([nodeId, quantity]) => ({ nodeId, quantity })),
    legendaryCraftProbability: pCraft,
  };
}

// The ship is irrelevant to the optimizer core (only the presentation layer
// reads it), so every fixture option flies the same one.
const fixtureShip = new MissionType(ei.MissionInfo.Spaceship.CHICKEN_ONE, ei.MissionInfo.DurationType.SHORT);

let seq = 0;

export function makeOpt(
  actualFuel: number,
  actualTime: number,
  yieldEntries: [string, number][],
  legendaryEntries: [string, number][] = [],
  targetAfxId: ei.ArtifactSpec.Name = ei.ArtifactSpec.Name.UNKNOWN
): LaunchOption {
  return {
    id: `opt-${seq++}`,
    ship: fixtureShip,
    target: null,
    targetAfxId,
    actualFuel,
    fuelByEgg: new Map(),
    actualTime,
    supplyVector: new Map(yieldEntries),
    yieldVector: new Map(yieldEntries),
    legendaryYieldVector: new Map(legendaryEntries),
  };
}
