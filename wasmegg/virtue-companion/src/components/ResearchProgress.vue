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
      <input
        v-if="cubeInEarningsSet && !sameCubeInBothSets"
        id="use-earnings-cube"
        v-model="useEarningsSet"
        type="checkbox"
        class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 ml-2"
      />
      <label v-if="cubeInEarningsSet && !sameCubeInBothSets" for="use-earnings-cube" class="ml-2 text-sm text-gray-600"
        >Use Cube From Earnings Set</label
      >
      <input
        v-if="cubeInActiveSet"
        id="use-active-cube"
        v-model="useActiveSet"
        type="checkbox"
        class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0 ml-2"
      />
      <label v-if="cubeInActiveSet" for="use-active-cube" class="ml-2 text-sm text-gray-600"
        >Use Cube From Active Set</label
      >
    </div>
    <div class="mb-2 text-xs text-gray-500">
      Note: Click on a price to target it in the earnings section above. Click on the + to add to the target.
    </div>
    <table v-if="visibleTiers.length > 0 || nextTier" class="tabular-nums w-full">
      <thead>
        <tr class="border-b border-gray-200">
          <th class="px-2 py-1 text-left font-bold">Research</th>
          <th class="px-2 py-1 text-right font-bold">Level</th>
          <th class="px-2 py-1 text-right font-bold">Next Level</th>
          <th class="px-2 py-1 text-right font-bold">Sum</th>
        </tr>
      </thead>
      <research-tier
        v-for="tier in visibleTiers"
        :key="tier.tier"
        :tier-number="tier.tier"
        :items="tier.items"
        :locked="tier.levelsRemaining !== undefined"
        :levels-remaining="tier.levelsRemaining"
        :cheapest-levels-cost="tier.cheapestLevelsCost"
        :expanded-researches="expandedResearches"
        :show-all-levels="showAllLevels"
        :format-price="formatPrice"
        :set-cash-target="setCashTarget"
        :add-cash-target="addCashTarget"
        @toggle-research="toggleResearch"
        @toggle-show-all="toggleShowAll"
      />
    </table>
    <div v-else class="text-center text-gray-500 py-4">No active research tiers found.</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType, ref, toRefs, watch, reactive } from 'vue';
import { ei, formatEIValue, allModifiersFromColleggtibles, getLocalStorage, setLocalStorage, researches } from '@/lib';
import { Artifact } from '@/lib/types';
import {
  researchPriceMultiplier,
  homeFarmArtifacts,
  tierThresholds,
  getTotalResearchLevels,
  getUnlockedTiers,
  getNextLockedTier,
} from '@/lib/farmcalc';
import ResearchTier from '@/components/ResearchTier.vue';

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

interface ResearchLevelCost {
  researchId: string;
  researchName: string;
  level: number;
  cost: number;
}

interface TierGroup {
  tier: number;
  items: ResearchItem[];
  levelsRemaining?: number;
  cheapestLevelsCost?: number;
  cheapestResearches?: ResearchLevelCost[];
}

// return {
//       tier: nextTierNum,
//       levelsRemaining: levelsRemaining,
//       cheapestLevelsCost: cheapestLevelsCost,
//       cheapestResearches: cheapestResearches,
//       items: tierItems,
//     };

