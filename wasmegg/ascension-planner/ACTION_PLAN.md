# Egg Ascension Planner - ROI & Timeline Action Plan

## Project Goal
Transform the planner into a quantitative tool that helps users understand the time required for their ascension and make informed decisions about purchases (ROI).

---

## 1. Data Model Enhancements (`src/types.ts`)
We need to expand the `InitialData` and `AscensionStep` interfaces to track the new target metrics and artifact sets.

- [ ] **InitialData Update**:
    - `earningsArtifacts: ArtifactLoadout`
    - `elrArtifacts: ArtifactLoadout`
    - `activeArtifactSet: 'earnings' | 'elr'`
    - `targetTotalTE: number`
    - `targetGains: Record<VirtueEgg, number>` (TE to gain per egg)
    - `startTime: number` (Timestamp)
- [ ] **AscensionStep Update**:
    - `arrivalTimestamp: number`
    - `departureTimestamp: number`
    - `duration: number` (Calculated)

## 2. Updated Initial State Step (`InitialStateStep.vue`)
The "Step 0" needs to capture the starting line for the entire campaign.

- [ ] **Dual Artifact Support**:
    - Interface to manage two separate artifact loadouts (Earnings/ELR).
    - Toggle for the "Initial Active Set" on Humility.
- [ ] **Virtue Egg Progress**:
    - Input for "Current Eggs Shipped" for each of the 5 eggs.
    - Input for "Target TE to Gain" for each egg.
    - Automatic calculation of "Current TE Earned" using `TE_BREAKPOINTS`.
    - Display of "Next Threshold" for each egg.
- [ ] **Deployment Schedule**:
    - Date/Time picker for "Ascension Start". Defaults to `Date.now()`.

## 3. Persistent Completion Summary (`CompletionSummary.vue`)
A floating component (footer) that reacts to every change in the plan.

- [ ] **Time Breakdown**:
    - List each step in the chain with its duration.
    - Display "Arrival" and "Departure" times for each egg visit.
- [ ] **Total Completion Date**:
    - Sum of all step durations + start time.
- [ ] **Calculation Logic**:
    - **Intermediate Visits**: Duration = Time spent offline to earn cash for the `purchaseLog` + time for rockets to return (Humility). After purchases are made, the user is assumed to leave immediately.
    - **Final Visit per Egg**: Duration = Time required to reach the `targetGains` egg count (using `virtue_calculations.ts`).

## 4. Universal Step Header
A shared header component for Curiosity, Integrity, Kindness, Humility, and Resilience.

- [ ] **Key Metrics**:
    - Effective Lay Rate (ELR).
    - Offline Internal Hatchery Rate (IHR).
    - Time to Fill Habs (to capacity).
    - Offline Earnings (Initial & Projected).
    - Toggle: Hourly vs Daily units.
- [ ] **Window of Operation**:
    - "Estimated Arrival: [Date/Time]"
    - "Estimated Departure: [Date/Time]"

## 5. ROI & Decision Support
Integrating the 📈 icon into all purchase sections (Research, Habs, Vehicles, Silos).

- [ ] **Income-focused Purchases**:
    - Show "Recoup Time": `Cost / (New Income - Old Income)`.
- [ ] **ELR/Capacity-focused Purchases**:
    - "Cost in Time": Time spent saving for the item.
    - "Time Saved": Reduction in total time to reach the target egg count.
    - Net gain calculation: `Time Saved - Cost in Time`.
- [ ] **Visuals**:
    - Clicking the 📈 icon opens a tooltip/popover with the detailed breakdown.

## 6. Humility Artifact Persistence
Humility is where the user swaps gear.

- [ ] **Loadout Swapping**:
    - Allow selecting between the predefined "Earnings Set", "ELR Set", or a custom one for the remainder of the ascension.
    - Changes here propagate to all subsequent components in the `StepChain`.

---

## Technical Details & Logic
- **Cash Reset & Population**: 
    - Every new egg visit starts with `$0` and `0` chickens (or 1).
    - **Offline IHR** (factoring in Internal Hatchery Calm) determines population growth.
    - **Earnings Acceleration**: Earnings are calculated as an integral of population growth over time. Time-to-purchase must account for the fact that income increases as habs fill.
- **Offline Time**: All calculations assume offline production rates unless otherwise specified.
- **TE Thresholds**: Use `TE_BREAKPOINTS` from `virtue.ts` to map laid eggs $\rightarrow$ TE.
