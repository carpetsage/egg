import { defineStore } from 'pinia';
import type { InitialState, ResearchLevels, VirtueEgg, CurrentFarmState, VehicleSlot } from '@/types';
import { epicResearchDefs } from '@/lib/epicResearch';
import {
  type ColleggtibleTiers,
  type ColleggtibleModifiers,
  getDefaultColleggtibleTiers,
  getColleggtibleTiersFromBackup,
  calculateColleggtibleModifiers,
} from '@/lib/colleggtibles';
import {
  type EquippedArtifact,
  type ArtifactModifiers,
  createEmptyLoadout,
  calculateArtifactModifiers,
  getArtifactLoadoutFromBackup,
} from '@/lib/artifacts';

export interface InitialStateStoreState {
  // Whether data has been loaded from a backup
  hasData: boolean;

  // Player info
  playerId: string;
  nickname: string;
  lastBackupTime: number;

  // Epic research levels
  epicResearchLevels: ResearchLevels;

  // Colleggtible tiers (-1 = none, 0-3 = tier 1-4)
  colleggtibleTiers: ColleggtibleTiers;

  // Artifact loadout (4 slots)
  artifactLoadout: EquippedArtifact[];

  // Current farm state (only if on a virtue egg)
  currentFarmState: CurrentFarmState | null;

  // Soul Eggs from backup
  soulEggs: number;

  // Assume double earnings (video doubler)
  assumeDoubleEarnings: boolean;

  // Global progress metrics at start of ascension
  initialFuelAmounts: Record<VirtueEgg, number>;
  initialEggsDelivered: Record<VirtueEgg, number>;
  initialTeEarned: Record<VirtueEgg, number>;
}

function createEmptyVirtueMap(): Record<VirtueEgg, number> {
  return {
    curiosity: 0,
    integrity: 0,
    humility: 0,
    resilience: 0,
    kindness: 0,
  };
}

function initializeEpicResearchLevels(): ResearchLevels {
  const levels: ResearchLevels = {};
  for (const research of epicResearchDefs) {
    levels[research.id] = 0;
  }
  return levels;
}

