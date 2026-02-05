# Egg Project Context

## Scope

Unless explicitly told otherwise, or a file is imported from ascension-planner, only work in `wasmegg/ascension-planner`. Do not explore or modify files in other workspaces.

## Project Structure
Monorepo using pnpm workspaces. Key workspace: wasmegg/ascension-planner

## Commands
- Build: `pnpm build` (in workspace directory)
- Dev: `pnpm dev`
- Type check: `pnpm vue-tsc --noEmit`

## Code Patterns
- Vue 3 with <script setup lang="ts">
- Pinia stores in /src/stores/
- Action executor pattern in /src/lib/actions/executors/
- Composables in /src/composables/

## Key Files
- Types: /src/types/actions.ts
- Snapshot system: /src/lib/actions/snapshot.ts
- Formatting: /src/lib/format.ts