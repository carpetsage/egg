# Bug Hunt: Negative Bank Value upon Import

## Hypothesis / Possible Issues

1. **`simulate.ts` and `applyTime` logic skips earnings for `buy_hab`:**
   Looking at the `simulate.ts` workflow during recalculation, here is the sequence of events when an action is processed:
   1. `applyAction(currentState, action)` is called. For `buy_hab`, this *subtracts* the full `action.cost` from `bankValue`, instantly bringing `bankValue` into the negative if we didn't have enough bocks initially.
   2. `durationSeconds = getActionDuration(action, currentSnapshot);` calculates how long we need to wait to earn the remaining bocks required to afford the hab.
   3. `applyTime(currentState, durationSeconds, currentSnapshot, action.type === 'buy_hab')` is called. The 4th argument here is `skipBankUpdate`. Because the action is `buy_hab`, this flag is `true`.
   4. Inside `applyTime` (`src/engine/apply/time.ts`), when `skipBankUpdate` is true, it intentionally skips adding `earnedGems` (bocks) for the elapsed `seconds`. 
   
   As a result, the simulation *subtracts* the cost of the hab but *never adds* the earnings generated during the time it took to save for it. This leaves `bankValue` permanently negative after a `buy_hab` action when imported, even though it was positive at the time of export.

2. **Population Growth Integral Subtleties (`math.ts`)**:
   Another potential (though less likely to cause a flat negative bank value) is in `integrateRate` or `solveForTime`. If the hab capacity is reached or if internal hatchery rates fluctuate drastically, the time required to earn the bocks might be miscalculated during the replay vs the real-time simulation.

## Data Examined From Backup File
The user provided a single `buy_hab` entry from the `before.json` export:
```json
{
      "id": "action_1772047805477_r09vcw7",
      "timestamp": 1772047805477,
      "type": "buy_hab",
      "payload": {
        "slotIndex": 1,
        "habId": 13
      },
      "cost": 4504125000000000000,
      "dependsOn": [ ... ],
      "elrDelta": 4454.835,
      ...
      "bankDelta": 0,
      "populationDelta": 551,
      ...
      "totalTimeSeconds": 8.201283666331523,
      "endState": {
        "bankValue": 0,
        ...
```
This confirms that when the action was exported:
1. It took `8.20128` seconds (`totalTimeSeconds`).
2. The `endState.bankValue` was correctly clamped to `0` (or greater than 0), not negative.
3. The population correctly grew (`populationDelta: 551`).

Since the export itself explicitly stores a non-negative `bankValue` (`0`) but mathematically we see the simulation dipping into the negatives during import, it verifies that the issue occurs specifically within `simulate.ts` during the replay of the actions (due to the `skipBankUpdate` flag).

## Plan to Hunt Down and Fix the Bug
Here is what I am going to do:
1. **Remove `skipBankUpdate` for `buy_hab`:** I will modify `simulate.ts` so that it doesn't pass `action.type === 'buy_hab'` as the `skipBankUpdate` parameter unless there's a mathematically sound reason verified by the simulation rules (e.g. maybe it was meant for something else but applied to `buy_hab` by mistake?).
2. **Review Action Order of Operations:** Alternatively, perhaps `getActionDuration` and `applyTime` should be called *before* `applyAction(currentState, action)` to ensure we add the earnings before subtracting the cost! 
3. **Check `bankValue` clamp:** I'll verify if `applyTime` or `applyAction` should strictly clamp `bankValue` to `0` or explicitly allow temporary negatives that are resolved by the wait time. By applying time *before* the action, the bank balance would naturally be `≥ cost` before we deduct, preventing negative values in the first place and respecting the chronological order of waiting *then* buying.
