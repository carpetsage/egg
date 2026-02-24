# Ascension Planner Refactor Plan

## Goal
The primary objective of this refactor is to improve developer (and AI agent) efficiency by reducing the token count of frequently read files. By breaking down monolithic files into smaller, focused modules, we can provide more granular context without exceeding token limits or causing "lost in the middle" issues.

## Monolithic Files To Split

### 1. `src/stores/actions.ts` (~1200 lines) - [x] **DONE**
- Split into `src/stores/actions/`:
    - `types.ts`: State definitions.
    - `simulation.ts`: Simulation orchestration and calc results.
    - `dependency.ts`: Action dependency graph and undo prep.
    - `io.ts`: Plan import/export.
    - `index.ts`: Pinia store re-exporting.

### 2. `src/components/actions/VehicleActions.vue` (~760 lines)
Contains both complex UI and significant business logic for vehicle management.
- **Component Extraction**:
    - `src/components/actions/vehicles/VehicleSlot.vue`: Handle individual slot selection and display.
    - `src/components/actions/vehicles/HyperloopControls.vue`: Manage hyperloop-specific car logic.
- **Logic Extraction**:
    - Create `src/composables/useVehicleCalculations.ts` to handle capacity, pricing, and "time to buy" math.

### 3. `src/components/presenters/InitialStateDisplay.vue` (~730 lines)
A massive component that handles almost all configuration for the start of an ascension.
- **Component Extraction**:
    - `src/components/initial-state/AscensionSettings.vue`: Start time, egg selection, and shift count.
    - `src/components/initial-state/VirtueProgress.vue`: Truth eggs and virtue level management.
    - `src/components/initial-state/ArtifactLoadout.vue`: Artifact set selection and customization.
- **Logic Extraction**:
    - Move complex interaction logic to `src/composables/useInitialStateEditor.ts`.

### 4. `src/lib/artifacts.ts` (~660 lines) - [x] **DONE**
- Split into `src/lib/artifacts/`:
    - `types.ts`: Modifier and Option interfaces.
    - `data.ts`: Parsing and metadata lookup.
    - `calculator.ts`: Core stacking and math logic.
    - `virtue.ts`: Specialized virtue egg logic (Clothed TE).
    - `index.ts`: Re-export.

### 5. `src/engine/apply.ts` (~620 lines) - [x] **DONE**
- Split into `src/engine/apply/`:
    - `math.ts`: Duration and growth models.
    - `actions.ts`: Individual action state machine logic.
    - `time.ts`: State transitions for time advancement.
    - `index.ts`: Main entry point.

### 6. `src/types/actions.ts` (~580 lines) - [x] **DONE**
- Split into `src/types/actions/` sub-files by category (virtue, infrastructure, research, etc.).
- Improved TSDoc quality for payloads.
- **Organization**:
    - Create `src/types/actions/` directory.
    - Split types into `research.ts`, `vehicles.ts`, `wait.ts`, `infrastructure.ts`, etc.
    - Re-export everything from `src/types/actions/index.ts`.

### 7. `src/stores/initialState.ts` (~530 lines)
Handles massive backup data parsing and initial state management.
- **Split Strategy**:
    - Move `loadFromBackup` and backup parsing logic to `src/lib/backup/parser.ts`.
    - Move artifact set management to its own store or a sub-module.

### 8. `src/composables/useResearchViews.ts` (~510 lines)
Manages the filtering and layout of research items.
- **Split Strategy**:
    - Split into `useResearchFiltering.ts`, `useResearchSorting.ts`, and `useResearchMetadata.ts`.

## Implementation Principles
- **No Functional Changes**: Code should only be moved, not modified in behavior.
- **Granular Re-exports**: Use `index.ts` files to maintain backward compatibility for imports where possible.
- **Composables for Logic**: Move shared component logic to composables to keep `.vue` files focused on templates and styling.
- **Pure Functions**: Ensure as much logic as possible is moved to pure functions in `src/lib/` or `src/utils/` to simplify testing and AI reasoning.

## Knowledge Strategy
To ensure that I (and other agents) can efficiently navigate and understand the codebase without manual guidance, we will implement an "Agent-Optimized Documentation" layer:

### 1. Module Readmes (`README.md` in major subdirectories)
Every major directory (e.g., `src/stores/`, `src/engine/`, `src/calculations/`) should have a brief `README.md` that contains:
- **Responsibility**: What this module handles.
- **Key Concepts**: Definitions of domain-specific terms used in this folder.
- **Top-Down Flow**: Where to start reading to understand the module.
- **Gotchas**: Non-obvious behavior or common pitfalls.

### 2. Standardized Context Blocks
In complex files, we will use a standardized comment block at the top:
```typescript
/**
 * @context [Brief description of file's role]
 * @important_state [List of key state variables/dependencies]
 * @side_effects [List of any external mutations or store impacts]
 * @see [Links to related files or documentation]
 */
```

### 3. State Transition Documentation
For the complex simulation logic in `src/engine/`, we will create a `src/engine/SIMULATION_FLOW.md` that documents the step-by-step transformation of `EngineState`. This serves as a "mental model" for anyone (human or agent) modifying the simulation.

### 4. Integration with Knowledge Items (KI)
By creating high-quality, focused markdown documentation (like `SIMULATION_FLOW.md`), these will be automatically summarized into **Knowledge Items (KIs)** at the start of future conversations, allowing for instant context loading.

### 5. Type-Driven Documentation
We will prioritize explicit interfaces with TSDoc comments for all action payloads and calculation inputs. This makes tool-assisted reading (like `view_file_outline`) significantly more useful for context gathering.
