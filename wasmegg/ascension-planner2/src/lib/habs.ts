/**
 * Hab type definitions and data.
 * Data sourced from lib/farm/hab_space.ts
 */

export type HabId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export interface Hab {
  id: HabId;
  name: string;
  iconPath: string;
  baseCapacity: number;
  /** Virtue (ascension) costs for purchasing 1st, 2nd, 3rd, 4th of this hab type */
  virtueCost: [number, number, number, number];
}

export function isHabId(x: number): x is HabId {
  return Number.isInteger(x) && x >= 0 && x <= 18;
}

export function isPortalHab(hab: Hab): boolean {
  return hab.id >= 17;
}

/**
 * All hab types in order from lowest to highest capacity.
 * https://egg-inc.fandom.com/wiki/Habitats
 * virtueCost arrays from lib/farm/hab_space.ts
 */
export const habTypes: Hab[] = [
  { id: 0, name: 'Coop', iconPath: 'egginc/ei_hab_icon_coop.png', baseCapacity: 250, virtueCost: [0, 124, 195, 269] },
  { id: 1, name: 'Shack', iconPath: 'egginc/ei_hab_icon_shack.png', baseCapacity: 500, virtueCost: [917, 1211, 1528, 1869] },
  { id: 2, name: 'Super Shack', iconPath: 'egginc/ei_hab_icon_super_shack.png', baseCapacity: 1000, virtueCost: [7664, 10501, 13739, 17451] },
  { id: 3, name: 'Short House', iconPath: 'egginc/ei_hab_icon_short_house.png', baseCapacity: 2000, virtueCost: [46272, 67413, 93773, 126139] },
  { id: 4, name: 'The Standard', iconPath: 'egginc/ei_hab_icon_the_standard.png', baseCapacity: 5000, virtueCost: [420445, 793421, 1.37022e6, 2.22519e6] },
  { id: 5, name: 'Long House', iconPath: 'egginc/ei_hab_icon_long_house.png', baseCapacity: 10000, virtueCost: [6.33733e6, 1.14327e7, 1.92559e7, 3.07639e7] },
  { id: 6, name: 'Double Decker', iconPath: 'egginc/ei_hab_icon_double_decker.png', baseCapacity: 20000, virtueCost: [9.821e7, 1.90664e8, 3.41075e8, 5.7288e8] },
  { id: 7, name: 'Warehouse', iconPath: 'egginc/ei_hab_icon_warehouse.png', baseCapacity: 50000, virtueCost: [2.968e9, 7.749e9, 1.7259e10, 3.4339e10] },
  { id: 8, name: 'Center', iconPath: 'egginc/ei_hab_icon_center.png', baseCapacity: 100000, virtueCost: [1.47501e11, 3.08995e11, 5.86216e11, 1.032e12] },
  { id: 9, name: 'Bunker', iconPath: 'egginc/ei_hab_icon_bunker.png', baseCapacity: 200000, virtueCost: [4.088e12, 8.64e12, 1.6499e13, 2.92e13] },
  { id: 10, name: 'Eggkea', iconPath: 'egginc/ei_hab_icon_eggkea.png', baseCapacity: 500000, virtueCost: [1.72448e14, 4.73363e14, 1.09e15, 2.22e15] },
  { id: 11, name: 'HAB 1000', iconPath: 'egginc/ei_hab_icon_hab1k.png', baseCapacity: 1e6, virtueCost: [9.909e15, 2.1011e16, 4.0205e16, 7.1211e16] },
  { id: 12, name: 'Hangar', iconPath: 'egginc/ei_hab_icon_hanger.png', baseCapacity: 2e6, virtueCost: [2.8472e17, 6.02995e17, 1.153e18, 2.04e18] },
  { id: 13, name: 'Tower', iconPath: 'egginc/ei_hab_icon_tower.png', baseCapacity: 5e6, virtueCost: [1.2011e19, 3.2853e19, 7.5403e19, 1.53035e20] },
  { id: 14, name: 'HAB 10,000', iconPath: 'egginc/ei_hab_icon_hab10k.png', baseCapacity: 1e7, virtueCost: [7.94835e20, 1.872e21, 3.867e21, 7.259e21] },
  { id: 15, name: 'Eggtopia', iconPath: 'egginc/ei_hab_icon_eggtopia.png', baseCapacity: 2.5e7, virtueCost: [5.6605e22, 1.75232e23, 4.33965e23, 9.26747e23] },
  { id: 16, name: 'Monolith', iconPath: 'egginc/ei_hab_icon_monolith.png', baseCapacity: 5e7, virtueCost: [1.0928e25, 4.0507e25, 1.12595e26, 2.60643e26] },
  { id: 17, name: 'Planet Portal', iconPath: 'egginc/ei_hab_icon_portal.png', baseCapacity: 1e8, virtueCost: [5.694e27, 2.7427e28, 8.8837e28, 2.27269e29] },
  { id: 18, name: 'Chicken Universe', iconPath: 'egginc/ei_hab_icon_chicken_universe.png', baseCapacity: 6e8, virtueCost: [5.2512e31, 3.89347e32, 1.579e33, 4.64e33] },
];

/**
 * Get a hab by its ID.
 */
export function getHabById(id: HabId): Hab {
  return habTypes[id];
}

/**
 * Cost modifiers for hab purchases.
 */
export interface HabCostModifiers {
  cheaperContractorsLevel: number;  // Epic research: -5% per level (max 10)
  flameRetardantMultiplier: number; // Colleggtible: 0.75-1.0
}

/**
 * Calculate the total cost multiplier from all sources.
 */
export function getHabCostMultiplier(modifiers: HabCostModifiers): number {
  const epicDiscount = 1 - (0.05 * modifiers.cheaperContractorsLevel);
  return epicDiscount * modifiers.flameRetardantMultiplier;
}

/**
 * Get the discounted price for a specific hab purchase.
 * @param hab The hab type to purchase
 * @param purchaseIndex Which purchase of this hab type (0-3)
 * @param modifiers Cost modifiers
 * @returns Discounted cost
 */
export function getDiscountedHabPrice(
  hab: Hab,
  purchaseIndex: number,
  modifiers: HabCostModifiers
): number {
  if (purchaseIndex < 0 || purchaseIndex > 3) return 0;
  const basePrice = hab.virtueCost[purchaseIndex];
  return Math.floor(basePrice * getHabCostMultiplier(modifiers));
}

/**
 * Count how many of a specific hab type are in the current slots.
 * @param habIds Current hab configuration
 * @param targetHabId The hab type to count
 * @returns Count of that hab type
 */
export function countHabsOfType(habIds: (number | null)[], targetHabId: number): number {
  return habIds.filter(id => id === targetHabId).length;
}
