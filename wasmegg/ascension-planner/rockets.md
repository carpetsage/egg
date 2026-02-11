# Rockets Actions Plan

## Overview
A new set of actions for managing and planning rocket missions. These actions are only available to the player when they have most recently shifted to **Humility**.

The player has virtue eggs stored in their fuel tank. Since they are on Humility, rockets requiring Humility eggs can be fueled directly from the ELR — but the player may also choose to use Humility eggs from the tank. Other virtue eggs (Curiosity, Integrity, Kindness, Resilience) are drawn from the tank.

The player chooses how many of each mission type to send, watches their fuel deplete in an animated tank graphic, and gets an optimized schedule across 3 concurrent mission slots.

## Mission System
*   **Slots**: 3 mission slots run concurrently. Each slot processes missions sequentially — when one mission completes, the next queued mission in that slot begins immediately.
*   **Durations**: Short, Standard (Long), Extended (Epic).
*   **Lifecycle**:
    1.  **Purchase**: Buy the rocket using bock (earnings).
    2.  **Fill**: Fill the rocket using virtue eggs from the fuel tank (or ELR for Humility).
    3.  **Launch**: The mission runs for its duration (modified by FTL research).

## Ships and Pricing

| Ship Enum Name | Display Name | Price | Asset Path |
| :--- | :--- | :--- | :--- |
| `CHICKEN_ONE` | Chicken One | 9.700B | `egginc/afx_ship_chicken_1.png` |
| `CHICKEN_NINE` | Chicken Nine | 19.000T | `egginc/afx_ship_chicken_9.png` |
| `CHICKEN_HEAVY` | Chicken Heavy | 35.000q | `egginc/afx_ship_chicken_heavy.png` |
| `BCR` | BCR | 60.000Q | `egginc/afx_ship_bcr.png` |
| `MILLENIUM_CHICKEN` | Quintillion | 2.400s | `egginc/afx_ship_millenium_chicken.png` |
| `CORELLIHEN_CORVETTE` | Corvette | 600.000s | `egginc/afx_ship_corellihen_corvette.png` |
| `GALEGGTICA` | Galeggtica | 129.000S | `egginc/afx_ship_galeggtica.png` |
| `CHICKFIANT` | Defihent | 29.000O | `egginc/afx_ship_defihent.png` |
| `VOYEGGER` | Voyegger | 39.000N | `egginc/afx_ship_voyegger.png` |
| `HENERPRISE` | Henerprise | 310.000d | `egginc/afx_ship_henerprise.png` |
| `ATREGGIES` | Henliner | 419.000U | `egginc/afx_ship_atreggies.png` |

## Virtue Mission Fuel Requirements

Each ship+duration combo requires specific virtue eggs. Humility can be supplied from ELR or the tank; other eggs must come from the tank.

| Ship | Duration | Humility | Integrity | Curiosity | Kindness | Resilience |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Chicken One | Short | 5M | — | — | — | — |
| Chicken One | Standard | 10M | — | — | — | — |
| Chicken One | Extended | 20M | — | — | — | — |
| Chicken Nine | Short | 10M | — | — | — | — |
| Chicken Nine | Standard | 20M | — | — | — | — |
| Chicken Nine | Extended | 50M | — | — | — | — |
| Chicken Heavy | Short | 50M | — | — | — | — |
| Chicken Heavy | Standard | 100M | — | — | — | — |
| Chicken Heavy | Extended | 150M | — | — | — | — |
| BCR | Short | 100M | 10M | — | — | — |
| BCR | Standard | 150M | 20M | — | — | — |
| BCR | Extended | 200M | 30M | — | — | — |
| Quintillion | Short | 10B | 10B | — | — | — |
| Quintillion | Standard | 20B | 20B | — | — | — |
| Quintillion | Extended | 50B | 50B | — | — | — |
| Corvette | Short | 20B | 5B | — | — | — |
| Corvette | Standard | 40B | 8B | — | — | — |
| Corvette | Extended | 70B | 10B | — | — | — |
| Galeggtica | Short | 200B | 200B | 200B | — | — |
| Galeggtica | Standard | 400B | 400B | 400B | — | — |
| Galeggtica | Extended | 600B | 600B | 600B | — | — |
| Defihent | Short | 1T | — | 1T | 1T | — |
| Defihent | Standard | 2T | — | 2T | 2T | — |
| Defihent | Extended | 3T | — | 3T | 3T | — |
| Voyegger | Short | 5T | — | 10T | 5T | — |
| Voyegger | Standard | 10T | — | 20T | 10T | — |
| Voyegger | Extended | 15T | — | 25T | 15T | — |
| Henerprise | Short | 10T | — | 15T | 10T | — |
| Henerprise | Standard | 15T | — | 20T | 15T | 10T |
| Henerprise | Extended | 25T | — | 25T | 25T | 20T |
| Henliner | Short | 20T | — | 25T | 20T | — |
| Henliner | Standard | 30T | — | 40T | 30T | 20T |
| Henliner | Extended | 75T | — | 50T | 75T | 40T |

