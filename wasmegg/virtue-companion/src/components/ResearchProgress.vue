<template>
  <div class="overflow-x-auto">
    <div class="mb-2 flex items-center">
      <input
        id="research-sale"
        v-model="researchSale"
        type="checkbox"
        class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
      />
      <label for="research-sale" class="ml-2 text-sm text-gray-600">Research Sale (70% off)</label>
      <template v-if="showEarningsSetCheckbox">
        <input
          id="use-earnings-cube"
          v-model="useEarningsSet"
          type="checkbox"
          class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 ml-2"
        />
        <label for="use-earnings-cube" class="ml-2 text-sm text-gray-600">Use Cube From Earnings Set</label>
      </template>
      <template v-if="showActiveSetCheckbox">
        <input
          id="use-active-cube"
          v-model="useActiveSet"
          type="checkbox"
          class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 ml-2"
        />
        <label for="use-active-cube" class="ml-2 text-sm text-gray-600">Use Cube From Active Set</label>
      </template>
    </div>
    <div class="mb-2 text-xs text-gray-500">
      Note: Click on a price to target it in the earnings section above. Click on the + to add to the target.
    </div>
    <table v-if="visibleTiers.length > 0" class="tabular-nums w-full">
      <thead>
        <tr class="border-b border-gray-200">
          <th class="px-2 py-1 text-left font-bold">Research</th>
          <th class="px-2 py-1 text-right font-bold">Level</th>
          <th class="px-2 py-1 text-right font-bold">Next Level</th>
          <th class="px-2 py-1 text-right font-bold">Remaining</th>
        </tr>
      </thead>
      <template v-for="tier in visibleTiers" :key="tier.tier">
        <tbody>
          <tr>
            <td colspan="4" class="px-2 py-1 font-medium text-gray-900 bg-gray-100 rounded-sm">Tier {{ tier.tier }}</td>
          </tr>
          <template v-for="research in tier.items" :key="research.id">
            <tr class="cursor-pointer hover:bg-gray-50" @click="toggleResearch(research.id)">
              <td class="px-2 py-0.5 pr-4">
                <span class="inline-flex items-center gap-1">
                  <svg
                    class="w-3 h-3 transition-transform text-gray-400"
                    :class="{ 'rotate-90': isExpanded(research.id) }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  {{ research.name }}
                  <base-info
                    v-tippy="{ content: research.description }"
                    class="inline relative -top-px ml-1 text-gray-400"
                  />
                </span>
              </td>
              <td
                class="px-2 py-0.5 text-right whitespace-nowrap"
                :class="research.level === research.maxLevel ? 'text-green-600' : 'text-gray-600'"
              >
                {{ research.level }}/{{ research.maxLevel }}
              </td>
              <td class="px-2 py-0.5 text-right whitespace-nowrap">
                <template v-if="research.level < research.maxLevel">
                  <span
                    class="text-gray-500 cursor-pointer hover:text-blue-600"
                    @click.stop="setCashTarget?.(research.nextCost)"
                  >
                    {{ formatPrice(research.nextCost) }}
                  </span>
                  <span
                    v-if="addCashTarget"
                    class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                    title="Add to target"
                    @click.stop="addCashTarget(research.nextCost)"
                    >+</span
                  >
                </template>
                <span v-else class="text-green-600">Done</span>
              </td>
              <td class="px-2 py-0.5 text-right whitespace-nowrap">
                <template v-if="research.level < research.maxLevel">
                  <span
                    class="text-gray-500 cursor-pointer hover:text-blue-600"
                    @click.stop="setCashTarget?.(research.remainingCost)"
                  >
                    {{ formatPrice(research.remainingCost) }}
                  </span>
                  <span
                    v-if="addCashTarget"
                    class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                    title="Add to target"
                    @click.stop="addCashTarget(research.remainingCost)"
                    >+</span
                  >
                </template>
                <span v-else class="text-green-600">-</span>
              </td>
            </tr>
            <tr
              v-for="(cost, index) in research.tierCosts"
              v-show="
                isExpanded(research.id) &&
                index >= research.level &&
                (isShowingAll(research.id) || index < research.level + 15)
              "
              :key="`${research.id}-tier-${index}`"
              class="text-xs bg-gray-50"
              :class="index === research.level ? 'text-blue-600 font-medium' : 'text-gray-500'"
            >
              <td class="px-2 py-0.5 pl-8">
                Level {{ index + 1 }}
                <span v-if="index === research.level" class="ml-1">←</span>
              </td>
              <td class="px-2 py-0.5 text-right"></td>
              <td class="px-2 py-0.5 text-right tabular-nums whitespace-nowrap">
                <span class="cursor-pointer hover:text-blue-600" @click.stop="setCashTarget?.(cost)">
                  {{ formatPrice(cost) }}
                </span>
                <span
                  v-if="addCashTarget"
                  class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                  title="Add to target"
                  @click.stop="addCashTarget(cost)"
                  >+</span
                >
              </td>
              <td class="px-2 py-0.5 text-right tabular-nums whitespace-nowrap">
                <span
                  class="cursor-pointer hover:text-blue-600"
                  @click.stop="
                    setCashTarget?.(research.tierCosts.slice(research.level, index + 1).reduce((a, b) => a + b, 0))
                  "
                >
                  {{ formatPrice(research.tierCosts.slice(research.level, index + 1).reduce((a, b) => a + b, 0)) }}
                </span>
                <span
                  v-if="addCashTarget"
                  class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                  title="Add to target"
                  @click.stop="
                    addCashTarget(research.tierCosts.slice(research.level, index + 1).reduce((a, b) => a + b, 0))
                  "
                  >+</span
                >
              </td>
            </tr>
            <tr
              v-if="isExpanded(research.id) && !isShowingAll(research.id) && research.maxLevel - research.level > 15"
              :key="`${research.id}-show-all`"
              class="text-xs bg-gray-50 cursor-pointer hover:bg-gray-100"
              @click.stop="toggleShowAll(research.id)"
            >
              <td colspan="4" class="px-2 py-0.5 pl-8 text-blue-600">
                Show all {{ research.maxLevel - research.level - 15 }} remaining levels...
              </td>
            </tr>
          </template>
        </tbody>
      </template>
      <tbody v-if="nextTier">
        <tr>
          <td colspan="4" class="px-2 py-1 font-medium text-gray-900 bg-gray-100 rounded-sm">
            <div class="flex justify-between items-center">
              <span>Tier {{ nextTier.tier }} (Locked)</span>
              <span class="text-sm text-gray-600">
                {{ nextTier.levelsRemaining }} levels remaining
                <span class="text-xs whitespace-nowrap">
                  <span
                    class="text-gray-500 cursor-pointer hover:text-blue-600"
                    @click.stop="setCashTarget?.(nextTier.cheapestLevelsCost)"
                    >({{ formatPrice(nextTier.cheapestLevelsCost) }})</span
                  >
                  <span
                    v-if="addCashTarget"
                    class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                    title="Add to target"
                    @click.stop="addCashTarget(nextTier.cheapestLevelsCost)"
                    >+</span
                  >
                </span>
              </span>
            </div>
          </td>
        </tr>
        <template v-for="research in nextTier.items" :key="research.id">
          <tr class="cursor-pointer hover:bg-gray-50" @click="toggleResearch(research.id)">
            <td class="px-2 py-0.5 pr-4">
              <span class="inline-flex items-center gap-1">
                <svg
                  class="w-3 h-3 transition-transform text-gray-400"
                  :class="{ 'rotate-90': isExpanded(research.id) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                {{ research.name }}
                <base-info
                  v-tippy="{ content: research.description }"
                  class="inline relative -top-px ml-1 text-gray-400"
                />
              </span>
            </td>
            <td class="px-2 py-0.5 text-right whitespace-nowrap text-gray-600">0/{{ research.maxLevel }}</td>
            <td class="px-2 py-0.5 text-right whitespace-nowrap">
              <span
                class="text-gray-500 cursor-pointer hover:text-blue-600"
                @click.stop="setCashTarget?.(research.nextCost)"
                >{{ formatPrice(research.nextCost) }}</span
              >
              <span
                v-if="addCashTarget"
                class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                title="Add to target"
                @click.stop="addCashTarget(research.nextCost)"
                >+</span
              >
            </td>
            <td class="px-2 py-0.5 text-right whitespace-nowrap">
              <span
                class="text-gray-500 cursor-pointer hover:text-blue-600"
                @click.stop="setCashTarget?.(research.remainingCost)"
              >
                {{ formatPrice(research.remainingCost) }}
              </span>
              <span
                v-if="addCashTarget"
                class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                title="Add to target"
                @click.stop="addCashTarget(research.remainingCost)"
                >+</span
              >
            </td>
          </tr>
          <tr
            v-for="(cost, index) in research.tierCosts"
            v-show="isExpanded(research.id) && (isShowingAll(research.id) || index < 15)"
            :key="`${research.id}-tier-${index}`"
            class="text-xs bg-gray-50"
            :class="index === 0 ? 'text-blue-600 font-medium' : 'text-gray-500'"
          >
            <td class="px-2 py-0.5 pl-8">
              Level {{ index + 1 }}
              <span v-if="index === 0" class="ml-1">←</span>
            </td>
            <td class="px-2 py-0.5 text-right"></td>
            <td class="px-2 py-0.5 text-right tabular-nums whitespace-nowrap">
              <span class="cursor-pointer hover:text-blue-600" @click.stop="setCashTarget?.(cost)">
                {{ formatPrice(cost) }}
              </span>
              <span
                v-if="addCashTarget"
                class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                title="Add to target"
                @click.stop="addCashTarget(cost)"
                >+</span
              >
            </td>
            <td class="px-2 py-0.5 text-right tabular-nums whitespace-nowrap">
              <span
                class="cursor-pointer hover:text-blue-600"
                @click.stop="setCashTarget?.(research.tierCosts.slice(0, index + 1).reduce((a, b) => a + b, 0))"
              >
                {{ formatPrice(research.tierCosts.slice(0, index + 1).reduce((a, b) => a + b, 0)) }}
              </span>
              <span
                v-if="addCashTarget"
                class="ml-0.5 text-gray-400 cursor-pointer hover:text-blue-600"
                title="Add to target"
                @click.stop="addCashTarget(research.tierCosts.slice(0, index + 1).reduce((a, b) => a + b, 0))"
                >+</span
              >
            </td>
          </tr>
          <tr
            v-if="isExpanded(research.id) && !isShowingAll(research.id) && research.maxLevel > 15"
            :key="`${research.id}-show-all`"
            class="text-xs bg-gray-50 cursor-pointer hover:bg-gray-100"
            @click.stop="toggleShowAll(research.id)"
          >
            <td colspan="4" class="px-2 py-0.5 pl-8 text-blue-600">
              Show all {{ research.maxLevel - 15 }} remaining levels...
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <div v-else class="text-center text-gray-500 py-4">No active research tiers found.</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType, ref, toRefs, watch } from 'vue';
import { ei, formatEIValue, allModifiersFromColleggtibles, getLocalStorage, setLocalStorage, researches } from '@/lib';
import { Artifact } from '@/lib/types';
import { researchPriceMultiplier, homeFarmArtifacts, tierThresholds } from '@/lib/farmcalc';
import BaseInfo from 'ui/components/BaseInfo.vue';

