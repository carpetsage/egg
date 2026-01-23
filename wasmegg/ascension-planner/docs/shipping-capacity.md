# Shipping Capacity Module

## Location

```
lib/farm/shipping_capacity.ts
```

## Overview

This module handles vehicle and shipping capacity calculations for Egg Inc. farms. It provides:

- A complete list of all 12 vehicle types with their stats
- Functions to calculate shipping capacity based on purchased vehicles, train lengths, and research
- Support for Hyperloop train cars

## Importing

```typescript
import { vehicleTypes, vehicleList, vehicleShippableEggsPerSecondList, shippingCapacityResearches, isVehicleId } from 'lib';
// Or specifically:
import { vehicleTypes, vehicleList, vehicleShippableEggsPerSecondList, shippingCapacityResearches } from 'lib/farm/shipping_capacity';
```

## Data Structures

### `VehicleType` Interface

```typescript
interface VehicleType {
  id: VehicleId;        // 0-11
  name: string;         // Display name (e.g., "Hyperloop Train")
  baseCapacity: number; // Eggs per second (NOT per minute)
  iconPath: string;     // Asset path (e.g., "egginc/ei_vehicle_icon_hyperloop_engine.png")
}
```

### `Vehicle` Interface

Extends `VehicleType` with instance-specific data:

```typescript
interface Vehicle extends VehicleType {
  trainLength: number;  // Number of train cars (1 for non-Hyperloop, varies for Hyperloop)
}
```

**Note:** For `Vehicle`, `baseCapacity` is already multiplied by `trainLength`.

### `vehicleTypes` Array

Complete list of all 12 vehicles, ordered by tier:

| ID | Name | Base Capacity/min | Base Capacity/sec | Category |
|----|------|-------------------|-------------------|----------|
| 0 | Trike | 5K | 83.33 | Standard |
| 1 | Transit Van | 15K | 250 | Standard |
| 2 | Pickup | 50K | 833.33 | Standard |
| 3 | 10 Foot | 100K | 1,666.67 | Standard |
| 4 | 24 Foot | 250K | 4,166.67 | Standard |
| 5 | Semi | 500K | 8,333.33 | Standard |
| 6 | Double Semi | 1M | 16,666.67 | Standard |
| 7 | Future Semi | 5M | 83,333.33 | Standard |
| 8 | Mega Semi | 15M | 250,000 | Standard |
| 9 | Hover Semi | 30M | 500,000 | Hover |
| 10 | Quantum Transporter | 50M | 833,333.33 | Hover |
| 11 | Hyperloop Train | 50M | 833,333.33 | Hover + Hyperloop |

**Note:** Base capacity in the code is stored as eggs/second (divided by 60). The wiki shows eggs/minute.

### Vehicle Categories

Vehicles are categorized for research bonuses:

- **Standard** (ID 0-8): Only universal research applies
- **Hover** (ID 9-11): Universal + Hover Upgrades research applies
- **Hyperloop** (ID 11 only): Universal + Hover Upgrades + Hyper Portalling research applies

## Train Length (Hyperloop)

The Hyperloop Train (ID 11) can have multiple train cars. Each car adds another 50M eggs/min capacity. The `trainLength` property tracks this:

- Non-Hyperloop vehicles always have `trainLength: 1`
- Hyperloop can have `trainLength: 1, 2, 3, ...` based on purchased cars

## Shipping Capacity Research

The module tracks 10 researches that affect shipping capacity:

| Research ID | Name | Max Level | Per Level | Applies To |
|-------------|------|-----------|-----------|------------|
| `leafsprings` | Improved Leafsprings | 30 | +5% | All vehicles |
| `lightweight_boxes` | Lightweight Boxes | 40 | +10% | All vehicles |
| `driver_training` | Driver Training | 30 | +5% | All vehicles |
| `super_alloy` | Super Alloy Frames | 50 | +5% | All vehicles |
| `quantum_storage` | Quantum Egg Storage | 20 | +5% | All vehicles |
| `hover_upgrades` | Hover Upgrades | 25 | +5% | Hover only (ID >= 9) |
| `dark_containment` | Dark Containment | 25 | +5% | All vehicles |
| `neural_net_refine` | Neural Net Refinement | 25 | +5% | All vehicles |
| `hyper_portalling` | Hyper Portalling | 25 | +5% | Hyperloop only (ID 11) |
| `transportation_lobbyist` | Transportation Lobbyists | 30 | +5% | All vehicles |