## Mission Durations

Base durations before FTL reduction. Ships from Quintillion onward are FTL-capable.

| Ship | Short | Standard | Extended | FTL? |
| :--- | :--- | :--- | :--- | :--- |
| Chicken One | 20m | 1h | 2h | No |
| Chicken Nine | 30m | 1h | 3h | No |
| Chicken Heavy | 45m | 1h 30m | 4h | No |
| BCR | 1h 30m | 4h | 8h | No |
| Quintillion | 3h | 6h | 12h | Yes |
| Corvette | 4h | 12h | 24h | Yes |
| Galeggtica | 6h | 16h | 30h | Yes |
| Defihent | 8h | 24h | 48h | Yes |
| Voyegger | 12h | 36h | 72h | Yes |
| Henerprise | 24h | 48h | 96h | Yes |
| Henliner | 48h | 72h | 96h | Yes |

## Epic Research
*   **FTL Drive Upgrades**:
    *   **Icon**: `egginc/r_icon_afx_mission_duration.png`
    *   **Levels**: 0 to 60.
    *   **Effect**: Reduces duration by 1% per level. Formula: `duration × (1 − 0.01 × level)`.
    *   **Scope**: FTL ships only (Quintillion and above).
    *   **Integration**: Read from `epicResearchFTLLevel` in player data. Applied dynamically to displayed durations.

## Virtue Egg Assets

| Egg | Asset Path |
| :--- | :--- |
| Humility | `egginc/egg_humility.png` |
| Curiosity | `egginc/egg_curiosity.png` |
| Integrity | `egginc/egg_integrity.png` |
| Kindness | `egginc/egg_kindness.png` |
| Resilience | `egginc/egg_resilience.png` |

## Fueling Logic
*   **Humility Eggs**: Can be supplied from the ELR (player is on Humility) or from the fuel tank. The player may store Humility eggs in the tank and draw from either source.
*   **Other Virtue Eggs** (Curiosity, Integrity, Kindness, Resilience): Must be supplied from the fuel tank.
*   **Tank Constraint**: The player cannot queue missions whose total fuel requirements (from tank) exceed what's stored for each egg type.

---

## UI Design

### Mission Grid

A table with **one row per ship** and **three column groups** (Short, Standard, Extended). Each cell is compact:

```
┌─────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│ Ship        │ Short               │ Standard            │ Extended            │
├─────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│ [img]       │ 19h12m              │ 28h48m              │ 38h24m              │
│ Henliner    │ [🥚]25T [🥚]20T    │ [🥚]40T [🥚]30T    │ [🥚]50T [🥚]75T    │
│ 419U        │                     │ [🥚]20T             │ [🥚]40T             │
│ save: 2d3h  │ max: 2  [__2__]     │ max: 1  [__1__]     │ max: 0  [____]      │
├─────────────┼─────────────────────┼─────────────────────┼─────────────────────┤
│ [img]       │ 9h36m               │ 19h12m              │ 38h24m              │
│ Henerprise  │ [🥚]15T [🥚]10T    │ [🥚]20T [🥚]15T    │ [🥚]25T [🥚]25T    │
│ 310d        │                     │ [🥚]10T             │ [🥚]20T             │
│ save: 1d5h  │ max: 3  [__2__]     │ max: 2  [__1__]     │ max: 1  [__0__]     │
└─────────────┴─────────────────────┴─────────────────────┴─────────────────────┘

(where [🥚] represents the small egg asset image for that egg type, e.g. egg_curiosity.png)
```

#### Cell Layout (compact)

