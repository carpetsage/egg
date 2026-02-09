# Rockets Actions Plan

## Overview
A new set of actions for managing and planning rocket missions. These actions are only available to the player when they have most recently shifted to **Humility**.

## Mission System
*   **Slots**: There are 3 mission slots, allowing up to 3 missions to be active or planned simultaneously.
*   **Durations**: Each mission can have one of three durations:
    *   **Short** (Short)
    *   **Standard** (Long)
    *   **Extended** (Epic)
*   **Lifecycle**:
    1.  **Purchase**: Buy the rocket using **Gems**.
    2.  **Fill**: Fill the rocket using **Eggs**.
    3.  **Mission**: The mission takes a certain duration once launched.

## Ships and Pricing
The following table maps the spaceships to their gem prices and asset paths.

| Ship Enum Name | Display Name | Gem Price | Asset Path |
| :--- | :--- | :--- | :--- |
| `CHICKEN_ONE` | Chicken One | 9.700B | `egginc/afx_ship_chicken_1.png` |
| `CHICKEN_NINE` | Chicken Nine | 19.000T | `egginc/afx_ship_chicken_9.png` |
| `CHICKEN_HEAVY` | Chicken heavy | 35.000q | `egginc/afx_ship_chicken_heavy.png` |
| `BCR` | BCR | 60.000Q | `egginc/afx_ship_bcr.png` |
| `MILLENIUM_CHICKEN` | Quintillion | 2.400s | `egginc/afx_ship_millenium_chicken.png` |
| `CORELLIHEN_CORVETTE` | Corvette | 600.000s | `egginc/afx_ship_corellihen_corvette.png` |
| `GALEGGTICA` | Galeggtica | 129.000S | `egginc/afx_ship_galeggtica.png` |
| `CHICKFIANT` | Defihent | 29.000O | `egginc/afx_ship_defihent.png` |
| `VOYEGGER` | Voyegger | 39.000N | `egginc/afx_ship_voyegger.png` |
| `HENERPRISE` | Henerprise | 310.000d | `egginc/afx_ship_henerprise.png` |
| `ATREGGIES` | Henliner | 419.000U | `egginc/afx_ship_atreggies.png` |

## Fueling Logic
*   **Humility Eggs**: Can be supplied from the **Fuel Tank** or directly from the **ELR** (Egg Laying Rate).
*   **Other Eggs**: Must be supplied from the **Fuel Tank**. These subtract from the total eggs stored in the tank.
*   **Requirements**: Fuel requirements vary by ship and duration, as defined in `virtueMissionFuelsInfo` in `lib/missions.ts`.

## Epic Research
*   **FTL Drive Upgrades**:
    *   **Icon**: `egginc/r_icon_afx_mission_duration.png`
    *   **Levels**: 0 to 60.
    *   **Effect**: Reduces the duration of missions by 1% per level.
    *   **Scope**: Primarily affects FTL ships (`Quintillion` and above).
    *   **Integration**: The current research level should be pulled from the player's data (`epicResearchFTLLevel`) and applied dynamically to mission durations. The UI should explicitly show that this research is being factored into the time estimates.


## Implementation Tasks

### 1. Data Mode Updates
*   **`lib/missions.ts`**: Add `virtuePrice` mapping to the spaceship data without altering existing structures.
    ```typescript
    export const virtuePrice: Record<Spaceship, number> = {
      [Spaceship.CHICKEN_ONE]: 9.7e9,
      [Spaceship.CHICKEN_NINE]: 19e12,
      [Spaceship.CHICKEN_HEAVY]: 35e15,
      [Spaceship.BCR]: 60e18,
      [Spaceship.MILLENIUM_CHICKEN]: 2.4e21,
      [Spaceship.CORELLIHEN_CORVETTE]: 600e21,
      [Spaceship.GALEGGTICA]: 129e24,
      [Spaceship.CHICKFIANT]: 29e27,
      [Spaceship.VOYEGGER]: 39e30,
      [Spaceship.HENERPRISE]: 310e33,
      [Spaceship.ATREGGIES]: 419e36,
    };
    ```
*   **`assets.json`**: Populate `assets.json` with the ship icon paths derived from `spaceshipIconPath`.

### 2. Engine Actions
*   Implement `ApplyRocketAction` in the engine.
*   Update state to track the 3 mission slots and their current status (Idle, Fueling, Exploring).
*   Handle time progression for missions.

### 3. UI Components
*   Create a `RocketActions.vue` component to manage mission planning.
*   Display mission status and allow selection of ships/durations for empty slots.
*   Integrate with the existing Humility shift logic.
*   Show gem and egg costs for planned missions.
