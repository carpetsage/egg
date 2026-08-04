import { computed, nextTick, ref } from 'vue';

import { useEidsStore } from 'lib';
import { PlayerIdSchema } from 'lib/schema';

// Shared state machine for the player-ID input box used by both eicoop's
// UserDashboardEntryForm and the suite-wide PlayerIdForm. The box has two modes:
//
//   - display mode: shows the active player's username (never the raw EID);
//   - edit mode: reveals the raw EID for editing, entered by focusing the box.
//
// Focusing reveals the EID; blurring re-hides it and discards the edit, except a
// valid typed EID is preserved across blur so a subsequent submit (e.g. Tab then
// Enter, where focus has already left the input) loads it instead of silently
// reloading the previously active player. The owning component supplies the
// actual load side effect (save/navigate/emit) and calls `commit` once a load
// has been initiated.
export function useEidInput(initialEid: string) {
  const eidsStore = useEidsStore();

  // The EID whose data is currently loaded. Its display name (username), not the
  // raw EID, is shown in the box by default.
  const activeEid = ref(initialEid.trim());
  const editing = ref(false);
  // Raw text the user is typing while editing.
  const inputValue = ref('');
  // A valid EID typed then blurred without submitting, held so the next submit
  // can use it rather than reloading the active player.
  const pendingEid = ref('');

  // What the box shows: the typed text while editing, otherwise the active
  // player's display name — never the raw EID.
  const displayValue = computed({
    get: () => (editing.value ? inputValue.value : activeEid.value ? eidsStore.displayName(activeEid.value) : ''),
    set: (value: string) => {
      // Only accept writes while editing; guards against stray input events
      // (e.g. browser autofill) on the read-only display value.
      if (editing.value) {
        inputValue.value = value;
      }
    },
  });

  // The submit control submits the typed EID while editing, a valid value
  // preserved across blur, otherwise reloads the active player.
  const submittable = computed(() =>
    editing.value
      ? PlayerIdSchema.safeParse(inputValue.value.trim()).success
      : !!activeEid.value || PlayerIdSchema.safeParse(pendingEid.value).success
  );

  // Clicking into the box reveals the raw EID, ready to edit or replace.
  const onFocus = (event: FocusEvent) => {
    editing.value = true;
    inputValue.value = activeEid.value;
    pendingEid.value = '';
    nextTick(() => (event.target as HTMLInputElement | null)?.select());
  };

  // Clicking away re-hides the EID. A valid typed EID is preserved for an
  // imminent submit; anything else is discarded.
  const onBlur = () => {
    editing.value = false;
    const typed = inputValue.value.trim();
    pendingEid.value = PlayerIdSchema.safeParse(typed).success ? typed : '';
    inputValue.value = '';
  };

  // The EID the submit control should act on right now.
  function resolveSubmit(): string {
    return (editing.value ? inputValue.value : pendingEid.value || activeEid.value).trim();
  }

  // Reset transient input state and record the now-active EID. Call once a load
  // has been initiated (by submit, a pill click, or the parent prop changing).
  function commit(eid: string) {
    activeEid.value = eid.trim();
    editing.value = false;
    inputValue.value = '';
    pendingEid.value = '';
  }

  return {
    eidsStore,
    eids: eidsStore.eids,
    activeEid,
    editing,
    displayValue,
    submittable,
    onFocus,
    onBlur,
    resolveSubmit,
    commit,
  };
}