Each duration cell contains:

1. **Duration** — mission time after FTL reduction (e.g., `19h12m`)
2. **Fuel** — each required egg shown as its small asset image followed by the amount (e.g., `[egg_curiosity] 25T [egg_kindness] 20T`). Uses the egg icons from the Virtue Egg Assets table. All eggs are shown including Humility (since the player may choose to fuel from tank).
3. **Max & Input** — `max: N` (how many the tank can currently support) and a number input `[__]`

#### Ship Column (left)

Each row's ship column shows:

1. **Ship icon** — the rocket asset image (e.g., `afx_ship_atreggies.png`)
2. **Ship name** (e.g., `Henliner`)
3. **Price** (formatted, e.g., `419U`)
4. **Save time** — how long to earn the price at current earnings rate (e.g., `save: 2d3h`). Calculated as `price / earningsPerSecond`.

#### Behavior
- Ships where the player can't afford even one (price > current bock) are **grayed out** but still visible.
- Ships that require eggs the player has zero of are shown with `max: 0` and the input is disabled.
- The grid is sorted with the **most expensive/powerful ships at the top** (Henliner first, Chicken One last).

### Fuel Tank Graphic

A visual fuel tank displayed alongside the grid showing current egg levels:

```
┌──────────────────────────────────────┐
│ Fuel Tank  Lv.7                      │
│                                      │
│ [egg_humility]  ████████████  80T    │
│ [egg_curiosity] ██████████████ 120T  │
│ [egg_integrity] ██████        45T    │
│ [egg_kindness]  ████          30T    │
│ [egg_resilience]██            15T    │
│                                      │
│ Total: 290T / 500T                   │
└──────────────────────────────────────┘
```

*   Bars are all the same color. Each row is identified by the egg asset image on the left.
*   Only eggs with a non-zero amount in the tank are shown (if the player has no Integrity, that row is hidden).
*   Humility is included — the player may store Humility eggs in the tank.
*   As the player changes mission counts in the grid, the tank **animates** (CSS transition) to show the remaining fuel.
*   Each row shows the egg icon, a proportional bar, and the numeric remaining amount.

### Animation Behavior
- When a mission count input changes, the fuel cost is recalculated instantly.
- The tank bars smoothly animate (300ms CSS transition on width/height) to reflect the new remaining amounts.
- If a change would overdraw any egg, the input is clamped to the maximum affordable value and the cell flashes briefly (red border).

### Mission Summary & Schedule

Below the grid, show the optimized mission schedule and summary.

#### Scheduling Algorithm

Given the list of all queued missions (ship+duration+count), assign them to 3 slots to minimize total time:

1. **Expand** the mission list: e.g., "3 Extended Henliners" becomes 3 individual missions.
2. **Sort** all missions by duration, descending (longest first).
3. **Assign greedily**: For each mission (longest first), assign it to the slot with the **least total time** so far. This is a classic multiprocessor scheduling approximation (LPT algorithm).