export default defineComponent({
  name: 'ResearchProgress',
  components: { ResearchTier },
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

    // Use reactive for expansion state - Vue tracks property access better with reactive objects
    const expandedResearches = reactive<Record<string, boolean>>({});
    const showAllLevels = reactive<Record<string, boolean>>({});

    const RESEARCH_SALE_KEY = 'researchSale';
    const USE_EARNINGS_SET_KEY = 'useEarningsSetCube';
    const USE_ACTIVE_SET_KEY = 'useActiveSetCube';

    const researchSale = ref(getLocalStorage(RESEARCH_SALE_KEY) === 'true');

    const cubeInEarningsSet = computed(() => {
      return earningsSet.value.find(a => a.afxId === ei.ArtifactSpec.Name.PUZZLE_CUBE);
    });

    const activeArtifacts = computed(() => homeFarmArtifacts(backup.value, true));
    const cubeInActiveSet = computed(() => {
      return activeArtifacts.value.find(a => a.afxId === ei.ArtifactSpec.Name.PUZZLE_CUBE);
    });

    const sameCubeInBothSets = computed(() => {
      const earningsCube = cubeInEarningsSet.value;
      const activeCube = cubeInActiveSet.value;
      if (!earningsCube || !activeCube) return false;
      return earningsCube.afxLevel === activeCube.afxLevel && earningsCube.afxRarity === activeCube.afxRarity;
    });

    const useEarningsSetStored = getLocalStorage(USE_EARNINGS_SET_KEY);
    const useActiveSetStored = getLocalStorage(USE_ACTIVE_SET_KEY);

    const useEarningsSet = ref(
      useEarningsSetStored !== null && cubeInEarningsSet.value && !sameCubeInBothSets.value
        ? useEarningsSetStored === 'true'
        : false
    );

    const useActiveSet = ref(
      sameCubeInBothSets.value
        ? useEarningsSetStored === 'true' || useActiveSetStored === 'true'
        : useActiveSetStored !== null && cubeInActiveSet.value
          ? useActiveSetStored === 'true'
          : false
    );

    watch(researchSale, () => {
      setLocalStorage(RESEARCH_SALE_KEY, researchSale.value.toString());
    });

    watch(useEarningsSet, () => {
      setLocalStorage(USE_EARNINGS_SET_KEY, useEarningsSet.value.toString());
      // If turning on earnings set cube, turn off active set cube
      if (useEarningsSet.value) {
        useActiveSet.value = false;
      }
    });

    watch(useActiveSet, () => {
      setLocalStorage(USE_ACTIVE_SET_KEY, useActiveSet.value.toString());
      // If turning on active set cube, turn off earnings set cube
      if (useActiveSet.value) {
        useEarningsSet.value = false;
      }
    });

    const toggleResearch = (researchId: string) => {
      if (expandedResearches[researchId]) {
        delete expandedResearches[researchId];
        delete showAllLevels[researchId];
      } else {
        expandedResearches[researchId] = true;
      }
    };

    const toggleShowAll = (researchId: string) => {
      if (showAllLevels[researchId]) {
        delete showAllLevels[researchId];
      } else {
        showAllLevels[researchId] = true;
      }
    };

    const priceMultiplier = computed(() => {
      if (!backup.value.farms || backup.value.farms.length === 0 || !backup.value.game) {
        return 1;
      }
      const farm = backup.value.farms[0];

      // Determine which artifact set to use for cube discount
      const artifacts = useEarningsSet.value ? earningsSet.value : useActiveSet.value ? activeArtifacts.value : [];
      // If neither checkbox is checked then no artis.

      const modifiers = allModifiersFromColleggtibles(backup.value);
      const eventMultiplier = researchSale.value ? 0.3 : 1;
      return researchPriceMultiplier(farm, backup.value.game, artifacts, modifiers.researchCost, eventMultiplier);
    });

    const nextTier = computed(() => {
      if (!backup.value.farms || backup.value.farms.length === 0) {
        return null;
      }

      const farm = backup.value.farms[0];
      const commonResearch = farm.commonResearch || [];

      // Calculate total research levels purchased
      const totalLevels = getTotalResearchLevels(farm);

      // Find the next locked tier
      const nextTierNum = getNextLockedTier(totalLevels);
      if (nextTierNum === null) {
        return null; // All tiers unlocked
      }

      // Get threshold for next tier (tier numbers are 1-indexed, array is 0-indexed)
      const requiredLevels = tierThresholds[nextTierNum - 1];
      // Get threshold for current tier (0 if tier 1)
      const previousTierLevels = nextTierNum > 1 ? tierThresholds[nextTierNum - 2] : 0;

      // Calculate levels relative to previous tier
      const currentLevelsRelative = totalLevels - previousTierLevels;
      const requiredLevelsRelative = requiredLevels - previousTierLevels;
      const levelsRemaining = requiredLevelsRelative - currentLevelsRelative;

      // Safety check - should never be negative now
      if (levelsRemaining < 0) {
        return null; // Tier already unlocked
      }

      // Calculate cost of cheapest N research levels to unlock tier
      // Collect all available research level costs from tiers below the next tier

      const availableLevelCosts: ResearchLevelCost[] = [];
      for (const r of researches) {
        if (r.type !== 'common' || r.tier === undefined || r.tier >= nextTierNum) continue;

        const currentLevel = commonResearch.find(cr => cr.id === r.id)?.level || 0;
        if (currentLevel < r.levels && r.virtue_prices) {
          // Add costs for remaining levels in this research
          for (let i = currentLevel; i < r.levels && i < r.virtue_prices.length; i++) {
            availableLevelCosts.push({
              researchId: r.id,
              researchName: r.name,
              level: i + 1,
              cost: r.virtue_prices[i] * priceMultiplier.value,
            });
          }
        }
      }

      // Sort by price and take the cheapest N levels
      availableLevelCosts.sort((a, b) => a.cost - b.cost);
      const cheapestResearches = availableLevelCosts.slice(0, levelsRemaining);
      const cheapestLevelsCost = cheapestResearches.reduce((sum, item) => sum + item.cost, 0);

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

      const result: TierGroup = {
        tier: nextTierNum,
        levelsRemaining: levelsRemaining,
        cheapestLevelsCost: cheapestLevelsCost,
        cheapestResearches: cheapestResearches,
        items: tierItems,
      };
      return result;
    });

    const visibleTiers = computed(() => {
      if (!backup.value.farms || backup.value.farms.length === 0) {
        return [];
      }

      const farm = backup.value.farms[0];
      const commonResearch = farm.commonResearch || [];

      // Calculate total research levels to determine which tiers are unlocked
      const totalLevels = getTotalResearchLevels(farm);

      // Determine which tiers are unlocked
      const unlockedTiers = getUnlockedTiers(totalLevels);

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
        const allMaxed = items.every(item => item.level >= item.maxLevel);

        // Skip this tier if it's the next locked tier (will be added separately below)
        if (!allMaxed && unlockedTiers.has(tierNum)) {
          result.push({
            tier: tierNum,
            items: items,
          });
        }
      }
      // Show next locked tier as well if it exists
      if (nextTier.value) {
        result.push(nextTier.value);
      }

      return result;
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
      toggleResearch,
      researchSale,
      toggleShowAll,
      useEarningsSet,
      useActiveSet,
      cubeInEarningsSet,
      cubeInActiveSet,
      sameCubeInBothSets,
      expandedResearches,
      showAllLevels,
    };
  },
});
</script>
