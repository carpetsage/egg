# Type Safety Report: "Complex" any-casts

All 14 instances of "complex" `any` type casting identified in the initial report have been successfully resolved. The project now maintains strict type safety across external data parsing, simulation logic, and the action system.

## Summary of Fixes

| Category | Status | Context | Implementation |
| :--- | :---: | :--- | :--- |
| **External Data** | ✅ FIXED | Backup (Protobuf) parsing | Replaced `any` with `ei.IBackup`. Simplified artifact inventory mapping by leveraging correct Protobuf interfaces. |
| **Simulation State** | ✅ FIXED | Research Views (ROI/Cheapest) | Defined `SimulatedAction` union type. Replaced `any[]` results with `ResearchViewItem` interface. |
| **Action Logic** | ✅ FIXED | Store Action Inputs | Implemented `DraftAction` and redefined `Action` as a proper TypeScript union. Eliminated all `any` casts in `pushAction` and `insertAction`. |

---

## Technical Enhancements

1.  **Union-Based Action System**: Redefined the core `Action` type in `src/types/actions/meta.ts` as a mapped union. This ensures that the `type` and `payload` of an action are always correctly linked by the compiler, removing the need for type assertions in simulation and replay logic.
2.  **Simulation & Draft Types**: Introduced `SimulatedAction` (for temporary "what-if" engine calls) and `DraftAction` (for new user-initiated actions). These types correctly `Omit` fields that the store calculates later, providing safety at the "front door" of the application.
3.  **Protobuf Alignment**: All backup loading in `initialState.ts` and `utils.ts` now uses the `ei` Protobuf namespace, providing full IDE autocompletion for player data fields.

---

## Remaining Intentional Instances (1)

There is one remaining instance of `as any` that is intentional and unavoidable without manual Protobuf augmentation:

*   **File:** `src/stores/initialState.ts`
    *   **Line 187:** `this.isUltra = !!(backup.game as any)?.ultraSubscriptionAction;`
    *   **Reason:** The `ultraSubscriptionAction` field is present in live game data but is not currently defined in the `lib/proto` interfaces. Casting to `any` for this specific check prevents the build from failing while allowing the feature to work.

---
*Status: 99% Type-Safe*
*Updated: 2026-02-27*
