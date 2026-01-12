// https://egg-inc.fandom.com/wiki/Vehicles

import {
  ei,
  VehicleType,
  Vehicle,
  isVehicleId,
  vehicleTypes,
  ShippingCapacityResearch,
  ShippingCapacityResearchInstance,
} from 'lib';
import { getResearchesByCategory } from '../researches';
import { shippingCapacityMultiplier } from '../effects';
import { Artifact, Research, ResearchInstance } from '../types';
import { farmResearches } from './common';

export type { VehicleType, Vehicle, ShippingCapacityResearch, ShippingCapacityResearchInstance } from 'lib';
export { isVehicleId, vehicleTypes } from 'lib';

function isHoverVehicle(vehicle: VehicleType): boolean {
  return vehicle.id >= 9;
}

function isHyperloop(vehicle: VehicleType): boolean {
  return vehicle.id === 11;
}

const availableShippingCapacityResearches: ShippingCapacityResearch[] = [
  {
    id: 'leafsprings',
    name: 'Improved Leafsprings',
    maxLevel: 30,
    perLevel: 0.05,
  },
  {
    id: 'lightweight_boxes',
    name: 'Lightweight Boxes',
    maxLevel: 40,
    perLevel: 0.1,
  },
  {
    id: 'driver_training',
    name: 'Driver Training',
    maxLevel: 30,
    perLevel: 0.05,
  },
  {
    id: 'super_alloy',
    name: 'Super Alloy Frames',
    maxLevel: 50,
    perLevel: 0.05,
  },
  {
    id: 'quantum_storage',
    name: 'Quantum Egg Storage',
    maxLevel: 20,
    perLevel: 0.05,
  },
  {
    id: 'hover_upgrades',
    name: 'Hover Upgrades',
    maxLevel: 25,
    perLevel: 0.05,
    hoverOnly: true,
  },
  {
    id: 'dark_containment',
    name: 'Dark Containment',
    maxLevel: 25,
    perLevel: 0.05,
  },
  {
    id: 'neural_net_refine',
    name: 'Neural Net Refinement',
    maxLevel: 25,
    perLevel: 0.05,
  },
  {
    id: 'hyper_portalling',
    name: 'Hyper Portalling',
    maxLevel: 25,
    perLevel: 0.05,
    hyperloopOnly: true,
  },
  {
    id: 'transportation_lobbyist',
    name: 'Transportation Lobbyists',
    maxLevel: 30,
    perLevel: 0.05,
  },
];

const availableFleetSizeResearches: Research[] = getResearchesByCategory('fleet_size')
  .filter(r => r.id !== 'micro_coupling')
  .map(r => ({
    id: r.id,
    name: r.name,
    maxLevel: r.levels,
    perLevel: r.per_level,
  }));

export function farmVehicles(farm: ei.Backup.ISimulation): Vehicle[] {
  const vehicleIds = farm.vehicles!;
  const trainLengths = farm.trainLength!;
  if (vehicleIds.length !== trainLengths.length) {
    throw new Error(`vehicles and trainLength have different lengths: ${vehicleIds.length} != ${trainLengths.length}`);
  }
  const count = vehicleIds.length;
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < count; i++) {
    const vehicleId = vehicleIds[i];
    const trainLength = trainLengths[i];
    if (!isVehicleId(vehicleId)) {
      throw new Error(`${vehicleId} is not a recognized vehicle ID`);
    }
    const prototype = vehicleTypes[vehicleId];
    vehicles.push({
      ...prototype,
      trainLength,
      baseCapacity: prototype.baseCapacity * trainLength,
    });
  }
  return vehicles;
}

export function farmShippingCapacityResearches(
  farm: ei.Backup.ISimulation,
  progress: ei.Backup.IGame
): ShippingCapacityResearchInstance[] {
  return farmResearches(farm, progress, availableShippingCapacityResearches);
}

export function farmVehicleShippingCapacities(
  vehicles: Vehicle[],
  researches: ShippingCapacityResearchInstance[],
  artifacts: Artifact[],
  modifier = 1
): number[] {
  let universalMultiplier = 1;
  let hoverOnlyMultiplier = 1;
  let hyperloopOnlyMultiplier = 1;
  for (const research of researches) {
    const multiplier = 1 + research.level * research.perLevel;
    if (research.hoverOnly) {
      hoverOnlyMultiplier *= multiplier;
    } else if (research.hyperloopOnly) {
      hyperloopOnlyMultiplier *= multiplier;
    } else {
      universalMultiplier *= multiplier;
    }
  }
  const artifactsMultiplier = shippingCapacityMultiplier(artifacts);
  return vehicles.map(
    vehicle =>
      vehicle.baseCapacity *
      universalMultiplier *
      (isHoverVehicle(vehicle) ? hoverOnlyMultiplier : 1) *
      (isHyperloop(vehicle) ? hyperloopOnlyMultiplier : 1) *
      artifactsMultiplier *
      modifier
  );
}

export function farmShippingCapacity(
  farm: ei.Backup.ISimulation,
  progress: ei.Backup.IGame,
  artifacts: Artifact[],
  modifier = 1
): number {
  const vehicles = farmVehicles(farm);
  const researches = farmShippingCapacityResearches(farm, progress);
  return farmVehicleShippingCapacities(vehicles, researches, artifacts, modifier).reduce((total, s) => total + s, 0);
}

export function farmFleetSizeResearches(farm: ei.Backup.ISimulation, progress: ei.Backup.IGame): ResearchInstance[] {
  return farmResearches(farm, progress, availableFleetSizeResearches);
}

export function farmAvailableVehicleSlots(farm: ei.Backup.ISimulation, progress: ei.Backup.IGame): number {
  const researches = farmFleetSizeResearches(farm, progress);
  let slots = 4;
  for (const r of researches) {
    slots += r.level * r.perLevel;
  }
  return slots;
}
