# Research Purchase Optimizer Design

## Part 4 — Game Integration

# Purpose

This document describes how the optimizer should integrate with the existing game code.

The optimizer should **not** reimplement game mechanics. Instead, it should act as an intelligent client of the existing simulation.

---

# Guiding Principle

The game simulation is the source of truth.

The optimizer is responsible for:

- generating candidate decisions
- invoking macro planners
- pruning
- ranking
- reconstructing the winning purchase sequence

The game simulation is responsible for:

- research costs
- affordability
- time progression
- earnings
- laying/shipping mechanics
- bottlenecks
- tier rules
- post-deadline transformations

---

# Existing Components

The optimizer should reuse two existing systems.

## Tier Unlock Planner

Inputs:

- current game state

Output:

- state after unlocking the next tier

The optimizer treats this as an atomic macro.

---

## Delivery Planner

Inputs:

- current Phase 2 state

Output:

- complete terminal delivery build

The optimizer treats this as the Phase 3 macro.

---

# Required Game Interface

The optimizer should interact with the game through a small, stable interface.

Suggested responsibilities include:

- clone or create search state
- enumerate relevant research
- enumerate Phase 2 research subset
- wait until a purchase becomes affordable
- apply a purchase
- determine next locked tier
- execute tier planner
- execute delivery planner
- apply post-deadline transformations

The optimizer should avoid reaching into unrelated game internals.

---

# Search State

The optimizer should receive a compact mutable state derived from the authoritative game state.

Only information required to continue the simulation should be copied.

Immutable game data should remain shared.

---

# Purchase Flow

For every ordinary research action:

1. Wait until affordable.
2. Purchase immediately.
3. Update the compact state.
4. Return the new search state.

There should never be an explicit "wait" action exposed to the beam.

---

# Phase Flow

Phase 1

- all relevant earnings research
- tier macro
- transition to Phase 2

Phase 2

- delivery-compatible earnings research
- tier macro
- Phase 3 macro

Phase 3

- terminal
- handled entirely by the delivery planner

---

# Winning Result

The optimizer should return:

- final delivery score
- purchase sequence
- phase transition points
- tier unlock points
- final research configuration
- last purchase time
- summary metrics (runtime, beam width, states expanded, duplicates removed)

The UI can reconstruct a human-readable timeline from the purchase sequence.

---

# Logging

During development it is useful to expose optional diagnostics:

- beam depth
- active beam size
- macro invocations
- duplicate pruning counts
- best score so far

These should be optional and removable from production builds.

---

# Testing Integration

Integration tests should compare optimizer output against direct simulation.

Recommended checks:

- purchase sequence reproduces reported score
- no illegal purchases
- tier prerequisites respected
- phase transitions occur in order
- final delivery score matches simulation

---

# Future Evolution

The optimizer interface should remain stable even if the internal search changes.

Possible future improvements such as alternate beam heuristics, parallel workers, or different pruning strategies should not require changes to the underlying game simulation.

A clean separation between search and simulation is one of the primary architectural goals.
