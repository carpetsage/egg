# Analysis of Action Recalculation Defect

## 1. Problem Statement
When the user edits the `initialState` to change the Puzzle Cube artifact, the `puzzleCubeMultiplier` changes, which should retroactively adjust the cost of research items in the `action history`. Currently, this recalculation fails to update the recorded cost of research actions, leading to incorrect timing for these research purchases during the ascension replay.

## 2. Suspected Root Causes
There are a few key areas where this bug is likely occurring:
1. **Static Cost Capture**: The research cost (influenced by the puzzle cube) is likely calculated and permanently saved inside the action object when the action is originally added to the history. When `edit initial state` triggers a recalculation, the action replay uses the hardcoded historical cost rather than re-computing the cost contextually based on the newly modified initial state.
2. **Missing State Dependency**: The recalculation loop (likely localized in `src/engine/apply/time.ts` or `src/stores/actions/index.ts`) might not be properly fetching the new `initialStateStore.artifactModifiers.researchCost.totalMultiplier` when it attempts to rebuild the timeline.
3. **Improper Reset**: The `initialStateStore` or `actionsStore` might not fully reset and cleanly pipe the updated artifact modifiers through the executor during a recalculate event.

## 3. Investigation Steps
To pinpoint and fix the exact defect, I will execute the following steps:

1. **Examine Action Generation & Storage**: 
   - I will inspect `src/stores/actions/index.ts` and `src/types/actions/core.ts` to see how a `ResearchAction` saves its cost. (Does it directly save a scalar `cost` value permanently?)
2. **Examine Recalculation / Replay Logic**:
   - I will review `src/engine/apply/time.ts` and the main recalculation engine. Does it simply deduct a hardcoded `action.cost`? If so, we need to alter it to compute the dynamically scaled cost or update the action's cost intelligently during the replay loop.
3. **Trace the Puzzle Cube Multiplier Flow**:
   - In `src/calculations/commonResearch.ts`, I see references to `initialStateStore.artifactModifiers.researchCost.totalMultiplier`. 
   - I will check how this value interacts with the recalculation flow and whether it successfully passes down to the action playback engine when an action checks its affordability.
4. **Trigger Flow on `InitialState` Edit**:
   - I will investigate what specific method gets invoked when the initial state changes, and verify whether it correctly prompts re-evaluation of context-dependent modifiers for all subsequent actions in the queue.

## 4. Proposed Fix Direction
Once the defect is verified, the planned solution will involve updating the recalculation engine to dynamically fetch the correct research cost (using the updated `puzzleCubeMultiplier` and lab upgrade levels in the simulation's state) at the exact replayed moment of the action, rather than trusting a statically captured `action.cost` field. This ensures `(cost - currentBank) / income` correctly cascades through subsequent timestamps.
