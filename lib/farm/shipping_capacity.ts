// https://egg-inc.fandom.com/wiki/Vehicles

import { Farm, Research } from './farm';

type VehicleId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export function isVehicleId(x: number): x is VehicleId {
  return Number.isInteger(x) && x >= 0 && x <= 11;
}

export interface VehicleType {
  id: VehicleId;
  name: string;
  // Unupgraded shipping capacity per second.
  baseCapacity: number;
  iconPath: string;
  virtueCost: number[];
}

export interface Vehicle extends VehicleType {
  trainLength: number;
}

export const vehicleTypes: VehicleType[] = [
  {
    id: 0,
    name: 'Trike',
    baseCapacity: 5e3 / 60,
    iconPath: 'egginc/ei_vehicle_icon_trike.png',
    virtueCost: [0, 309, 513, 760, 1058, 1411, 1833, 2327, 2907, 3576, 4351, 5244, 6260, 7422, 8738, 10220, 11896],
  },
  {
    id: 1,
    name: 'Transit Van',
    baseCapacity: 15e3 / 60,
    iconPath: 'egginc/ei_vehicle_icon_transit_van.png',
    virtueCost: [3209, 3842, 4551, 5333, 6202, 7171, 8236, 9400, 10687, 12100, 13642, 15316, 17149, 19149, 21311, 23642, 26178],
  },
  {
    id: 2,
    name: 'Pickup',
    baseCapacity: 50e3 / 60,
    iconPath: 'egginc/ei_vehicle_icon_pickup.png',
    virtueCost: [11749, 15496, 20053, 25542, 32084, 39847, 48971, 59633, 72047, 86333, 102851, 121640, 143144, 167538, 194978, 226062, 260849],
  },
  {
    id: 3,
    name: '10 Foot',
    baseCapacity: 100e3 / 60,
    iconPath: 'egginc/ei_vehicle_icon_10ft.png',
    virtueCost: [87038, 152609, 251871, 396458, 600420, 880389, 1255907, 1749060, 2385027, 3193093, 4208769, 5464849, 7001651, 8872338, 11112904, 13793182, 16956678],
  },
  {
    id: 4,
    name: '24 Foot',
    baseCapacity: 250e3 / 60,
    iconPath: 'egginc/ei_vehicle_icon_24ft.png',
    virtueCost: [1573016, 3519980, 7034649, 12921596, 22190342, 36143889, 56356644, 84707849, 1.23420e8, 1.75083e8, 2.42691e8, 3.29758e8, 4.40120e8, 5.77853e8, 7.47987e8, 9.56393e8, 1.208e9],
  },
  {
    id: 5,
    name: 'Semi',
    baseCapacity: 500e3 / 60,
    iconPath: 'egginc/ei_vehicle_icon_semi.png',
    virtueCost: [43191844, 77620980, 1.31177e8, 2.10735e8, 3.24711e8, 4.83233e8, 6.98211e8, 9.83384e8, 1.354e9, 1.829e9, 2.427e9, 3.173e9, 4.091e9, 5.207e9, 6.558e9, 8.169e9, 1.0084e10],
  },
  {
    id: 6,
    name: 'Double Semi',
    baseCapacity: 1e6 / 60,
    iconPath: 'egginc/ei_vehicle_icon_double_semi.png',
    virtueCost: [9.17289e8, 2.162e9, 4.484e9, 8.462e9, 1.4853e10, 2.4593e10, 3.8862e10, 5.9053e10, 8.6818e10, 1.24087e11, 1.73080e11, 2.36351e11, 3.16887e11, 4.17833e11, 5.42613e11, 6.95516e11, 8.81116e11],
  },
  {
    id: 7,
    name: 'Future Semi',
    baseCapacity: 5e6 / 60,
    iconPath: 'egginc/ei_vehicle_icon_future_semi.png',
    virtueCost: [4.22238e14, 9.029e15, 5.8020e16, 2.21573e17, 6.31667e17, 1.492e18, 3.096e18, 5.833e18, 1.0207e19, 1.6858e19, 2.6547e19, 4.0191e19, 5.8880e19, 8.3880e19, 1.16642e20, 1.58787e20, 2.12138e20],
  },
  {
    id: 8,
    name: 'Mega Semi',
    baseCapacity: 15e6 / 60,
    iconPath: 'egginc/ei_vehicle_icon_mega_semi.png',
    virtueCost: [3.522e18, 1.2469e19, 3.3896e19, 7.7562e19, 1.57116e20, 2.90653e20, 5.01647e20, 8.18418e20, 1.277e21, 1.918e21, 2.791e21, 3.951e21, 5.462e21, 7.389e21, 9.809e21, 1.2800e22, 1.6456e22],
  },
  {
    id: 9,
    name: 'Hover Semi',
    baseCapacity: 30e6 / 60,
    iconPath: 'egginc/ei_vehicle_icon_hover_semi.png',
    virtueCost: [1.5e21, 6.909e21, 2.1656e22, 5.4053e22, 1.16069e23, 2.23827e23, 3.98078e23, 6.65111e23, 1.056e24, 1.609e24, 2.367e24, 3.382e24, 4.716e24, 6.429e24, 8.6e24, 1.1307e25, 1.4642e25],
  },
  {
    id: 10,
    name: 'Quantum Transporter',
    baseCapacity: 50e6 / 60,
    iconPath: 'egginc/ei_vehicle_icon_quantum_transporter.png',
    virtueCost: [3.45084e23, 8.34813e23, 1.756e24, 3.336e24, 5.869e24, 9.713e24, 1.5313e25, 2.3193e25, 3.3960e25, 4.8320e25, 6.7076e25, 9.1136e25, 1.21542e26, 1.59460e26, 2.06053e26, 2.62722e26, 3.31171e26],
  },
  {
    id: 11,
    name: 'Hyperloop Train',
    baseCapacity: 50e6 / 60,
    iconPath: 'egginc/ei_vehicle_icon_hyperloop_engine.png',
    virtueCost: [9.17682e26, 9.9e27, 4.7691e28, 1.54576e29, 3.95673e29, 8.65787e29, 1.694e30, 3.044e30, 5.133e30, 8.209e30, 1.2580e31, 1.8607e31, 2.6702e31, 3.7347e31, 5.1084e31, 6.8533e31, 9.0344e31],
  },
];