export const useInitialStateStore = defineStore('initialState', {
  state: (): InitialStateStoreState => ({
    hasData: false,
    playerId: '',
    nickname: '',
    lastBackupTime: 0,
    epicResearchLevels: initializeEpicResearchLevels(),
    colleggtibleTiers: getDefaultColleggtibleTiers(),
    artifactLoadout: createEmptyLoadout(),
    currentFarmState: null,
    soulEggs: 1e21, // Default to 1s
    assumeDoubleEarnings: true,
    initialFuelAmounts: createEmptyVirtueMap(),
    initialEggsDelivered: createEmptyVirtueMap(),
    initialTeEarned: createEmptyVirtueMap(),
  }),

  getters: {
    /**
     * Get the initial state as a typed object
     */
    initialState(): InitialState {
      return {
        playerId: this.playerId,
        nickname: this.nickname,
        lastBackupTime: this.lastBackupTime,
      };
    },

    /**
     * Get calculated colleggtible modifiers from tiers
     */
    colleggtibleModifiers(): ColleggtibleModifiers {
      return calculateColleggtibleModifiers(this.colleggtibleTiers);
    },

    /**
     * Get calculated artifact modifiers from loadout
     */
    artifactModifiers(): ArtifactModifiers {
      return calculateArtifactModifiers(this.artifactLoadout);
    },
  },

  actions: {
    /**
     * Load initial state from player backup data.
     * Returns the initial shift count for the virtue store.
     */
    loadFromBackup(
      playerId: string,
      backup: any
    ): {
      initialShiftCount: number;
      initialTE: number;
      tankLevel: number;
      virtueFuelAmounts: Record<VirtueEgg, number>;
      eggsDelivered: Record<VirtueEgg, number>;
      teEarnedPerEgg: Record<VirtueEgg, number>;
    } {
      this.hasData = true;
      this.playerId = playerId;
      this.nickname = backup.userName || playerId;
      this.lastBackupTime = backup.settings?.lastBackupTime || 0;
      this.soulEggs = backup.game?.soulEggsD || 0;

      // Load epic research levels
      this.epicResearchLevels = initializeEpicResearchLevels();
      if (backup.game?.epicResearch) {
        for (const research of backup.game.epicResearch) {
          if (research.id && research.level !== null && research.level !== undefined) {
            this.epicResearchLevels[research.id] = research.level;
          }
        }
      }

      // Load colleggtible tiers from contracts
      this.colleggtibleTiers = getColleggtibleTiersFromBackup(backup.contracts ?? null);

      // Load artifact loadout from backup
      this.artifactLoadout = getArtifactLoadoutFromBackup(backup);

      // Parse TE data from eovEarned array
      // Indices 0-4 map to: Curiosity, Integrity, Humility, Resilience, Kindness
      const eovEarned = backup.virtue?.eovEarned ?? [];
      const teEarnedPerEgg: Record<VirtueEgg, number> = {
        curiosity: eovEarned[0] ?? 0,
        integrity: eovEarned[1] ?? 0,
        humility: eovEarned[2] ?? 0,
        resilience: eovEarned[3] ?? 0,
        kindness: eovEarned[4] ?? 0,
      };
      const initialTE = Object.values(teEarnedPerEgg).reduce((sum, val) => sum + val, 0);

      // Parse eggs delivered data
      // Indices 0-4 map to: Curiosity, Integrity, Humility, Resilience, Kindness
      const eggsDeliveredArray = backup.virtue?.eggsDelivered ?? [];
      const eggsDelivered: Record<VirtueEgg, number> = {
        curiosity: eggsDeliveredArray[0] ?? 0,
        integrity: eggsDeliveredArray[1] ?? 0,
        humility: eggsDeliveredArray[2] ?? 0,
        resilience: eggsDeliveredArray[3] ?? 0,
        kindness: eggsDeliveredArray[4] ?? 0,
      };

      // Parse fuel tank data
      const tankLevel = backup.artifacts?.tankLevel ?? 0;
      const tankFuels = backup.virtue?.afx?.tankFuels ?? [];

      // Virtue egg fuel amounts are at indices 20-24:
      // [Curiosity, Integrity, Humility, Resilience, Kindness]
      const virtueFuelAmounts: Record<VirtueEgg, number> = {
        curiosity: tankFuels[20] ?? 0,
        integrity: tankFuels[21] ?? 0,
        humility: tankFuels[22] ?? 0,
        resilience: tankFuels[23] ?? 0,
        kindness: tankFuels[24] ?? 0,
      };
      this.initialFuelAmounts = { ...virtueFuelAmounts };
      this.initialEggsDelivered = { ...eggsDelivered };
      this.initialTeEarned = { ...teEarnedPerEgg };

      // Load current farm state if on a virtue egg (IDs 50-54)
      this.currentFarmState = null;
      if (backup.farms && backup.farms.length > 0) {
        const farm = backup.farms[0];
        if (farm.eggType && farm.eggType >= 50 && farm.eggType <= 54) {
          const commonResearches: ResearchLevels = {};
          const rawResearch = farm.commonResearches || farm.commonResearch || [];
          for (const r of rawResearch) {
            if (r.id && r.level !== null && r.level !== undefined) {
              commonResearches[r.id] = r.level;
            }
          }

          // Parse habs (can be numbers or objects with type field)
          const habs: (number | null)[] = (farm.habs || []).map((h: any) => {
            if (typeof h === 'number') {
              return h === 19 ? null : h;
            }
            if (h && typeof h === 'object') {
              return (h.type !== undefined && h.type !== null) ? h.type : 0;
            }
            return null;
          });
          // Ensure at least 4 slots for consistency
          while (habs.length < 4) habs.push(null);

          // Parse vehicles (can be numbers with farm.trainLength or objects)
          const rawVehicles = farm.vehicles || [];
          const trainLength = farm.trainLength || [];
          const vehicles: VehicleSlot[] = rawVehicles.map((v: any, idx: number) => {
            if (typeof v === 'number') {
              return {
                vehicleId: v,
                trainLength: trainLength[idx] || 1,
              };
            }
            if (v && typeof v === 'object') {
              return {
                vehicleId: (v.type !== undefined && v.type !== null) ? v.type : null,
                trainLength: v.count || 1,
              };
            }
            return { vehicleId: null, trainLength: 1 };
          });

          this.currentFarmState = {
            eggType: farm.eggType,
            cash: farm.cashAmount || 0,
            numSilos: farm.silosOwned || 1,
            commonResearches,
            habs,
            vehicles,
            population: farm.numChickens || 0,
            deliveredEggs: farm.eggsLaid || 0,
            lastStepTime: farm.lastStepTime || 0,
          };
        }
      }

      // Return virtue and tank data
      return {
        initialShiftCount: backup.virtue?.shiftCount ?? 0,
        initialTE,
        tankLevel,
        virtueFuelAmounts,
        eggsDelivered,
        teEarnedPerEgg: teEarnedPerEgg,
      };
    },

    /**
     * Set epic research level
     */
    setEpicResearchLevel(researchId: string, level: number) {
      const def = epicResearchDefs.find(r => r.id === researchId);
      if (def) {
        this.epicResearchLevels[researchId] = Math.max(0, Math.min(level, def.maxLevel));
      }
    },

    /**
     * Set colleggtible tier
     */
    setColleggtibleTier(id: string, tierIndex: number) {
      if (id in this.colleggtibleTiers) {
        this.colleggtibleTiers[id] = Math.max(-1, Math.min(3, tierIndex));
      }
    },

    /**
     * Set artifact loadout
     */
    setArtifactLoadout(loadout: EquippedArtifact[]) {
      this.artifactLoadout = loadout;
    },

    /**
     * Set soul eggs
     */
    setSoulEggs(count: number) {
      this.soulEggs = count;
    },

    /**
     * Set assume double earnings
     */
    setAssumeDoubleEarnings(enabled: boolean) {
      this.assumeDoubleEarnings = enabled;
    },

    /**
     * Hydrate store from exported data.
     */
    hydrate(data: any) {
      this.hasData = true;
      this.playerId = data.playerId || '';
      this.nickname = data.nickname || 'Redacted';
      this.lastBackupTime = data.lastBackupTime || 0;
      this.soulEggs = data.soulEggs || 1e21;

      if (data.epicResearchLevels) {
        this.epicResearchLevels = { ...data.epicResearchLevels };
      }
      if (data.colleggtibleTiers) {
        this.colleggtibleTiers = { ...data.colleggtibleTiers };
      }
      if (data.artifactLoadout) {
        this.artifactLoadout = [...data.artifactLoadout];
      }
      if (data.assumeDoubleEarnings !== undefined) {
        this.assumeDoubleEarnings = data.assumeDoubleEarnings;
      } else {
        this.assumeDoubleEarnings = true;
      }
      this.currentFarmState = data.currentFarmState || null;

      if (data.initialFuelAmounts) {
        this.initialFuelAmounts = { ...data.initialFuelAmounts };
      }
      if (data.initialEggsDelivered) {
        this.initialEggsDelivered = { ...data.initialEggsDelivered };
      }
      if (data.initialTeEarned) {
        this.initialTeEarned = { ...data.initialTeEarned };
      }
    },

    /**
     * Set initial fuel amount
     */
    setInitialFuelAmount(egg: VirtueEgg, amount: number) {
      this.initialFuelAmounts[egg] = Math.max(0, amount);
    },

    /**
     * Set initial eggs delivered
     */
    setInitialEggsDelivered(egg: VirtueEgg, amount: number) {
      this.initialEggsDelivered[egg] = Math.max(0, amount);
    },

    /**
     * Set initial TE earned
     */
    setInitialTeEarned(egg: VirtueEgg, count: number) {
      this.initialTeEarned[egg] = Math.max(0, Math.min(98, count));
    },

    /**
     * Clear all initial state data
     */
    clear() {
      this.hasData = false;
      this.playerId = '';
      this.nickname = '';
      this.lastBackupTime = 0;
      this.epicResearchLevels = initializeEpicResearchLevels();
      this.colleggtibleTiers = getDefaultColleggtibleTiers();
      this.artifactLoadout = createEmptyLoadout();
      this.soulEggs = 1e21;
      this.assumeDoubleEarnings = true;
      this.initialFuelAmounts = createEmptyVirtueMap();
      this.initialEggsDelivered = createEmptyVirtueMap();
      this.initialTeEarned = createEmptyVirtueMap();
    },
  },
});