## Functions

### `vehicleList(farm: Farm): Vehicle[]`

Returns the list of vehicles currently on a farm, including their train lengths.

```typescript
const farm = new Farm(backup, farmIndex);
const vehicles = vehicleList(farm);
// Returns array of Vehicle objects with trainLength included
```

The function reads from `farm.farm.vehicles` (array of vehicle IDs) and `farm.farm.trainLength` (array of train lengths, parallel to vehicles array).

### `shippingCapacityResearches(farm: Farm): ShippingCapacityResearchInstance[]`

Returns the current levels of all shipping-capacity-related researches on a farm.

```typescript
const researches = shippingCapacityResearches(farm);
// Returns array with current level of each relevant research
```

### `vehicleShippableEggsPerSecondList(farm, vehicles, researches): number[]`

Calculates the actual shipping capacity of each vehicle in eggs/second, accounting for:
- Research multipliers (universal, hover-only, hyperloop-only)
- Artifact set bonuses
- Train length (already factored into vehicle.baseCapacity)

```typescript
const vehicles = vehicleList(farm);
const researches = shippingCapacityResearches(farm);
const capacities = vehicleShippableEggsPerSecondList(farm, vehicles, researches);
// Returns array of eggs/second for each vehicle
// Total shipping = capacities.reduce((a, b) => a + b, 0)
```

The calculation:
1. Universal multiplier = product of (1 + level * perLevel) for standard researches
2. Hover-only multiplier = product of (1 + level * perLevel) for hover researches
3. Hyperloop-only multiplier = product of (1 + level * perLevel) for hyperloop researches
4. Each vehicle capacity = `baseCapacity * universalMult * [hoverMult if hover] * [hyperloopMult if hyperloop] * artifactMult`

### `isVehicleId(x: number): x is VehicleId`

Type guard to check if a number is a valid vehicle ID (0-11).

```typescript
if (isVehicleId(vehicleId)) {
  const vehicle = vehicleTypes[vehicleId];
}
```

## Usage in Ascension Planner

### Displaying Vehicle Options on Kindness Step

```typescript
import { vehicleTypes, iconURL, formatEIValue } from 'lib';

// Show all vehicles as purchase options
vehicleTypes.forEach(vehicle => {
  const perMinute = vehicle.baseCapacity * 60;
  console.log(`${vehicle.name}: ${formatEIValue(perMinute)}/min`);
  console.log(`Icon: ${iconURL(vehicle.iconPath, 64)}`);
});
```

### Converting Between Eggs/Second and Eggs/Minute

```typescript
// The module stores capacity in eggs/second
// To display eggs/minute (as shown in-game):
const eggsPerMinute = vehicle.baseCapacity * 60;

// To convert user input from eggs/minute to eggs/second:
const eggsPerSecond = userInputPerMinute / 60;
```

### Tracking Purchased Vehicles in Plan State

```typescript
interface KindnessStepState {
  // Array of vehicle slots, each with vehicle ID and train length
  vehicles: Array<{
    vehicleId: VehicleId;
    trainLength: number;  // Only relevant for Hyperloop (ID 11)
  }>;
}

// Calculate total shipping capacity
function calculateShippingCapacity(vehicles: KindnessStepState['vehicles']): number {
  return vehicles.reduce((total, v) => {
    const vehicleType = vehicleTypes[v.vehicleId];
    return total + (vehicleType.baseCapacity * v.trainLength);
  }, 0);
}
```

### Checking if Shipping Meets Demand

```typescript
// Compare shipping capacity to egg laying rate
function isShippingBottlenecked(
  shippingPerSecond: number,
  layingRatePerSecond: number
): boolean {
  return shippingPerSecond < layingRatePerSecond;
}
```

## Related Files

- `lib/farm/farm.ts` - Farm class with research and artifact handling
- `lib/farm/hab_space.ts` - Similar module for habitat capacity
- `lib/artifacts/effects.ts` - Artifact multiplier calculations
- `lib/units.ts` - `formatEIValue` for displaying large numbers
