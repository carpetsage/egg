# Research Purchase Optimizer Design

## Part 5 — Design Decisions & Rationale

# Purpose

This document records **why** the optimizer is designed the way it is.

Unlike the other documents, this one is not an implementation guide. It captures the reasoning behind major architectural decisions so future changes can be evaluated against the original goals.

---

# Decision: Optimize Delivery, Not Cash

## Decision

The optimizer's objective is:

```text
maximize min(finalLayRate, finalShippingRate)
```

after all purchases and predictable post-deadline transformations.

## Rationale

Cash is only an intermediate resource. A plan with less cash at the deadline may still produce a better final delivery state if it invested earlier in delivery research.

Maximizing cash is therefore an unreliable proxy for the real objective.

---

# Decision: One Shared Purchase Deadline

## Decision

All research—earnings and delivery—is purchased before the same deadline.

## Rationale

There is no separate delivery-buying phase after the deadline. The optimizer must decide throughout the run whether another earnings-focused purchase or a delivery-focused purchase is more valuable.

---

# Decision: Three Optimization Phases

## Decision

Use three progressively narrower phases:

1. Full earnings optimization.
2. Delivery-compatible earnings optimization.
3. Final delivery optimization.

## Rationale

Early in the run, broad economic acceleration dominates.

Later, pure earnings research becomes less valuable while delivery research still contributes both to earnings and the terminal objective.

The narrowing action set reduces search complexity while matching the changing economics.

---

# Decision: Phase 3 Is an Atomic Macro

## Decision

The outer beam never expands individual Phase 3 purchases.

Instead it executes the existing delivery planner as one terminal macro.

## Rationale

Many Phase 3 purchases derive most of their value only after predictable post-deadline transformations.

If exposed individually, winning branches can be pruned before that value becomes visible.

The macro evaluates the completed result instead of intermediate steps.

---

# Decision: Tier Unlocks Are Atomic Macros

## Decision

Unlocking a tier is treated as one outer-search action.

## Rationale

Tier unlocks often require dozens of individually weak purchases.

Searching them individually greatly increases branching and encourages premature pruning.

The existing tier planner already solves the tactical unlock problem well.

The beam only needs to decide **when** to invoke it.

---

# Decision: Purchases Occur Immediately

## Decision

Whenever a chosen research becomes affordable, it is purchased immediately.

Intentional waiting is never considered.

## Rationale

Waiting provides no strategic benefit.

This greatly simplifies the search and removes explicit wait actions.

---

# Decision: Earliest Identical Research State Wins

## Decision

For states in the same phase with identical research configuration, retain only the state with the earliest last-purchase time.

## Rationale

Immediately after a purchase, effective cash is zero.

Two states with identical research therefore differ only in how early they reached that point.

The earlier state has a strict advantage and dominates the later one.

This pruning should occur before expensive Phase 3 evaluation.

---

# Decision: Beam Search

## Decision

Use beam search instead of exhaustive search.

## Rationale

The search space is far too large for exhaustive enumeration.

Beam search:

- explores competing long-term strategies
- has predictable runtime
- supports configurable quality/performance tradeoffs
- works naturally with macro actions

---

# Decision: Keep Simulation Authoritative

## Decision

The optimizer does not duplicate game logic.

## Rationale

Research effects, affordability, bottlenecks, tier rules, and post-deadline transformations already exist in the game simulation.

Duplicating those rules risks divergence and maintenance problems.

---

# Decision: Search Strategic Choices, Not Mechanics

## Decision

The optimizer searches over meaningful strategic actions rather than low-level simulation events.

## Examples

Search:

- buy research
- unlock tier
- change optimization phase
- execute Phase 3

Do not search:

- wait one second
- wait one minute
- arbitrary clock ticks

## Rationale

The simulation already knows how to advance time correctly.

---

# Decision: Correctness Before Micro-Optimization

## Decision

Version 1 should emphasize correctness, clear architecture, and profiling.

## Rationale

Most browser performance gains are expected to come from:

- compact search state
- macro actions
- duplicate pruning
- candidate filtering

Only after profiling should lower-level optimizations such as custom hashing, heaps, or WebAssembly be considered.

---

# Guiding Philosophy

The optimizer should:

- optimize the true game objective
- separate search from simulation
- expose only meaningful strategic decisions
- aggressively eliminate dominated states
- preserve long-term winning branches
- remain deterministic and testable

Whenever future changes are proposed, evaluate them against these principles before modifying the algorithm.
