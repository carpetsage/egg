/**
 * Vehicle type definitions for shipping capacity.
 */

export type VehicleId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface VehicleType {
  id: VehicleId;
  name: string;
  iconPath: string;
  baseCapacityPerSecond: number;  // Unupgraded capacity per second
  isHover: boolean;               // Hover vehicles (id >= 9)
  isHyperloop: boolean;           // Hyperloop train (id === 11)
  virtueCost: number[];
}

/**
 * All vehicle types with their base capacities.
 * Capacities are in eggs per second.
 */
export const vehicleTypes: VehicleType[] = [
  {
    id: 0,
    name: 'Trike',
    iconPath: 'egginc/ei_vehicle_icon_trike.png',
    baseCapacityPerSecond: 5e3 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      0, 309, 513, 760, 1058, 1411, 1833, 2327, 2907, 3576,
      4351, 5244, 6260, 7422, 8738, 10220, 11896
    ]
  },
  {
    id: 1,
    name: 'Transit Van',
    iconPath: 'egginc/ei_vehicle_icon_transit_van.png',
    baseCapacityPerSecond: 15e3 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      3209, 3842, 4551, 5333, 6202, 7171, 8236, 9400, 10687,
      12100, 13642, 15316, 17149, 19149, 21311, 23642, 26178
    ]
  },
  {
    id: 2,
    name: 'Pickup',
    iconPath: 'egginc/ei_vehicle_icon_pickup.png',
    baseCapacityPerSecond: 50e3 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      11749, 15496, 20053, 25542, 32084, 39847, 48971, 59633,
      72047, 86333, 102851, 121640, 143144, 167538, 194978,
      226062, 260849
    ]
  },
  {
    id: 3,
    name: '10 Foot',
    iconPath: 'egginc/ei_vehicle_icon_10ft.png',
    baseCapacityPerSecond: 100e3 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      87038, 152609, 251871, 396458, 600420, 880389, 1255907,
      1749060, 2385027, 3193093, 4208769, 5464849, 7001651,
      8872338, 11112904, 13793182, 16956678
    ]
  },
  {
    id: 4,
    name: '24 Foot',
    iconPath: 'egginc/ei_vehicle_icon_24ft.png',
    baseCapacityPerSecond: 250e3 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      1573016, 3519980, 7034649, 12921596, 22190342, 36143889,
      56356644, 84707849, 1.23420e8, 1.75083e8, 2.42691e8,
      3.29758e8, 4.40120e8, 5.77853e8, 7.47987e8,
      9.56393e8, 1.208e9
    ]
  },
  {
    id: 5,
    name: 'Semi',
    iconPath: 'egginc/ei_vehicle_icon_semi.png',
    baseCapacityPerSecond: 500e3 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      43191844, 77620980, 1.31177e8, 2.10735e8, 3.24711e8,
      4.83233e8, 6.98211e8, 9.83384e8, 1.354e9, 1.829e9,
      2.427e9, 3.173e9, 4.091e9, 5.207e9, 6.558e9,
      8.169e9, 1.0084e10
    ]
  },
  {
    id: 6,
    name: 'Double Semi',
    iconPath: 'egginc/ei_vehicle_icon_double_semi.png',
    baseCapacityPerSecond: 1e6 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      9.17289e8, 2.162e9, 4.484e9, 8.462e9, 1.4853e10,
      2.4593e10, 3.8862e10, 5.9053e10, 8.6818e10,
      1.24087e11, 1.73080e11, 2.36351e11, 3.16887e11,
      4.17833e11, 5.42613e11, 6.95516e11, 8.81116e11
    ]
  },
  {
    id: 7,
    name: 'Future Semi',
    iconPath: 'egginc/ei_vehicle_icon_future_semi.png',
    baseCapacityPerSecond: 5e6 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      4.22238e14, 9.029e15, 5.8020e16, 2.21573e17,
      6.31667e17, 1.492e18, 3.096e18, 5.833e18,
      1.0207e19, 1.6858e19, 2.6547e19, 4.0191e19,
      5.8880e19, 8.3880e19, 1.16642e20, 1.58787e20,
      2.12138e20
    ]
  },
  {
    id: 8,
    name: 'Mega Semi',
    iconPath: 'egginc/ei_vehicle_icon_mega_semi.png',
    baseCapacityPerSecond: 15e6 / 60,
    isHover: false,
    isHyperloop: false,
    virtueCost: [
      3.522e18, 1.2469e19, 3.3896e19, 7.7562e19,
      1.57116e20, 2.90653e20, 5.01647e20, 8.18418e20,
      1.277e21, 1.918e21, 2.791e21, 3.951e21,
      5.462e21, 7.389e21, 9.809e21, 1.2800e22,
      1.6456e22
    ]
  },
  {
    id: 9,
    name: 'Hover Semi',
    iconPath: 'egginc/ei_vehicle_icon_hover_semi.png',
    baseCapacityPerSecond: 30e6 / 60,
    isHover: true,
    isHyperloop: false,
    virtueCost: [
      1.5e21, 6.909e21, 2.1656e22, 5.4053e22, 1.16069e23,
      2.23827e23, 3.98078e23, 6.65111e23, 1.056e24,
      1.609e24, 2.367e24, 3.382e24, 4.716e24,
      6.429e24, 8.6e24, 1.1307e25, 1.4642e25
    ]
  },
  {
    id: 10,
    name: 'Quantum Transporter',
    iconPath: 'egginc/ei_vehicle_icon_quantum_transporter.png',
    baseCapacityPerSecond: 50e6 / 60,
    isHover: true,
    isHyperloop: false,
    virtueCost: [
      3.45084e23, 8.34813e23, 1.756e24, 3.336e24,
      5.869e24, 9.713e24, 1.5313e25, 2.3193e25,
      3.3960e25, 4.8320e25, 6.7076e25, 9.1136e25,
      1.21542e26, 1.59460e26, 2.06053e26,
      2.62722e26, 3.31171e26
    ]
  },
  {
    id: 11,
    name: 'Hyperloop Train',
    iconPath: 'egginc/ei_vehicle_icon_hyperloop_engine.png',
    baseCapacityPerSecond: 50e6 / 60,
    isHover: true,
    isHyperloop: true,
    virtueCost: [
      9.17682e26, 9.9e27, 4.7691e28, 1.54576e29,
      3.95673e29, 8.65787e29, 1.694e30, 3.044e30,
      5.133e30, 8.209e30, 1.2580e31, 1.8607e31,
      2.6702e31, 3.7347e31, 5.1084e31,
      6.8533e31, 9.0344e31
    ]
  }
];

