import { Farm, Research } from './farm';

type HabId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

function isHabId(x: number): x is HabId {
  return Number.isInteger(x) && x >= 0 && x <= 18;
}

export interface Hab {
  id: HabId;
  name: string;
  iconPath: string;
  baseHabSpace: number;
  normalCost: number[];
  virtueCost: number[];
}

// https://egg-inc.fandom.com/wiki/Habitats
const habTypes: Hab[] = [
  {
    id: 0,
    name: 'Coop',
    iconPath: 'egginc/ei_hab_icon_coop.png',
    baseHabSpace: 250,
    normalCost: [0, 29.12, 56.37, 96.56],
    virtueCost: [0, 124, 195, 269],
  },
  {
    id: 1,
    name: 'Shack',
    iconPath: 'egginc/ei_hab_icon_shack.png',
    baseHabSpace: 500,
    normalCost: [467, 803, 1256, 1861],
    virtueCost: [917, 1211, 1528, 1869],
  },
  {
    id: 2,
    name: 'Super Shack',
    iconPath: 'egginc/ei_hab_icon_super_shack.png',
    baseHabSpace: 1000,
    normalCost: [12267, 23531, 40899, 66811],
    virtueCost: [7664, 10501, 13739, 17451],
  },
  {
    id: 3,
    name: 'Short House',
    iconPath: 'egginc/ei_hab_icon_short_house.png',
    baseHabSpace: 2000,
    normalCost: [340829, 733773, 1.41885e6, 2.5512e6],
    virtueCost: [46272, 67413, 93773, 126139],
  },
  {
    id: 4,
    name: 'The Standard',
    iconPath: 'egginc/ei_hab_icon_the_standard.png',
    baseHabSpace: 5000,
    normalCost: [2.144e7, 6.81302e7, 1.78166e8, 4.08981e8],
    virtueCost: [420445, 793421, 1.37022e6, 2.22519e6],
  },
  {
    id: 5,
    name: 'Long House',
    iconPath: 'egginc/ei_hab_icon_long_house.png',
    baseHabSpace: 10000,
    normalCost: [2.321e9, 5.957e9, 1.3347e10, 2.7195e10],
    virtueCost: [6.33733e6, 1.14327e7, 1.92559e7, 3.07639e7],
  },
  {
    id: 6,
    name: 'Double Decker',
    iconPath: 'egginc/ei_hab_icon_double_decker.png',
    baseHabSpace: 20000,
    normalCost: [1.48267e11, 3.92331e11, 9.00472e11, 1.867e12],
    virtueCost: [9.821e7, 1.90664e8, 3.41075e8, 5.7288e8],
  },
  {
    id: 7,
    name: 'Warehouse',
    iconPath: 'egginc/ei_hab_icon_warehouse.png',
    baseHabSpace: 50000,
    normalCost: [1.7795e13, 6.6091e13, 1.94147e14, 4.85869e14],
    virtueCost: [2.968e9, 7.749e9, 1.7259e10, 3.4339e10],
  },
  {
    id: 8,
    name: 'Center',
    iconPath: 'egginc/ei_hab_icon_center.png',
    baseHabSpace: 100000,
    normalCost: [3.24e15, 8.752e15, 2.0397e16, 4.2893e16],
    virtueCost: [1.47501e11, 3.08995e11, 5.86216e11, 1.032e12],
  },
  {
    id: 9,
    name: 'Bunker',
    iconPath: 'egginc/ei_hab_icon_bunker.png',
    baseHabSpace: 200000,
    normalCost: [2.50213e17, 6.7664e17, 1.578e18, 3.32e18],
    virtueCost: [4.088e12, 8.64e12, 1.6499e13, 2.92e13],
  },
  {
    id: 10,
    name: 'Eggkea',
    iconPath: 'egginc/ei_hab_icon_eggkea.png',
    baseHabSpace: 500000,
    normalCost: [3.2568e19, 1.22013e20, 3.60275e20, 9.04176e20],
    virtueCost: [1.72448e14, 4.73363e14, 1.09e15, 2.22e15],
  },
  {
    id: 11,
    name: 'HAB 1000',
    iconPath: 'egginc/ei_hab_icon_hab1k.png',
    baseHabSpace: 1e6,
    normalCost: [6.045e21, 1.6323e22, 3.7997e22, 7.9803e22],
    virtueCost: [9.909e15, 2.1011e16, 4.0205e16, 7.1211e16],
  },
  {
    id: 12,
    name: 'Hangar',
    iconPath: 'egginc/ei_hab_icon_hanger.png',
    baseHabSpace: 2e6,
    normalCost: [4.63301e23, 1.249e24, 2.904e24, 6.096e24],
    virtueCost: [2.8472e17, 6.02995e17, 1.153e18, 2.04e18],
  },
  {
    id: 13,
    name: 'Tower',
    iconPath: 'egginc/ei_hab_icon_tower.png',
    baseHabSpace: 5e6,
    normalCost: [5.9264e25, 2.20221e26, 6.39288e26, 1.577e27],
    virtueCost: [1.2011e19, 3.2853e19, 7.5403e19, 1.53035e20],
  },
  {
    id: 14,
    name: 'HAB 10,000',
    iconPath: 'egginc/ei_hab_icon_hab10k.png',
    baseHabSpace: 1e7,
    normalCost: [1.2467e28, 3.7869e28, 9.5965e28, 2.14605e29],
    virtueCost: [7.94835e20, 1.872e21, 3.867e21, 7.259e21],
  },
  {
    id: 15,
    name: 'Eggtopia',
    iconPath: 'egginc/ei_hab_icon_eggtopia.png',
    baseHabSpace: 2.5e7,
    normalCost: [2.931e30, 1.2853e31, 4.1933e31, 1.12893e32],
    virtueCost: [5.6605e22, 1.75232e23, 4.33965e23, 9.26747e23],
  },
  {
    id: 16,
    name: 'Monolith',
    iconPath: 'egginc/ei_hab_icon_monolith.png',
    baseHabSpace: 5e7,
    normalCost: [2.8e33, 1.5619e34, 5.9243e34, 1.75352e35],
    virtueCost: [1.0928e25, 4.0507e25, 1.12595e26, 2.60643e26],
  },
  {
    id: 17,
    name: 'Planet Portal',
    iconPath: 'egginc/ei_hab_icon_portal.png',
    baseHabSpace: 1e8,
    normalCost: [8.573e36, 5.8683e37, 2.38757e38, 7.18323e38],
    virtueCost: [5.694e27, 2.7427e28, 8.8837e28, 2.27269e29],
  },
  {
    id: 18,
    name: 'Chicken Universe',
    iconPath: 'egginc/ei_hab_icon_chicken_universe.png',
    baseHabSpace: 6e8,
    normalCost: [3.21637e41, 3.589e42, 1.9424e43, 7.1237e43],
    virtueCost: [5.2512e31, 3.89347e32, 1.579e33, 4.64e33],
  },
];