This naturally achieves:
- **Minimize total time** (the LPT heuristic minimizes makespan).
- **Larger/longer ships first** (they're sorted descending).
- **Balanced slots** (always assigning to the least-loaded slot).

The **total time** = `max(slot1_total, slot2_total, slot3_total)`.

#### Summary Display

```
┌─────────────────────────────────────┐
│ Mission Summary                     │
│                                     │
│  7× Extended Henliner               │
│  3× Standard Henliner               │
│ 14× Standard Voyegger               │
│ 123× Extended BCR                   │
│                                     │
│ Total Time: 123d 22h                │
│ 147 missions                        │
└─────────────────────────────────────┘
```

*   Missions grouped by type, sorted by duration descending (most expensive first).
*   Total mission count shown below total time.
*   Only missions with count > 0 are listed.

### Validation Rules

1. **Fuel check**: Sum of all queued missions' fuel drawn from the tank must not exceed tank contents for each egg type independently. Humility is included since the player may store and use Humility eggs from the tank.
2. **Input clamping**: Each mission input's `max` is dynamically recalculated as other inputs change. If the player queues 5 Extended Henliners (50T Curiosity each = 250T total), the remaining Curiosity budget (120T - 250T < 0 → invalid, so max would be floor(120T / 50T) = 2). The max for each cell considers fuel already committed to other mission types.
3. **No partial fuel**: A mission either has full fuel or it can't be sent. No partial fueling.

### Max Calculation

For a given ship+duration, the maximum sendable count is:

```
max = min over each required egg type:
    floor((tank[egg] - committed_elsewhere[egg]) / fuel_per_mission[egg])
```

Where `committed_elsewhere[egg]` is the sum of that egg used by all other queued missions.

If the ship+duration doesn't require a given egg type, that egg is not a constraint.

---

## Implementation Tasks

### 1. Data Layer Updates
*   **`lib/missions.ts`**: Add `virtuePrice` mapping:
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
*   **`assets.json`**: Add ship icon paths.

### 2. Rocket Store (`src/stores/rockets.ts`)

New Pinia store to manage mission planning state:

```typescript
interface QueuedMission {
  ship: Spaceship;
  duration: DurationType;  // SHORT, LONG, EPIC
  count: number;
}

interface RocketState {
  queuedMissions: QueuedMission[];
}
```

**Getters:**
- `totalFuelCost`: Aggregated fuel per virtue egg across all queued missions.
- `remainingFuel`: Tank contents minus total fuel cost, per egg.
- `maxForMission(ship, duration)`: Maximum count for a given mission given remaining fuel budget.
- `totalMissionTime`: Result of the LPT scheduling algorithm — the makespan.
- `slotAssignments`: The 3-slot schedule produced by LPT.
- `missionSummary`: Grouped/sorted list for display.

**Actions:**
- `setMissionCount(ship, duration, count)`: Set count, clamped to max.
- `clearAll()`: Reset all counts to 0.

### 3. Scheduling Logic (`src/lib/rockets/scheduler.ts`)

Pure function implementing the LPT scheduling algorithm:

```typescript
interface ScheduledMission {
  ship: Spaceship;
  duration: DurationType;
  durationSeconds: number;
}

interface SlotSchedule {
  missions: ScheduledMission[];
  totalSeconds: number;
}

function scheduleMissions(
  missions: ScheduledMission[],
  slotCount: number = 3
): SlotSchedule[]
```

1. Sort missions by `durationSeconds` descending.
2. Initialize `slotCount` empty slots.
3. For each mission, assign to the slot with the smallest `totalSeconds`.
4. Return the slot schedules.

### 4. UI Components

#### `RocketActions.vue` (main component)
- Rendered when the player's current egg is Humility.
- Contains the mission grid, fuel tank graphic, and summary.
- Reads fuel tank state from `useFuelTankStore`.
- Reads earnings rate from snapshot for save-time calculation.
- Reads FTL research level from snapshot for duration calculation.

#### `FuelTankGraphic.vue` (tank visualization)
- Horizontal bars (same color) for each virtue egg, including Humility.
- Each row: egg asset icon, proportional bar, numeric remaining amount.
- Rows with zero eggs are hidden.
- Props: `fuelAmounts`, `committed` (from rocket store), `capacity`.
- CSS transitions (300ms ease) on bar widths for smooth animation.

#### `MissionGrid.vue` (the grid table)
- Row per ship with rocket asset icon (sorted expensive→cheap: Henliner at top).
- 3 column groups: Short, Standard, Extended.
- Each cell: duration, fuel shown as egg asset icons with amounts, max count, number input.
- Grayed-out rows for unaffordable ships.
- Disabled inputs for missions with max: 0.
- Red flash on overcommit attempt.

#### `MissionSummary.vue` (schedule output)
- Lists queued missions grouped by ship+duration, sorted by duration desc.
- Shows total time and total mission count.
- Format: `7× Extended Henliner`.

### 5. Action Integration
*   Add `'launch_missions'` to the `ActionType` union in `src/types/actions.ts`.
*   Create `LaunchMissionsPayload`:
    ```typescript
    interface LaunchMissionsPayload {
      missions: Array<{
        ship: Spaceship;
        duration: DurationType;
        count: number;
      }>;
    }
    ```
*   Create executor in `src/lib/actions/executors/launch_missions.ts`:
    - Deducts fuel from the fuel tank.
    - Records the mission schedule.
    - Advances time by the total mission time (makespan).
*   The action summary line format:
    ```
    7× Extended Henliner, 3× Standard Henliner, 14× Standard Voyegger, 123× Extended BCR
    Total Time: 123d 22h
    ```