/**
 * Check if a number is a valid vehicle ID.
 */
export function isVehicleId(x: number): x is VehicleId {
  return Number.isInteger(x) && x >= 0 && x <= 11;
}

/**
 * Get a vehicle type by ID.
 */
export function getVehicleType(id: number): VehicleType | undefined {
  if (!isVehicleId(id)) return undefined;
  return vehicleTypes[id];
}

/**
 * Base fleet size without research.
 */
export const BASE_FLEET_SIZE = 4;

/**
 * Base train length for hyperloop without research.
 */
export const BASE_TRAIN_LENGTH = 5;

/**
 * Maximum train length with all research.
 */
export const MAX_TRAIN_LENGTH = 10;

/**
 * Hyperloop train car virtue costs.
 * Index 0 = first car (free, comes with train), Index 1-9 = additional cars.
 */
export const HYPERLOOP_CAR_VIRTUE_COSTS: readonly number[] = [
  0,           // 1st car (free with train)
  1.13231e26,  // 2nd car
  6.86482e26,  // 3rd car
  2.518e27,    // 4th car
  6.96e27,     // 5th car
  1.6056e28,   // 6th car
  3.2636e28,   // 7th car
  6.0422e28,   // 8th car
  1.0420e29,   // 9th car
  1.69709e29,  // 10th car
];

/**
 * Cost modifiers for vehicle purchases.
 */
export interface VehicleCostModifiers {
  bustUnionsLevel: number;      // Epic research: -5% per level (max 10)
  lithiumMultiplier: number;    // Colleggtible: 0.90-1.0
}

/**
 * Calculate the total cost multiplier from all sources.
 */
export function getVehicleCostMultiplier(modifiers: VehicleCostModifiers): number {
  const epicDiscount = 1 - (0.05 * modifiers.bustUnionsLevel);
  return epicDiscount * modifiers.lithiumMultiplier;
}

/**
 * Count how many of a specific vehicle type are in slots before a given index.
 */
export function countVehiclesOfTypeBefore(
  vehicles: { vehicleId: number | null }[],
  targetVehicleId: number,
  beforeIndex: number
): number {
  return vehicles.slice(0, beforeIndex).filter(v => v.vehicleId === targetVehicleId).length;
}

/**
 * Get the discounted price for purchasing a vehicle at a specific slot.
 * @param vehicleId The vehicle type to purchase
 * @param purchaseIndex Which purchase of this vehicle type (0-16)
 * @param modifiers Cost modifiers
 * @returns Discounted cost
 */
export function getDiscountedVehiclePrice(
  vehicleId: number,
  purchaseIndex: number,
  modifiers: VehicleCostModifiers
): number {
  const vehicle = getVehicleType(vehicleId);
  if (!vehicle) return 0;
  if (purchaseIndex < 0 || purchaseIndex >= vehicle.virtueCost.length) return 0;

  const basePrice = vehicle.virtueCost[purchaseIndex];
  return Math.floor(basePrice * getVehicleCostMultiplier(modifiers));
}

/**
 * Get the discounted price for adding a train car to hyperloop.
 * @param carIndex Which car (0 = free first car, 1-9 = additional cars)
 * @param modifiers Cost modifiers
 * @returns Discounted cost
 */
export function getDiscountedTrainCarPrice(
  carIndex: number,
  modifiers: VehicleCostModifiers
): number {
  if (carIndex < 0 || carIndex >= HYPERLOOP_CAR_VIRTUE_COSTS.length) return 0;

  const basePrice = HYPERLOOP_CAR_VIRTUE_COSTS[carIndex];
  return Math.floor(basePrice * getVehicleCostMultiplier(modifiers));
}
