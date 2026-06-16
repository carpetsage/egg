import { defineStore, acceptHMRUpdate } from 'pinia';
import { EidEntry, getSavedPlayerIDs, savePlayerIDs } from '../storage';
import { ref } from 'vue';
import { PlayerIdSchema } from '../schema';

// Resolve the text to display for an EID: a manual nickname wins, then the
// auto-captured in-game username, and finally the raw EID as a last resort.
export function eidDisplayName(eid: string, entry: EidEntry | undefined): string {
  return entry?.nickname || entry?.username || eid;
}

export const useEidsStore = defineStore('eids', () => {
  // Initialize from saved data
  const eids = ref(getSavedPlayerIDs());

  function addEid(eid: string) {
    eid = eid.trim();
    if (!PlayerIdSchema.safeParse(eid).success || eids.value.has(eid)) {
      return;
    }

    eids.value.set(eid, {});

    // Remove oldest entry if over limit
    if (eids.value.size > 7) {
      // First try to find an entry without any name (no nickname or username)
      let keyToDelete = null;
      for (const [key, value] of eids.value.entries()) {
        if (!value.nickname && !value.username) {
          keyToDelete = key;
          break;
        }
      }

      // If none found, use the first key
      if (keyToDelete === null) {
        keyToDelete = eids.value.keys().next().value;
      }

      eids.value.delete(keyToDelete ?? '');
    }

    savePlayerIDs(eids.value);
  }

  function removeEid(eid: string) {
    eids.value.delete(eid);
    savePlayerIDs(eids.value);
  }

  // Set the manual nickname for an EID. The EID must already be known.
  function updateNickname(eid: string, nickname: string) {
    if (!PlayerIdSchema.safeParse(eid).success) {
      return;
    }
    const entry = eids.value.get(eid) ?? {};
    eids.value.set(eid, { ...entry, nickname: nickname || undefined });
    savePlayerIDs(eids.value);
  }

  // Auto-capture the in-game username for an EID (called after a backup loads).
  // If the EID is not tracked yet, route through addEid so the 7-entry cap is
  // enforced rather than growing the store unbounded.
  function updateUsername(eid: string, username: string) {
    eid = eid.trim();
    if (!PlayerIdSchema.safeParse(eid).success || !username) {
      return;
    }
    if (!eids.value.has(eid)) {
      addEid(eid);
    }
    const entry = eids.value.get(eid);
    if (!entry || entry.username === username) {
      return;
    }
    eids.value.set(eid, { ...entry, username });
    savePlayerIDs(eids.value);
  }

  function editName(eid: string, oldname?: string) {
    const name = prompt('Enter a name for this EID:', oldname);
    if (name !== null) {
      updateNickname(eid, name);
    }
  }

  function displayName(eid: string): string {
    return eidDisplayName(eid, eids.value.get(eid));
  }

  return { eids, addEid, removeEid, updateNickname, updateUsername, editName, displayName };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEidsStore, import.meta.hot));
}

export default useEidsStore;