function isHoverVehicle(vehicle: VehicleType): boolean {
  return vehicle.id >= 9;
}

function isHyperloop(vehicle: VehicleType): boolean {
  return vehicle.id === 11;
}

export interface ShippingCapacityResearch extends Research {
  hoverOnly?: boolean;
  hyperloopOnly?: boolean;
}

export interface ShippingCapacityResearchInstance extends ShippingCapacityResearch {
  level: number;
}

const shippingCapacityRelevantResearches: ShippingCapacityResearch[] = [
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

export function vehicleList(farm: Farm): Vehicle[] {
  const vehicleIds = farm.farm.vehicles!;
  const trainLengths = farm.farm.trainLength!;
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

export function shippingCapacityResearches(farm: Farm): ShippingCapacityResearchInstance[] {
  return farm.researches(shippingCapacityRelevantResearches);
}

export function vehicleShippableEggsPerSecondList(
  farm: Farm,
  vehicles: Vehicle[],
  researches: ShippingCapacityResearchInstance[]
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
  const artifactsMultiplier = farm.artifactSet.shippingCapacityMultiplier;
  return vehicles.map(
    vehicle =>
      vehicle.baseCapacity *
      universalMultiplier *
      (isHoverVehicle(vehicle) ? hoverOnlyMultiplier : 1) *
      (isHyperloop(vehicle) ? hyperloopOnlyMultiplier : 1) *
      artifactsMultiplier
  );
}
