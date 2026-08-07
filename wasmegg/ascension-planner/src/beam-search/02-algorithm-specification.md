# Research Purchase Optimizer Design

## Part 2 — Algorithm Specification

# Purpose

This document specifies the search algorithm independent of the underlying game implementation.

---

# State Representation

Each beam state should contain only the information necessary to continue the simulation.

Suggested fields:

- current time
- current cash
- current phase (1 or 2)
- current research levels
- unlocked tiers
- tier progress
- persistent economic state required by the simulation
- parent pointer
- purchase that produced this state
- last purchase time

Do **not** duplicate immutable game data.

---

# Beam State

```text
State
    phase
    time
    cash
    researchLevels
    tierProgress
    unlockedTiers
    economicState
    lastPurchaseTime
    parent
    purchase
```

---

# Phase Definitions

## Phase 1

Candidate actions:

- relevant earnings research
- tier unlock macro
- switch to Phase 2

## Phase 2

Candidate actions:

- relevant earnings research that also contributes to delivery
- tier unlock macro
- execute Phase 3 macro

## Phase 3

Phase 3 is terminal.

It is executed as one macro using the existing delivery optimizer.

The outer beam does not expand Phase 3 purchase-by-purchase.

---

# Tier Unlock Macro

Input:

```text
Current State
```

Output:

```text
State after next tier is unlocked
```

Internally, use the existing adaptive tier planner unchanged.

---

# Phase 3 Macro

Input:

```text
Current State
```

Process:

1. Purchase optimal delivery research until no further useful purchases fit before the deadline.
2. Apply post-deadline transformations.
3. Compute:

```text
score = min(finalLayRate, finalShippingRate)
```

Output:

- final score
- final delivery research
- final purchase time

---

# Candidate Expansion

Pseudo-code:

```text
expand(state):

    if phase == 1:

        generate:
            research actions
            tier macro
            switch to phase 2

    else if phase == 2:

        generate:
            delivery-compatible research
            tier macro
            phase 3 macro
```

Waiting is implicit.

Each purchase means:

```text
wait until affordable
purchase immediately
```

---

# Scoring

Only Phase 3 produces a final score.

```text
primary:
    maximize min(finalLay, finalShip)

secondary:
    minimize lastPurchaseTime
```

Cash after the final purchase has no value.

---

# Beam Pruning

After candidate generation:

1. Group states by:

- phase
- research configuration

2. Keep only the earliest state in each group.

Because purchases occur immediately when affordable:

- post-purchase cash is effectively zero
- earlier identical research states dominate later ones

Run this pruning before expensive Phase 3 evaluation whenever applicable.

---

# Beam Width

Use configurable beam width.

Suggested starting values:

- 250
- 500
- 1000
- 2000

Benchmark before increasing further.

---

# Purchase History

Do not copy purchase arrays.

Store:

```text
parent pointer
purchase id
```

Reconstruct the winning sequence after the search finishes.

---

# Deduplication

Key should include:

- phase
- research configuration

Add additional fields only if required by persistent game mechanics.

---

# Algorithm Loop

```text
beam = {initialState}

while beam not empty:

    generate successors

    prune duplicate research states

    evaluate phase 3 macros

    rank candidates

    keep best beamWidth
```

---

# Responsibilities

Beam search decides:

- research ordering
- tier timing
- phase transitions

Tier planner decides:

- how to reach next tier

Delivery planner decides:

- final delivery purchases

Game simulation decides:

- affordability
- earnings
- production
- bottlenecks
- research effects
- post-deadline transformations

The optimizer should never duplicate game logic.
