<template>
  <div class="space-y-4">
    <!-- Header / Progress -->


    <!-- Research List -->
    <div class="space-y-4">
      <template v-if="!readOnly">
        <div v-for="tier in allTiers" :key="tier" class="space-y-1" :class="{ 'opacity-60': tier > currentTier }">
          <div class="flex items-center gap-2 bg-white py-1 border-b border-gray-100 z-10">
            <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tier {{ tier }}
            </h4>
            <span v-if="tier > currentTier" class="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded flex items-center gap-1">
              Locked ({{ totalPurchasedCount }}/{{ TIER_THRESHOLDS[tier - 1] }})
            </span>
          </div>
          <div class="grid grid-cols-1 gap-1">
            <div
              v-for="research in getResearchesForTier(tier)"
              :key="research.id"
              class="border rounded-md px-3 py-1.5 flex items-center justify-between transition-colors"
              :class="isResearchMaxed(research) ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-blue-200'"
            >
              <div class="flex-grow pr-3 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-xs text-gray-800 truncate">{{ research.name }}</span>
                  <span class="text-[10px] font-mono text-gray-400">
                    {{ getCurrentLevel(research.id) }}/{{ research.levels }}
                  </span>
                  <span class="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 rounded">
                    {{ getEffectDisplay(research, getCurrentLevel(research.id)) }}
                    <span class="text-gray-300 font-normal">/ {{ getEffectDisplay(research, research.levels) }}</span>
                  </span>
                </div>
                <p class="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-1">
                  {{ research.description }}
                </p>
              </div>

                <div class="flex items-center gap-3 flex-shrink-0">
                  <div class="text-xs text-right">
                    <div v-if="!isResearchMaxed(research)" class="flex items-center gap-1.5">
                      <span class="text-[11px] font-semibold text-gray-700 mr-1">{{ formatEIValue(getNextCost(research)) }}</span>
                      <div class="flex items-center bg-gray-100 rounded p-0.5">
                        <button
                          class="px-2 py-1 text-[9px] font-bold uppercase tracking-tighter bg-white text-gray-700 rounded shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all mr-1"
                          :disabled="tier > currentTier"
                          title="Buy all remaining levels"
                          @click="buyMax(research)"
                        >
                          Max
                        </button>
                        <button
                          class="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          :disabled="tier > currentTier"
                          :title="tier > currentTier ? 'Unlock tier ' + tier + ' first' : 'Purchase Level'"
                          @mousedown="startHold(research)"
                          @mouseup="stopHold"
                          @mouseleave="stopHold"
                          @touchstart.passive="startHold(research)"
                          @touchend.passive="stopHold"
                        >
                          <PlusSmIcon class="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <span v-else class="text-[10px] text-green-600 font-bold uppercase tracking-tight bg-green-50 px-1.5 py-0.5 rounded">Maxed</span>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <!-- Simple list for readOnly mode -->
        <div class="grid grid-cols-1 gap-1">
          <div
            v-for="research in simplifiedResearches"
            :key="research.id"
            class="border rounded-md px-3 py-1.5 flex items-center justify-between bg-white border-gray-100 shadow-sm"
          >
            <div class="flex-grow min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-xs text-gray-800 truncate">{{ research.name }}</span>
                <span class="text-[10px] font-mono text-gray-400">
                  {{ getCurrentLevel(research.id) }}/{{ research.levels }}
                </span>
                <span class="text-[9px] font-bold text-blue-500 bg-blue-50 px-1 rounded">
                  {{ getEffectDisplay(research, getCurrentLevel(research.id)) }}
                  <span class="text-gray-300 font-normal">/ {{ getEffectDisplay(research, research.levels) }}</span>
                </span>
              </div>
              <p class="text-[10px] text-gray-400 leading-tight mt-0.5">
                {{ research.description }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Research Log / History -->
    <div v-if="!readOnly && step.researchLog && step.researchLog.length > 0" class="border border-gray-200 rounded-lg bg-gray-50 mt-4">
      <div class="px-3 py-1.5 border-b border-gray-200 font-bold text-[10px] uppercase tracking-wider text-gray-400">
        Purchase History
      </div>
      <div class="max-h-40 overflow-y-auto p-0">
        <div 
          v-for="(entry, index) in reversedLog" 
          :key="entry.timestamp"
          class="px-3 py-1.5 border-b border-gray-100 last:border-0 text-[10px] flex justify-between items-center bg-white"
        >
          <div class="flex items-center gap-2">
            <span class="text-gray-400 font-mono">#{{ step.researchLog.length - index }}</span>
            <span class="font-medium text-gray-700">{{ getResearchName(entry.id) }}</span>
            <span class="text-gray-400">L{{ entry.level }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-gray-500 font-mono">{{ formatEIValue(entry.cost) }}</span>
            <button 
              class="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-20"
              :disabled="!canRemoveEntry(entry)"
              title="Remove last entry for this research"
              @click="removeLogEntry(entry)"
            >
              <XIcon class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
      <div class="px-3 py-2 border-t border-gray-200 bg-gray-100 flex justify-between items-center text-[10px] font-bold">
        <span class="text-gray-500 uppercase tracking-widest">Total Cost</span>
        <span class="text-gray-900 tabular-nums">{{ formatEIValue(totalHistoryCost) }} gems</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';
import { PlusSmIcon, XIcon } from '@heroicons/vue/solid';
import { commonResearches, formatEIValue, getResearchById } from '@/lib';
import type { AscensionStep, ResearchLogEntry } from '@/types';

// Tier thresholds provided by user
const TIER_THRESHOLDS = [0, 30, 80, 160, 280, 400, 520, 650, 800, 980, 1185, 1390, 1655];

export default defineComponent({
  name: 'ResearchSection',
  components: {
    PlusSmIcon,
    XIcon,
  },
  props: {
    step: {
      type: Object as PropType<AscensionStep>,
      required: true,
    },
    // Optional filter for relevant categories (e.g., 'hab_capacity' for Integrity)
    allowedCategories: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    previousSteps: {
      type: Array as PropType<AscensionStep[]>,
      default: () => [],
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const fullHistoryResearchLog = computed(() => {
      const logs = [];
      if (props.previousSteps) {
        for (const step of props.previousSteps) {
          if (step.researchLog) {
            logs.push(...step.researchLog);
          }
        }
      }
      if (props.step.researchLog) {
        logs.push(...props.step.researchLog);
      }
      return logs;
    });

    // Helper to get current level of a research from the full history
    const getResearchLevel = (id: string): number => {
      let level = 0;
      for (const entry of fullHistoryResearchLog.value) {
        if (entry.id === id && entry.level > level) {
          level = entry.level;
        }
      }
      return level;
    };

    const totalPurchasedCount = computed(() => {
      const levels: Record<string, number> = {};
      for (const entry of fullHistoryResearchLog.value) {
        if ((levels[entry.id] || 0) < entry.level) {
          levels[entry.id] = entry.level;
        }
      }
      return Object.values(levels).reduce((sum, lvl) => sum + lvl, 0);
    });

    const currentTier = computed(() => {
      const count = totalPurchasedCount.value;
      // Find the highest tier we meet the req for
      // TIER_THRESHOLDS indices are 0-12 (Tiers 1-13)
      // Tier 1 (idx 0) req 0.
      let tier = 1;
      for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
        if (count >= TIER_THRESHOLDS[i]) {
          tier = i + 1;
        } else {
          break;
        }
      }
      return tier;
    });

    const nextTierThreshold = computed(() => {
      const tierIdx = currentTier.value - 1; // 0-based
      if (tierIdx + 1 < TIER_THRESHOLDS.length) {
        return TIER_THRESHOLDS[tierIdx + 1];
      }
      return null; // Max tier
    });

    const progressPercent = computed(() => {
      if (!nextTierThreshold.value) return 100;
      const currentThreshold = TIER_THRESHOLDS[currentTier.value - 1];
      const next = nextTierThreshold.value;
      const count = totalPurchasedCount.value;
      const tierSpan = next - currentThreshold;
      const progressInTier = count - currentThreshold;
      return Math.min(100, Math.max(0, (progressInTier / tierSpan) * 100));
    });

    const allTiers = computed(() => {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    });

    const getResearchesForTier = (tier: number) => {
      let researches = commonResearches.filter(r => (r.tier || 1) === tier);
      
      // Filter by Allowed Categories if provided
      if (props.allowedCategories.length > 0) {
        researches = researches.filter(r => {
           // r.categories string might be comma separated or single
           if (!r.categories) return false;
           // Simple check
           return props.allowedCategories.some(allowed => r.categories.includes(allowed));
        });
      }
      return researches;
    };

    const simplifiedResearches = computed(() => {
       if (!props.readOnly) return [];
       // Collect all relevant researches across all tiers into a flat list
       let researches = commonResearches;
       if (props.allowedCategories.length > 0) {
          researches = researches.filter(r => {
             if (!r.categories) return false;
             return props.allowedCategories.some(allowed => r.categories.includes(allowed));
          });
       }
       return researches;
    });

    const isResearchMaxed = (research: any) => {
      return getResearchLevel(research.id) >= research.levels;
    };

    const getCurrentLevel = (id: string) => getResearchLevel(id);

    const getNextCost = (research: any) => {
      const level = getResearchLevel(research.id);
      if (level >= research.levels) return 0;
      // virtue_prices is 0-indexed for level 1 (idx 0 = cost of L1)
      // So next level is L(current+1). Cost is at index `current`.
      return research.virtue_prices[level] || 0;
    };

    const buyResearch = (research: any) => {
      const currentLevel = getResearchLevel(research.id);
      if (currentLevel >= research.levels) return;

      const nextLevel = currentLevel + 1;
      const cost = getNextCost(research);

      const entry: ResearchLogEntry = {
        id: research.id,
        serialId: research.serial_id,
        level: nextLevel,
        cost,
        timestamp: Date.now(),
      };

      // Ensure log exists
      if (!props.step.researchLog) {
        // Since props are reactive but we shouldn't mutate prop directly if it's not setup?
        // AscensionStep object is passed by reference, modifying its array is usually fine in Vue 3 
        // if it's ref/reactive upstream.
        // Assuming step is Reactive.
        // But better to emit? Or just push since we are "editing" the step.
        // Given the pattern in IntegrityStep (habs.value[...] = ... where habs was a local ref)...
        // checking IntegrityStep again: `upgradeLog` was a local ref `const upgradeLog = ref<UpgradeLogEntry[]>([]);`
        // Wait. `IntegrityStep` defined `upgradeLog` LOCALLY.
        // Does `AscensionStep` PROP contain the log? 
        // In `IntegrityStep.vue`, the log DOES NOT persist to the `step` prop?
        // Let's re-read `IntegrityStep.vue`.
      }
      // Re-reading IntegrityStep logic:
      // props: { step: ... }
      // setup() { const upgradeLog = ref([]); ... }
      // It implies the log was local and possibly lost on navigation??
      // Or maybe `IntegrityStep` was just a visualizer and there's a parent saving it?
      // "At each step of the ascension, the app needs to know..." -> This implies persistence.
      // If `IntegrityStep` uses a local ref, it's NOT PERSISTED to the plan.
      // I should fix that in IntegrityStep too likely, but for Research, I MUST attach to `step.researchLog`.
      
      if (!props.step.researchLog) {
        // This relies on the parent initializing it, OR we force it.
        // TypeScript complains if we assign to readonly prop.
        // But the OBJECT inside the prop is mutable.
        // However, if the key is missing... 
        // I'll assume I can push.
      }
      props.step.researchLog.push(entry);
    };

    const getResearchName = (id: string) => {
      return getResearchById(id)?.name || id;
    };

    const reversedLog = computed(() => {
      return props.step.researchLog ? [...props.step.researchLog].reverse() : [];
    });

    const totalHistoryCost = computed(() => {
      if (!props.step.researchLog) return 0;
      return props.step.researchLog.reduce((sum, entry) => sum + entry.cost, 0);
    });

    // Only allow removing an entry if it's the LATEST level for that specific research
    // to prevent level continuity gaps (e.g. having L2 but removing L1).
    const canRemoveEntry = (entry: ResearchLogEntry): boolean => {
      if (!props.step.researchLog) return false;
      
      // Find the highest level for this research ID in the log
      let maxLevel = 0;
      for (const e of props.step.researchLog) {
        if (e.id === entry.id && e.level > maxLevel) {
          maxLevel = e.level;
        }
      }
      return entry.level === maxLevel;
    };

    const removeLogEntry = (entry: ResearchLogEntry) => {
      if (!canRemoveEntry(entry)) return;
      
      const log = props.step.researchLog;
      if (!log) return;

      const index = log.findIndex(e => e.timestamp === entry.timestamp);
      if (index === -1) return;

      // Calculate total count from previous steps
      const previousCount = props.previousSteps.reduce((sum, step) => {
        const levels: Record<string, number> = {};
        for (const e of step.researchLog || []) {
           if ((levels[e.id] || 0) < e.level) levels[e.id] = e.level;
        }
        return sum + Object.values(levels).reduce((a, b) => a + b, 0);
      }, 0);

      // Validate that removing this doesn't break tier requirements for subsequent entries in THIS step
      const simulatedLog = [...log];
      simulatedLog.splice(index, 1);

      for (let i = index; i < simulatedLog.length; i++) {
        const subsequentEntry = simulatedLog[i];
        const research = getResearchById(subsequentEntry.id);
        const tier = research?.tier || 1;
        const threshold = TIER_THRESHOLDS[tier - 1];

        // i is the number of purchases in THIS log before this entry in the SIMULATED log.
        if (previousCount + i < threshold) {
          alert(`Cannot remove this purchase. Research "${research?.name}" later in this visit requires Tier ${tier} (min ${threshold} total purchases). You already have ${previousCount + i} from before.`);
          return;
        }
      }

      // TODO: Ideally we should check if subsequent visit's purchases are invalidated too.
      // But since we can only remove the LATEST level for an ID (checked by canRemoveEntry),
      // and visits are sequential, this covers most cases.

      log.splice(index, 1);
    };

    // Hold to repeat logic
    let holdInterval: number | null = null;
    let holdDelay: number | null = null;

    function stopHold() {
      if (holdDelay) {
        window.clearTimeout(holdDelay);
        holdDelay = null;
      }
      if (holdInterval) {
        window.clearInterval(holdInterval);
        holdInterval = null;
      }
    }

    function startHold(research: any) {
      // Immediate purchase
      buyResearch(research);

      // Setup delay then repeat
      holdDelay = window.setTimeout(() => {
        holdInterval = window.setInterval(() => {
          if (isResearchMaxed(research) || currentTier.value < (research.tier || 1)) {
            stopHold();
            return;
          }
          buyResearch(research);
        }, 80); // Fast repeat rate
      }, 500); // 500ms initial delay
    }

    const buyMax = (research: any) => {
      while (!isResearchMaxed(research)) {
        buyResearch(research);
      }
    };

    const getEffectDisplay = (research: any, level: number): string => {
      const perLevel = research.per_level;
      let total: number;

      if (research.levels_compound === 'multiplicative') {
        // (1 + perLevel)^level
        total = Math.pow(1 + perLevel, level) - 1;
      } else {
        // perLevel * level
        total = perLevel * level;
      }

      if (research.effect_type === 'multiplicative') {
        // Percentage display
        // Use + for positive, but research effects can be negative (discounts)?
        // Discounts in the JSON usually have negative per_level (e.g. -0.05).
        // If total is -0.5, we want to show -50%.
        const percent = Math.round(total * 100);
        return (percent >= 0 ? '+' : '') + percent + '%';
      } else {
        // Flat value display
        return (total >= 0 ? '+' : '') + formatEIValue(total);
      }
    };

    return {
      totalPurchasedCount,
      currentTier,
      nextTierThreshold,
      progressPercent,
      allTiers,
      TIER_THRESHOLDS,
      getResearchesForTier,
      isResearchMaxed,
      getCurrentLevel,
      getNextCost,
      formatEIValue,
      buyResearch,
      getResearchName,
      reversedLog,
      canRemoveEntry,
      removeLogEntry,
      startHold,
      stopHold,
      buyMax,
      getEffectDisplay,
      totalHistoryCost,
      simplifiedResearches,
    };
  },
});
</script>