function isPortalHab(hab: Hab): boolean {
  return hab.id >= 17;
}

export interface HabSpaceResearch extends Research {
  portalHabsOnly?: boolean;
}

export interface HabSpaceResearchInstance extends HabSpaceResearch {
  level: number;
}

const habSpaceRelevantResearches: HabSpaceResearch[] = [
  {
    id: 'hab_capacity1',
    name: 'Hen House Remodel',
    maxLevel: 8,
    perLevel: 0.05,
  },
  {
    id: 'microlux',
    name: 'Microlux™ Chicken Suites',
    maxLevel: 10,
    perLevel: 0.05,
  },
  {
    id: 'grav_plating',
    name: 'Grav Plating',
    maxLevel: 25,
    perLevel: 0.02,
  },
  {
    id: 'wormhole_dampening',
    name: 'Wormhole Dampening',
    maxLevel: 25,
    perLevel: 0.02,
    portalHabsOnly: true,
  },
];

export function habList(farm: Farm): Hab[] {
  const habs = [];
  for (const habId of farm.farm.habs || []) {
    if (habId === 19) {
      // 19 is the placeholder for unpurchased habs.
      continue;
    }
    if (!isHabId(habId)) {
      throw new Error(`${habId} is not a recognized hab ID`);
    }
    habs.push(habTypes[habId]);
  }
  return habs;
}

export function habSpaceResearches(farm: Farm): HabSpaceResearchInstance[] {
  return farm.researches(habSpaceRelevantResearches);
}

export function habSpaceList(farm: Farm, habs: Hab[], researches: HabSpaceResearchInstance[]): number[] {
  let universalMultiplier = 1;
  let portalOnlyMultiplier = 1;
  for (const research of researches) {
    const multiplier = 1 + research.level * research.perLevel;
    if (research.portalHabsOnly) {
      portalOnlyMultiplier *= multiplier;
    } else {
      universalMultiplier *= multiplier;
    }
  }
  const artifactsMultiplier = farm.artifactSet.habSpaceMultiplier;
  return habs.map(hab =>
    // Each hab's capacity rounds up individually.
    Math.ceil(
      hab.baseHabSpace * universalMultiplier * (isPortalHab(hab) ? portalOnlyMultiplier : 1) * artifactsMultiplier
    )
  );
}
