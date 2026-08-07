# Research Purchase Optimizer Design

## Part 1 — Overview & Architecture

### Purpose

This document describes the overall architecture and philosophy of the research optimizer. It intentionally avoids implementation details; those belong in Part 2.

The optimizer's purpose is to determine **what research to buy and when to buy it** before a fixed deadline in order to maximize the player's **final delivery capability**, not their money.

---

# The True Objective

The optimizer should maximize the post-deadline delivery metric:

```text
score = min(finalLayRate, finalShippingRate)
```

where the final rates are calculated **after all predictable post-deadline transformations**.

Cash is only an intermediate resource used to buy research before the deadline.

Once the final research purchase has been made, additional earnings before the deadline have **zero value**.

---

# High-Level Architecture

The optimizer consists of four major pieces:

1. Outer Beam Search
2. Tier Unlock Macro
3. Phase 3 Delivery Macro
4. Authoritative Game Simulation

The beam makes strategic decisions.

The macros solve specialized subproblems.

The game simulation remains responsible for all economic calculations.

---

# Three Optimization Phases

## Phase 1 – Full Earnings Optimization

Consider all economically relevant research.

Examples include:

- egg value
- laying
- shipping
- delivery research
- tier unlocks

Goal: maximize future purchasing power.

## Phase 2 – Delivery-Compatible Earnings

Remove pure earnings research (for example egg value).

Remaining candidates must both:

- improve earnings
- contribute toward the final delivery objective

This naturally shifts spending toward permanent value while still growing the economy.

## Phase 3 – Final Delivery Optimization

Phase 3 is **one atomic macro**.

The existing delivery optimizer purchases the optimal remaining delivery research, applies post-deadline transformations, and computes the final delivery score.

The beam never sees intermediate Phase 3 purchases.

---

# Strategic Actions

The beam considers only meaningful actions:

- Buy relevant research
- Run Tier Unlock Macro
- Switch Phase 1 → Phase 2
- Execute Phase 3 Macro

Waiting is implicit:

> Wait until the chosen purchase becomes affordable, then buy it immediately.

---

# Tier Unlock Macro

Tier unlocks may require dozens of individually weak purchases.

Instead of exposing those purchases to the beam:

Current State → Tier Unlock Macro → Tier Unlocked State

The existing tier planner is used unchanged.

Its responsibility is tactical:

> Given that the beam has decided to pursue the next tier, reach it efficiently.

The beam determines **when** to invoke it.

---

# Phase 3 Delivery Macro

Phase 3 is treated similarly:

Current State → Phase 3 Macro → Final Delivery State

The macro:

1. Purchases the remaining delivery research.
2. Applies post-deadline transformations.
3. Computes the final delivery score.

This prevents long-term winning branches from being pruned because intermediate purchases only become valuable after the deadline.

---

# Core Design Principles

- Optimize the true objective, not cash.
- Keep economic simulation separate from search.
- Collapse long deterministic purchase sequences into macros.
- Search only strategic decisions.
- Prevent premature pruning of long-term winning branches.

---

# Assumptions

Current design assumes:

- Purchases occur immediately when affordable.
- Delaying an affordable purchase has no value.
- Post-purchase cash is effectively zero.
- Research costs only increase.
- Tier planner is deterministic.
- Phase 3 planner is deterministic.
- Phase transitions are one-way.
- There is a single purchase deadline.
- Earnings after the final purchase have no value.

---

# Remaining Documents

- Part 2 – Algorithm Specification
- Part 3 – Performance & Optimization
- Part 4 – Game Integration
