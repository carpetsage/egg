# Persistence & Plan Library Implementation Plan

This document outlines the design and implementation steps for adding persistent storage, cross-tab mirroring, and a robust plan management library to the Ascension Planner.

## 1. Architectural Foundation

### Storage: IndexedDB
Given that plans can reach 10-15MB, `localStorage` (capped at 5MB) is insufficient. We will implement a storage layer using **IndexedDB**.
- **Database:** `AscensionPlannerDB`
- **Partitioning (Multi-Account)**: To keep plans for different players (EIDs) separate, storage will be partitioned using a **one-way hash (SHA-256)** of the EID.
- **Object Store `plans`**: Stores full plan data objects keyed by `hash(EID) + UUID`.
- **Object Store `metadata`**: Stores app-state info keyed by `hash(EID)`, including:
    - `active_draft`: A special slot that always contains the state of the current session (even if not in the library).
    - `active_plan_id`: The ID of the library plan currently being edited (null if it's a fresh scratch plan).

### Synchronization: BroadcastChannel
To achieve **strict mirroring** across multiple tabs, we will use the `BroadcastChannel` API.
- **Channel Name:** `ascension_sync`
- **Logic:** Whenever an action is performed, Tab A broadcasts its partition hash along with the change. Tab B only re-hydrates if its active player's hash matches the broadcast. This allows one user to have Tab 1 open for Player A and Tab 2 open for Player B without them interfering.

---

## 2. Feature Requirements

### Plan Library UI
- **Location:** A new section in `App.vue`, positioned above the "Ascension Action Buttons".
- **Functionality:**
    - List previously saved plans with names and timestamps.
    - Rename existing plans.
    - Load a plan (hydrates all stores, identical to the current "Import from backup" flow).
    - **Export/Download**: A per-plan action to download that specific plan as a JSON file.
- **Library-wide IO:**
    - Download the entire library as a single JSON file.
    - Import a file (adds to existing library).
    - **Export Sanitization**: All exports (single plan or full library) must be sanitized to remove any hashed identifiers or internal mapping IDs. Exported files remain portable and account-agnostic.
    - Handle name collisions: Prompt user to either "Overwrite" or "Keep Both (Rename)".
- **Library-based Reconciliation**: The "Reconcile" button now prompts the user to select an existing plan from the library rather than uploading a file.

### Multi-Account Workflow
- **Player Switching**: When a user enters a new EID in the Player ID form, the app calculates the hash and instantly switches the Library context. 
- **Isolated Libraries**: Each player has their own private library that persists independently in the browser. 

### Plan Lifecycle & Safety
- **The "Active Draft"**: Auto-save does NOT overwrite your library plans directly. Instead, it constantly saves to a dedicated "Active Draft" slot in IndexedDB.
    - If you are editing "Strategy A", the **Active Draft** is updated. The original "Strategy A" in your library remains unchanged until you click **Save**.
    - If you "Start from Scratch", the **Active Draft** is wiped and starts fresh. It will still auto-save your progress, but it won't be in the **Library** until you click **Save** and name it.
- **New Plan Intent**: "Start from Scratch", "Plan Future Ascension", and "Continue Current Ascension" always initialize a **new** plan context, even if a library plan was previously active.
- **Unsaved Changes Guard**: If a user attempts to start a new plan (via the buttons above) or load a different plan while the current one has unsaved changes, the app must:
    - Detect the "dirty" state (current actions/state differ from the library version or are entirely new).
    - Warn the user and provide an option to **Save** before proceeding.

### Collapsible Header
- The top section of `App.vue` (Player ID, Action Buttons, Library) must be collapsible.
- **Auto-Collapse:** The header should trigger a smooth **slide transition** to collapse after:
    - Loading a plan from the library.
    - Clicking "Reset", "Import", "Plan", "Continue", or "Reconcile"
- Users can manually expand/collapse via a toggle.

### UI Cleanup
- **Remove "Import from Backup" Card**: The dedicated card for importing will be removed from `App.vue`, as this functionality is now centralized within the Plan Library.

### Footer & Save Logic
- Remove Export/Import buttons from `PlanFinalSummary.vue` (moved to Library).
- Add a **Save** button to the footer.
- **Behavior:**
    - If the plan is new/unsaved: Prompt for a name.
    - If the plan is already in the library: Prompt to "Update Existing" or "Save As" (new name).

### User Guidance & Safety
- **Storage Warning**: Display a clear notice in the Plan Library stating that plans are stored strictly in the current browser.
- **Backup Advice**: Include a recommendation to use the "Export All" functionality regularly to prevent data loss if browser cache is cleared.

---

## 3. Implementation Phases

### Phase 1: Storage & Sync (The Infrastructure)
- [ ] Create `src/lib/storage/db.ts` to manage IndexedDB interactions.
- [ ] Create `src/composables/usePersistence.ts` to handle `BroadcastChannel` and store hydration.
- [ ] Update `useActionsStore` to trigger an auto-save to IndexedDB on changes (debounced).
- [ ] **Test:** Ensure refreshing the page or opening a second tab stays perfectly in sync.

### Phase 2: Plan Library Component
- [ ] Create `src/components/PlanLibrary.vue`.
- [ ] Implement the "Save" and "Save As" logic in the actions store, including "isDirty" tracking.
- [ ] Implement the "Unsaved Changes" warning dialog for new/load actions.
- [ ] Update the **Reconcile** flow to use library selection instead of file upload.
- [ ] Add the Library section to `App.vue`.
- [ ] **UI Integration**: Add the "Browser-specific storage" warning and backup recommendation text to the library UI.
- [ ] **UI Cleanup**: Remove the "Import from Backup" card from the action buttons section in `App.vue`.
- [ ] **Test:** Verify saving a plan as "Strategy A", clearing, and loading it works flawlessly.

### Phase 3: Header Refactor & Transitions
- [ ] Implement the `isHeaderCollapsed` state in `App.vue`.
- [ ] Wrap the header contents in a `<transition>` with height-based slide animations.
- [ ] Add logic to auto-collapse header on primary actions.
- [ ] **Test:** Perform an action and verify the smooth "slide up" effect.

### Phase 4: Advanced IO & Collision Handling
- [ ] Update `src/stores/actions/io.ts` to support single-plan and multi-plan exports.
- [ ] Implement the collision dialog/logic for imports.
- [ ] **Test:** Import a library file that contains a plan with a name already present in the local library.

---

## 4. Testing & Validation

| Phase | Test Case | Expected Result |
| :--- | :--- | :--- |
| **1** | Large Plan Save | Create a plan >10MB. Refresh. Data is restored. |
| **1** | Cross-tab Edit | Change an action in Tab A. Tab B updates automatically. |
| **2** | Save As | Open "Plan X", Save As "Plan Y". Both exist in library. |
| **3** | Auto-Collapse | Click "Continue Current Ascension". Header slides away. |
| **4** | Multi-Import | Import a library file with 3 plans. Library count increases by 3. |
| **4** | Collision | Import "My Plan" when it exists. Choose "Keep Both". Library shows "My Plan" and "My Plan (Copy 1)". |

---

## User-Facing Feature Summary (Discord Ready)

We are introducing a major update to how you save and manage your ascension strategies: **The Plan Library & Auto-Persistence.**

### Key Features for Users:
*   **Automatic Saving**: No more losing your work on a page refresh! Your current plan is automatically saved to your browser as you work.
*   **Multi-Tab Syncing**: If you have the planner open in two tabs, they will now stay perfectly in sync. Change an action in one tab, and it updates in the other instantly.
*   **The Plan Library**: A new section at the top of the app where you can manage multiple strategies. You can save your current work with a name (e.g., "Strategy A"), rename it, or delete it later.
*   **Smart Reconciliation**: The "Reconcile Plan" feature is now easier to use—just pick a plan directly from your library instead of digging for a JSON file on your computer.
*   **Safe Experimentation**: "Start from Scratch" or "Continue Ascension" will now check for unsaved changes. If you’ve spent time on a plan but haven't saved it to your library yet, the app will warn you before you wipe it out.
*   **Multi-Account Support**: Manage multiple accounts (EIDs) without confusion. The app uses a secure hash of your EID to keep your libraries separate. You can have Tab A open for your main account and Tab B for your alt, and they'll stay in their own worlds.
*   **Collapsible Interface**: To keep things clean, the entire top header (including the new library and action buttons) can be collapsed. It will even slide away automatically once you load a plan so you can focus on your action history.
*   **Quick Backups**: While everything stays in your browser, you can still download individual plans or your entire library as a file to keep as an external backup.

> [!NOTE]
> *This storage is specific to your current browser. If you clear your browser's site data or switch devices, you'll need to use the "Export All" feature to move your library.*

