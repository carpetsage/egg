# Research Purchase Optimizer Design

## Part 3 — Performance & Optimization

# Purpose

This document describes how to make the optimizer practical in JavaScript running inside a phone or laptop web browser.

The optimizer is approximate by design. Performance therefore depends on choosing a beam width and implementation strategy that provide a strong solution without excessive CPU time, memory use, or UI blocking.

This document focuses on:

- computational complexity
- beam sizing
- state representation
- allocation control
- deduplication
- macro cost
- caching
- browser threading
- benchmarking
- convergence testing
- future optimization opportunities

---

# Expected Problem Scale

Typical inputs are expected to have:

- a 1–3 week purchase window
- approximately 10 strategically relevant research actions at a given decision point
- approximately 10–200 purchases in the final winning sequence
- roughly 55 research types and 1,700 total research levels globally
- one tier-unlock macro available when the next tier is reachable
- one Phase 3 terminal macro available from Phase 2

The full 1,700-level game tree should never be searched directly.

The optimizer works only with strategically relevant actions and macro-actions.

---

# Why the 1–3 Week Time Window Is Not the Main Cost

The optimizer should be event-driven.

Do not simulate every second, minute, or hour.

Instead, each ordinary research action means:

```text
wait until this research becomes affordable
buy it immediately
```

Therefore, the computational cost is driven primarily by:

```text
beam width
×
candidate actions per state
×
search depth
```

not by the number of seconds in the time horizon.

A 3-week horizon is not intrinsically much more expensive than a 1-week horizon if the number of strategic purchases is similar.

---

# Basic Complexity Estimate

Let:

```text
K = beam width
B = average number of candidate actions per state
D = number of outer-search purchase decisions
```

A rough upper estimate for ordinary state transitions is:

```text
K × B × D
```

Example:

```text
K = 2,000
B = 10
D = 100
```

gives approximately:

```text
2,000,000 candidate transitions
```

At 200 outer decisions:

```text
4,000,000 candidate transitions
```

This is realistic in modern JavaScript if each transition is mostly arithmetic and state copying is tightly controlled.

---

# Macro Actions Reduce Search Width

Two important operations are intentionally represented as macros:

- tier unlocking
- Phase 3 final delivery optimization

This is good for both search quality and performance.

Without macros, the beam might need to explore dozens of low-value tier filler purchases and many Phase 3 purchases individually.

Instead:

```text
ordinary research actions
+
tier unlock macro
+
phase transition
+
phase 3 macro
```

remain a relatively small outer branching factor.

The expensive internal sequences are solved by specialized deterministic logic instead of being exposed to the beam.

---

# Most Important Performance Rule: Keep Search States Small

Do not clone the entire 1,700-level game state for every candidate.

A naive implementation like:

```js
const nextLevels = [...state.researchLevels];
```

where `researchLevels` contains all 1,700 levels would create enormous memory traffic.

At millions of candidate expansions, that can dominate runtime and trigger frequent garbage collection.

Instead, search states should contain only mutable information relevant to the optimization.

Possible representation:

```text
State
    phase
    time
    relevantResearchLevels
    unlockedTier
    tierProgress
    compactEconomicState
    parentId
    purchaseId
```

The immutable global research database remains shared outside the beam.

---

# Store Deltas or Compact Level Vectors

If only a subset of research can change during the optimization, store only those levels.

Possible approaches:

## Compact relevant-level array

```js
levels = Uint16Array(relevantResearchCount)
```

Useful when the relevant set is stable.

## Sparse delta representation

Store only levels that differ from the starting state.

Useful when few research types change.

## Indexed compact state

Map globally defined research IDs to compact search indices.

Example:

```text
global research IDs:
[12, 18, 31, 42, 47, 63, ...]

search state:
[3, 5, 1, 0, 8, 2, ...]
```

This reduces both memory and hashing cost.

---

# Avoid Copying Purchase Histories

Do not store a full purchase-order array on every beam state.

Bad pattern:

```js
next.history = [...state.history, purchase];
```

This creates repeated copies of increasingly long arrays.

Instead store:

```text
parentStateId
purchaseId
```

Then reconstruct the winning sequence after the search completes.

Conceptually:

```text
state 847
    parent = 611
    purchase = R5-L12
```

At the end:

```text
winner
→ parent
→ parent
→ ...
→ initial state
```

Reverse the recovered sequence.

---

# Pre-Phase-3 Deduplication

A major optimization should happen before running the expensive Phase 3 macro.

Important game assumption:

> Purchases happen immediately when affordable, so immediately after a purchase the plan has effectively zero cash.

Therefore, if two states are in the same phase and have the same relevant research configuration, the earlier state strictly dominates the later one.

Rule:

```text
same phase
+
same research configuration
→ keep earliest lastPurchaseTime
```

Discard all later duplicates.

This rule should be applied aggressively before expensive terminal evaluation.

---

# Why Earliest Duplicate Dominates

Suppose:

```text
State A:
same research configuration
last purchase at day 8.2

State B:
same research configuration
last purchase at day 8.7
```

Both states have:

- the same research
- the same resulting economic mechanics
- effectively zero cash immediately after the purchase

State A is therefore simply State B with a 0.5-day head start.

Anything State B can do afterward can also be attempted from State A earlier.

State B can be discarded.

This is stronger and cheaper than a generic time/cash Pareto comparison.

---

# Deduplication Key

At minimum, the key should include:

```text
phase
research configuration
```

If other persistent game state can differ despite identical research, include those values as well.

Possible examples:

- stored inventory
- temporary boosts
- timers
- population state
- other persistent variables affecting future outcomes

Do not include irrelevant derived values that can be recomputed.

---

# Efficient Hashing

Avoid expensive string creation such as:

```js
levels.join(",")
```

for millions of states if profiling shows it is costly.

Potential alternatives:

- compact integer hashes
- rolling hashes
- typed-array hashing
- packed bit fields where level ranges permit
- Map keys using precomputed research-state IDs

A simple string key is acceptable for the first version.

Optimize only after measurement.

---

# Phase 3 Cost

Phase 3 is terminal and may internally perform many purchases.

The macro can be relatively expensive because it may:

1. repeatedly choose the best delivery research
2. wait until affordable
3. purchase it
4. update economic state
5. continue until no more useful purchases fit
6. apply post-deadline transformations
7. calculate final delivery score

Because Phase 3 is terminal, it should not return to the beam.

That limits how often it needs to be run.

Still, it may become the largest per-state cost.

Therefore:

> Deduplicate before Phase 3 whenever possible.

---

# Tier Macro Cost

Tier unlocking may also perform dozens of internal purchases.

Unlike Phase 3, tier macro results return to the outer beam.

The existing tier planner should therefore:

- mutate or clone compact states efficiently
- avoid unnecessary allocations
- avoid rebuilding global game data
- reuse derived calculations where practical

The macro should return only the resulting state and any reconstruction metadata needed for the final purchase history.

---

# Beam Width

Beam width should be configurable.

Recommended initial test values:

```text
250
500
1,000
2,000
5,000
```

Do not assume that a wider beam is automatically worthwhile.

Measure both:

```text
beam width → final solution quality
beam width → runtime
```

---

# Example Convergence Test

A healthy result might look like:

```text
Beam 250:
score 12.431q
runtime 0.4 s

Beam 500:
score 12.437q
runtime 0.7 s

Beam 1,000:
score 12.438q
runtime 1.3 s

Beam 2,000:
score 12.438q
runtime 2.6 s

Beam 5,000:
score 12.438q
runtime 7.5 s
```

In that case, beam 1,000 is probably a much better default than beam 5,000.

The optimizer is approximate, so the goal is not to maximize search effort. The goal is to find the smallest beam width that reliably converges to the same answer.

---

# Suggested User-Facing Search Modes

A practical browser implementation could expose modes such as:

```text
Fast
beam = 250

Normal
beam = 1,000

Thorough
beam = 5,000
```

This is often better than trying to detect hardware capabilities.

A phone user can choose speed.

A desktop user can request more exhaustive search.

---

# Adaptive Beam Strategy

A later improvement could increase beam width automatically until the solution stabilizes.

Example:

```text
run beam 250
run beam 500

if result changes materially:
    run beam 1,000

if still changing:
    run beam 2,000
```

Stop once additional beam width no longer improves the objective.

This avoids paying maximum runtime for easy states.

---

# JavaScript Allocation Control

JavaScript engines are fast at arithmetic but can slow dramatically under heavy object allocation and garbage collection.

Avoid creating large numbers of short-lived nested objects.

Potential techniques:

- flat arrays instead of nested objects
- typed arrays for numeric state
- object pools
- reusable candidate buffers
- index-based references instead of object pointers
- preallocated beam arrays

Start simple, but profile allocation pressure early.

---

# Prefer Structure-of-Arrays If Needed

A high-performance representation might eventually use:

```text
times[]
phases[]
lastPurchaseTimes[]
researchHashes[]
parentIds[]
purchaseIds[]
```

instead of:

```text
[
  {time, phase, ...},
  {time, phase, ...},
  ...
]
```

This structure-of-arrays model can reduce garbage and improve cache locality.

It is more complex, so do not start there unless profiling shows object overhead is significant.

---

# Avoid Recalculating Immutable Data

Global research metadata should be preprocessed once.

Examples:

- level costs
- effect categories
- tier membership
- per-level bonuses
- delivery-impact flags
- phase eligibility
- prerequisite relationships

Do not rebuild or filter this metadata from scratch for every candidate.

Precompute lookup structures.

---

# Incremental Derived Calculations

Where safe, update derived values incrementally after a purchase instead of rebuilding them from all research levels.

Examples may include:

- egg-value multiplier
- laying multiplier
- shipping multiplier
- tier purchase count
- current next-level cost

However:

> The authoritative game formulas must remain correct.

Do not introduce incremental caches that can drift from the simulation logic.

Correctness is more important than micro-optimization.

---

# Candidate Generation Filtering

The global game contains about 55 research types and 1,700 levels, but only roughly 10 are usually strategically relevant.

Candidate generation should avoid iterating over every level.

Precompute or maintain:

- next purchasable level per type
- phase eligibility
- relevant price range
- delivery-impact flag
- current tier availability

The optimizer should generally branch only over next-level purchases.

---

# Avoid Arbitrary Time Simulation

Do not run loops like:

```js
for (let second = now; second < deadline; second++) {
    simulateOneSecond();
}
```

Instead use formulas or event jumps:

```text
time until affordable
time until inventory event
time until boost expires
time until deadline
```

The number of economic events should drive runtime, not the number of clock ticks.

---

# Web Worker Requirement

The optimizer should run inside a Web Worker.

Even a 2–3 second calculation can make a web page feel broken if it blocks the main UI thread.

A Worker allows:

- responsive scrolling
- responsive buttons
- progress display
- cancellation
- longer thorough searches

The main thread should handle UI only.

---

# Worker Progress Reporting

The worker can periodically send progress messages such as:

```text
current depth
beam size
states expanded
candidates generated
duplicate states removed
phase 3 evaluations performed
best score found
elapsed time
```

Do not send updates too frequently because cross-thread messaging has overhead.

A few updates per second is plenty.

---

# Cancellation

The worker should support cancellation.

A user may:

- change input state
- change beam width
- start a new optimization
- leave the page

Use a run ID or cancellation flag so obsolete work can terminate quickly.

---

# Memoization

Memoization may be useful, but should be added selectively.

Potentially valuable caches:

## Tier macro results

Keyed by equivalent starting research state and phase-relevant economic state.

## Phase 3 results

Keyed by equivalent Phase 3 starting state.

## Derived research configuration calculations

Keyed by research-state hash.

However, continuous values or path-dependent mechanics may reduce cache hit rates.

Measure before building complicated caches.

---

# Phase 3 Memoization

Phase 3 is a particularly good candidate if many Phase 2 states deduplicate or converge to the same research configuration.

Possible cache:

```text
phase3Cache[
    researchConfiguration
    + relevantPersistentState
]
=
    finalDeliveryResult
```

Because identical research states are already pruned by earliest time, the cache may be unnecessary in some cases.

Profile first.

---

# Sorting Cost

A naive beam implementation might sort every candidate state fully.

If there are many candidates, full sorting can become expensive.

Possible later optimization:

- partial selection
- top-K heap
- quickselect
- bucketed ranking

For moderate beam sizes, normal JavaScript sorting may be perfectly adequate.

Do not optimize this prematurely.

---

# Numerical Representation

The game may involve very large values.

Use whatever numeric representation the existing game model already relies on.

If ordinary JavaScript `Number` is sufficient, it will generally be fastest.

If the game uses:

- logarithmic numbers
- arbitrary precision
- custom scientific notation

reuse that implementation rather than converting repeatedly.

Numeric-object allocation can become expensive, so profiling is especially important if every arithmetic operation creates wrapper objects.

---

# Determinism

For debugging and benchmarking, the optimizer should be deterministic.

Given the same:

- initial game state
- beam width
- configuration

it should return the same result.

Avoid random tie-breaking.

Use stable deterministic tie-breakers such as:

```text
1. higher objective
2. earlier last purchase time
3. stable research/action ID
```

Determinism makes performance regressions and algorithm changes much easier to compare.

---

# Benchmark Metrics

Every optimization run should be able to report:

```text
runtime
beam width
maximum beam size reached
states expanded
candidate states generated
duplicate states removed
tier macro calls
phase 3 macro calls
winning purchase count
winning last purchase time
final delivery score
```

These metrics are essential for tuning.

---

# Benchmark Scenarios

Maintain a small suite of representative game states.

Include:

## Early progression

- many cheap researches
- several tier unlocks
- short purchase chains

## Mid progression

- mixed earnings and delivery decisions
- active tier competition

## Late progression

- expensive purchases
- longer waiting times
- fewer relevant choices

## Long chain

- 100–200 purchases

## Phase transition stress test

