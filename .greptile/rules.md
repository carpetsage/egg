# Egg, Inc. helper tools — review context

A pnpm-workspaces monorepo of community helper tools for the game Egg, Inc.

## What to prioritise

**Cross-workspace correctness above all.** This is where real bugs in this repo hide — a change that looks locally fine but breaks a consumer three workspaces away. `lib/` is shared by 21 of the 24 workspaces in `pnpm-workspace.yaml`, but depending on the package is not the same as importing a given symbol: trace the specific changed export to its actual consumers and name them, rather than asserting a repo-wide blast radius.

**Correctness of the game math over its elegance.** These tools compute values players use to make in-game decisions, so a subtly wrong formula is the worst possible outcome — worse than an inefficient or inelegant one. Prefer flagging a wrong result to flagging a slow one.