interface ResearchItem {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  tier: number;
  nextCost: number;
  next5Cost: number;
  remainingCost: number;
  tierCosts: number[];
}

interface TierGroup {
  tier: number;
  items: ResearchItem[];
}

export default defineComponent({
  name: 'ResearchProgress',
  components: { BaseInfo },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
    setCashTarget: {
      type: Function as PropType<(amount: number) => void>,
      required: false,
      default: undefined,
    },
    addCashTarget: {
      type: Function as PropType<(amount: number) => void>,
      required: false,
      default: undefined,
    },
    earningsSet: {
      type: Array as PropType<Artifact[]>,
      required: true,
    },
  },
  setup(props) {
    const { backup, earningsSet } = toRefs(props);
    const expandedResearchesMap = ref<Record<string, boolean>>({});
    const showAllLevelsMap = ref<Record<string, boolean>>({});

    // Use computed to ensure reactivity tracking in production
    const expandedResearches = computed(() => expandedResearchesMap.value);
    const showAllLevels = computed(() => showAllLevelsMap.value);

    const RESEARCH_SALE_KEY = 'researchSale';
    const USE_EARNINGS_SET_KEY = 'useEarningsSetCube';
    const USE_ACTIVE_SET_KEY = 'useActiveSetCube';

    const researchSale = ref(getLocalStorage(RESEARCH_SALE_KEY) === 'true');
    const useEarningsSet = ref(getLocalStorage(USE_EARNINGS_SET_KEY) === 'true');

    const activeArtifacts = homeFarmArtifacts(backup.value, true);
    const cubeInActiveSet = computed(() => {
      return activeArtifacts.find(a => a.afxId === ei.ArtifactSpec.Name.PUZZLE_CUBE);
    });
    const useActiveSetStored = getLocalStorage(USE_ACTIVE_SET_KEY);
    const useActiveSet = ref(useActiveSetStored !== null ? useActiveSetStored === 'true' : !!cubeInActiveSet.value);

    watch(researchSale, () => {
      setLocalStorage(RESEARCH_SALE_KEY, researchSale.value.toString());
    });

    watch(useEarningsSet, () => {
      setLocalStorage(USE_EARNINGS_SET_KEY, useEarningsSet.value.toString());
    });

    watch(useActiveSet, () => {
      setLocalStorage(USE_ACTIVE_SET_KEY, useActiveSet.value.toString());
    });
    const cubeInEarningSet = computed(() => {
      return earningsSet.value.find(a => a.afxId === ei.ArtifactSpec.Name.PUZZLE_CUBE);
    });

    // Show earning set checkbox if earning set has a different cube than active
    const showEarningsSetCheckbox = computed(() => {
      return cubeInEarningSet.value && cubeInEarningSet.value.key !== cubeInActiveSet.value?.key;
    });

    // Show active set checkbox if active set has a cube
    const showActiveSetCheckbox = computed(() => {
      return !!cubeInActiveSet.value;
    });
    const toggleResearch = (researchId: string) => {
      console.log('[toggleResearch] called with:', researchId);
      console.log('[toggleResearch] current state:', JSON.stringify(expandedResearchesMap.value));

      // Create a new object to ensure reactivity - similar to eicoop's pattern
      const newExpanded = { ...expandedResearchesMap.value };
      const newShowAll = { ...showAllLevelsMap.value };

      if (newExpanded[researchId]) {
        delete newExpanded[researchId];
        delete newShowAll[researchId];
      } else {
        newExpanded[researchId] = true;
      }

      // Replace entire object for reactivity
      expandedResearchesMap.value = newExpanded;
      showAllLevelsMap.value = newShowAll;

      console.log('[toggleResearch] new state:', JSON.stringify(expandedResearchesMap.value));
    };

    const toggleShowAll = (researchId: string) => {
      console.log('[toggleShowAll] called with:', researchId);

      // Create a new object to ensure reactivity
      const newShowAll = { ...showAllLevelsMap.value };

      if (newShowAll[researchId]) {
        delete newShowAll[researchId];
      } else {
        newShowAll[researchId] = true;
      }

      // Replace entire object for reactivity
      showAllLevelsMap.value = newShowAll;

      console.log('[toggleShowAll] new state:', JSON.stringify(showAllLevelsMap.value));
    };

    // Helper functions to ensure Vue tracks property access via computed
    const isExpanded = (researchId: string) => {
      return !!expandedResearches.value[researchId];
    };

    const isShowingAll = (researchId: string) => {
      return !!showAllLevels.value[researchId];
    };

    const priceMultiplier = computed(() => {
      if (!backup.value.farms || backup.value.farms.length === 0 || !backup.value.game) {
        return 1;
      }
      const farm = backup.value.farms[0];

      // Determine which artifact set to use for cube discount
      let artifacts: Artifact[] = [];
      if (useEarningsSet.value && cubeInEarningSet.value) {
        artifacts = earningsSet.value;
      } else if (useActiveSet.value && cubeInActiveSet.value) {
        artifacts = activeArtifacts;
      }

      const modifiers = allModifiersFromColleggtibles(backup.value);
      const eventMultiplier = researchSale.value ? 0.3 : 1;
      return researchPriceMultiplier(farm, backup.value.game, artifacts, modifiers.researchCost, eventMultiplier);
    });

    const visibleTiers = computed(() => {
      if (!backup.value.farms || backup.value.farms.length === 0) {
        return [];
      }

      const farm = backup.value.farms[0];
      const commonResearch = farm.commonResearch || [];

      // Map research ID to current level
      const researchLevels = new Map<string, number>();
      for (const r of commonResearch) {
        if (r.id && r.level !== undefined && r.level !== null) {
          researchLevels.set(r.id, r.level);
        }
      }

      // Group researches by tier
      const tiers = new Map<number, ResearchItem[]>();

      for (const r of researches) {
        // Only process common research
        if (r.type !== 'common') continue;
        if (r.tier === undefined) continue;

        const currentLevel = researchLevels.get(r.id) || 0;
        const maxLevel = r.levels;

        // Calculate next cost if not maxed
        let nextCost = 0;
        let remainingCost = 0;
        let next5Cost = 0;
        if (currentLevel < maxLevel) {
          // prices array is 0-indexed, so price for next level (currentLevel + 1) is at index currentLevel
          // However, researches.json structure needs to be checked.
          // Usually prices[i] is the cost to buy the (i+1)-th level.
          // e.g. prices[0] is cost to go from 0 to 1.
          // So if currentLevel is 0, we want prices[0].
          // If currentLevel is 5, we want prices[5] (cost for 6th level).
          if (r.virtue_prices) {
            if (currentLevel < r.virtue_prices.length) {
              nextCost = r.virtue_prices[currentLevel] * priceMultiplier.value;
            }
            for (let i = currentLevel; i < maxLevel; i++) {
              if (i < r.virtue_prices.length) {
                const cost = r.virtue_prices[i] * priceMultiplier.value;
                remainingCost += cost;
                if (i < currentLevel + 5) {
                  next5Cost += cost;
                }
              }
            }
          }
        }

        // Get all tier costs for expansion view, applying price multiplier
        const tierCosts: number[] = (r.virtue_prices || []).map(price => price * priceMultiplier.value);

        const item: ResearchItem = {
          id: r.id,
          name: r.name,
          description: r.description,
          level: currentLevel,
          maxLevel: maxLevel,
          tier: r.tier,
          nextCost: nextCost,
          next5Cost: next5Cost,
          remainingCost: remainingCost,
          tierCosts: tierCosts,
        };

        if (!tiers.has(r.tier)) {
          tiers.set(r.tier, []);
        }
        tiers.get(r.tier)!.push(item);
      }

      const result: TierGroup[] = [];

      // Sort tiers
      const sortedTierKeys = Array.from(tiers.keys()).sort((a, b) => a - b);

      for (const tierNum of sortedTierKeys) {
        const items = tiers.get(tierNum)!;

        // Check visibility conditions:
        // 1. Hide if all research in tier is maxed.
        const allMaxed = items.every(item => item.level >= item.maxLevel);

        // 2. Hide if nothing researched yet (all levels are 0) - unless it's the next tier to unlock
        const nothingResearched = items.every(item => item.level === 0);

        if (!allMaxed && !nothingResearched) {
          result.push({
            tier: tierNum,
            items: items,
          });
        }
      }

      return result;
    });

    const nextTier = computed(() => {
      if (!backup.value.farms || backup.value.farms.length === 0) {
        return null;
      }

      const farm = backup.value.farms[0];
      const commonResearch = farm.commonResearch || [];

      // Calculate total research levels purchased
      let totalLevels = 0;
      for (const r of commonResearch) {
        if (r.level !== undefined && r.level !== null) {
          totalLevels += r.level;
        }
      }

      // Find the highest tier with any research purchased
      let highestTierWithResearch = 0;
      for (const r of researches) {
        if (r.type !== 'common' || r.tier === undefined) continue;
        const currentLevel = commonResearch.find(cr => cr.id === r.id)?.level || 0;
        if (currentLevel > 0 && r.tier > highestTierWithResearch) {
          highestTierWithResearch = r.tier;
        }
      }

      // Check if next tier exists
      const nextTierNum = highestTierWithResearch + 1;
      if (nextTierNum > tierThresholds.length) {
        return null; // No more tiers
      }

      // Get threshold for next tier (tier numbers are 1-indexed, array is 0-indexed)
      const requiredLevels = tierThresholds[nextTierNum - 1];
      // Get threshold for current tier (0 if tier 1)
      const previousTierLevels = nextTierNum > 1 ? tierThresholds[nextTierNum - 2] : 0;

      // Calculate levels relative to previous tier
      const currentLevelsRelative = totalLevels - previousTierLevels;
      const requiredLevelsRelative = requiredLevels - previousTierLevels;
      const levelsRemaining = requiredLevelsRelative - currentLevelsRelative;

      // Calculate cost of cheapest N research levels to unlock tier
      // Collect all available research level costs from tiers below the next tier
      const availableLevelCosts: number[] = [];
      for (const r of researches) {
        if (r.type !== 'common' || r.tier === undefined || r.tier >= nextTierNum) continue;

        const currentLevel = commonResearch.find(cr => cr.id === r.id)?.level || 0;
        if (currentLevel < r.levels && r.virtue_prices) {
          // Add costs for remaining levels in this research
          for (let i = currentLevel; i < r.levels && i < r.virtue_prices.length; i++) {
            availableLevelCosts.push(r.virtue_prices[i] * priceMultiplier.value);
          }
        }
      }

      // Sort by price and take the cheapest N levels
      availableLevelCosts.sort((a, b) => a - b);
      const cheapestLevelsCost = availableLevelCosts.slice(0, levelsRemaining).reduce((sum, cost) => sum + cost, 0);

      // Get research items for this tier
      const tierItems: ResearchItem[] = [];
      for (const r of researches) {
        if (r.type !== 'common' || r.tier !== nextTierNum) continue;

        const tierCosts: number[] = (r.virtue_prices || []).map(price => price * priceMultiplier.value);
        const nextCost = tierCosts.length > 0 ? tierCosts[0] : 0;
        const remainingCost = tierCosts.reduce((sum, cost) => sum + cost, 0);

        tierItems.push({
          id: r.id,
          name: r.name,
          description: r.description,
          level: 0,
          maxLevel: r.levels,
          tier: r.tier,
          nextCost: nextCost,
          next5Cost: 0,
          remainingCost: remainingCost,
          tierCosts: tierCosts,
        });
      }

      return {
        tier: nextTierNum,
        levelsRemaining: levelsRemaining,
        cheapestLevelsCost: cheapestLevelsCost,
        items: tierItems,
      };
    });

    const formatPrice = (price: number) => {
      // Use a formatter that handles large numbers nicely
      if (price === 0) return 'Free';
      return formatEIValue(price, { trim: true });
    };

    return {
      visibleTiers,
      nextTier,
      formatPrice,
      expandedResearches,
      toggleResearch,
      researchSale,
      showAllLevels,
      toggleShowAll,
      useEarningsSet,
      useActiveSet,
      showEarningsSetCheckbox,
      showActiveSetCheckbox,
      isExpanded,
      isShowingAll,
    };
  },
});
</script>