- several plausible Phase 1 → Phase 2 transition points
- several plausible Phase 2 → Phase 3 transition points

## Duplicate-state stress test

- many different purchase orderings that converge to identical research states

This last case is especially important for measuring deduplication effectiveness.

---

# Exact Small-Case Validation

For small artificial scenarios, exhaustive search should be used as a ground truth.

Compare:

```text
beam result
vs.
true optimum
```

This allows measurement of:

- search quality
- required beam width
- pruning correctness
- phase transition behavior

Performance tuning must not invalidate the result.

---

# Browser Runtime Expectations

Actual performance must be measured on the real implementation.

Still, a reasonable expectation is:

```text
Beam 250–500:
interactive / near-instant on most devices

Beam ~1,000:
likely comfortable on laptops and modern phones

Beam ~2,000:
likely practical but may take several seconds on phones

Beam 5,000+:
probably better treated as "thorough" mode
```

These are only rough expectations.

The cost of:

- economic calculations
- tier planning
- Phase 3 planning
- numeric representation

will matter more than raw state-transition count.

---

# Memory Considerations

Millions of candidate transitions do not mean millions of states must remain resident simultaneously.

Reuse buffers by generation.

Typical flow:

```text
currentBeam
    ↓ expand
candidateBuffer
    ↓ deduplicate/prune
nextBeam
```

Then release or reuse `currentBeam` and the unused candidates.

Only retain:

- current generation
- next generation
- compact parent-history records needed by surviving/winning states

---

# Parent History Storage

Parent history can itself become large if every discarded state keeps a permanent history record.

Possible strategies:

## Simple Version

Keep parent records for all generated states.

Easy to implement, potentially memory-heavy.

## Better Version

Assign history nodes only to states that survive pruning.

## Best Later Version

Use persistent compact history nodes with reference counting or reconstruction checkpoints.

Start with the simplest version that fits memory.

---

# Profiling Order

Optimize in this order:

1. Correctness
2. Measure runtime
3. Measure duplicate pruning rate
4. Measure Phase 3 cost
5. Measure tier macro cost
6. Measure allocation/GC
7. Measure sorting
8. Only then add lower-level optimizations

Do not guess where the bottleneck is.

---

# Likely Highest-Value Optimizations

Based on the current design, the highest-value optimizations are likely to be:

1. Compact search state.
2. Earliest-time deduplication for identical research states.
3. Deduplication before Phase 3.
4. Macro-actions for tier unlock and Phase 3.
5. Web Worker execution.
6. Configurable beam width.
7. Candidate filtering to only relevant research.
8. Avoiding history-array copies.

These should be implemented before sophisticated optimizations.

---

# Optimizations That Can Wait

Do not initially implement:

- custom heaps
- custom hash tables
- SIMD
- WebAssembly
- GPU compute
- multi-worker parallel beam search
- complex memoization
- branch-and-bound upper bounds
- compressed binary state encodings

These may become useful later, but the current problem scale does not justify them until profiling proves otherwise.

---

# Potential Future: WebAssembly

If JavaScript becomes a bottleneck after the algorithm is stable, WebAssembly could accelerate:

- state expansion
- hashing
- numeric simulation
- Phase 3 evaluation

However, WebAssembly increases implementation complexity and integration cost.

It should be a late optimization, not part of Version 1.

---

# Potential Future: Parallelism

Beam expansion is highly parallelizable because successor states can often be evaluated independently.

Potential future approaches:

- multiple Web Workers
- chunk beam states across workers
- merge candidate results
- deduplicate centrally

This introduces synchronization and memory-copy overhead.

A single worker should be the default until profiling shows a clear need.

---

# Recommended Version 1 Performance Plan

Implement:

1. Single Web Worker.
2. Configurable beam width.
3. Compact mutable search state.
4. Event-driven affordability calculations.
5. Relevant-research filtering.
6. Tier macro.
7. Atomic Phase 3 macro.
8. Research-state deduplication by earliest last-purchase time.
9. Deduplicate before Phase 3.
10. Parent-pointer purchase history.
11. Basic runtime metrics.
12. Convergence tests at multiple beam widths.

Avoid premature micro-optimization.

---

# Performance Success Criteria

A practical browser implementation should aim for:

- no main-thread UI freezes
- deterministic results
- clear progress reporting
- cancellation support
- stable memory use
- solution convergence at moderate beam widths
- acceptable phone runtime in normal mode
- higher-quality optional thorough mode on laptops

The key performance principle is:

> **Reduce the number and size of states before trying to make individual arithmetic operations faster.**

The architecture already provides several strong reductions:

- relevant-research filtering
- tier macros
- Phase 3 macro
- phase narrowing
- earliest-time duplicate pruning

Those should do most of the work.
