<template>
  <table class="my-2" :style="{ width: 'initial' }">
    <thead>
      <tr v-if="hasLeagues" class="divide-x divide-gray-200 dark:divide-gray-600">
        <th
          :colspan="2"
          class="px-3 py-2 whitespace-nowrap text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
        >
          Elite
        </th>
        <th
          :colspan="2"
          class="px-3 py-2 whitespace-nowrap text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
        >
          Standard
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(tier, tierIndex) in tiers" :key="tierIndex">
        <template v-for="(goal, league) in tier" :key="league">
          <td
            class="pl-3 pr-2 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
            :style="{ minWidth: '4rem' }"
          >
            {{ formatEIValue(target(goal), { trim: true }) }}
          </td>
          <td
            class="pl-2 pr-3 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
            :class="
              hasLeagues && league === 0 ? 'border-r border-gray-200 dark:border-gray-600' : null
            "
            :style="{ minWidth: '6rem' }"
          >
            <span class="flex items-center space-x-1">
              <base-icon
                v-tippy="{ content: rewardName(goal) }"
                :icon-rel-path="rewardIconPath(goal)"
                :size="64"
                class="h-5 w-5"
              />
              <span class="text-sm text-gray-500 dark:text-gray-200">
                {{ rewardAmountDisplay(goal) }}
              </span>
            </span>
          </td>
        </template>
      </tr>

      <tr>
        <td
          :colspan="hasLeagues ? 4 : 2"
          class="px-3 py-2 whitespace-nowrap text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
        >
          Required rate
        </td>
      </tr>

      <tr class="divide-x divide-gray-200 dark:divide-gray-600">
        <td
          v-for="(rate, league) in requiredHourlyRates"
          :key="league"
          :colspan="2"
          class="px-3 py-1 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-200 tabular-nums"
        >
          {{ formatEIValue(rate) }}/hr
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';

import { rewardAmountDisplay, rewardIconPath, rewardName } from 'lib';
import { Contract, ei, formatEIValue } from '@/lib';
import BaseIcon from 'ui/components/BaseIcon.vue';

export default defineComponent({
  components: {
    BaseIcon,
  },
  props: {
    contract: {
      type: Object as PropType<Contract>,
      required: true,
    },
  },
  setup(props) {
    type Goal = ei.Contract.IGoal;

    const { contract } = toRefs(props);

    const hasLeagues = computed(() => !!contract.value.goalSets);
    const lengthHours = computed(() => contract.value.lengthSeconds! / 3600);
    const tiers = computed(() => {
      if (hasLeagues.value) {
        const eliteGoals = contract.value.goalSets![0].goals!;
        const standardGoals = contract.value.goalSets![1].goals!;
        return eliteGoals.map((eliteGoal, i) => [eliteGoal, standardGoals[i]]);
      } else {
        const goals = contract.value.goals!;
        return goals.map(goal => [goal]);
      }
    });
    const requiredHourlyRates = computed(() => {
      return tiers.value[tiers.value.length - 1].map(
        goal => goal.targetAmount! / lengthHours.value
      );
    });

    const target = (goal: Goal) => goal.targetAmount!;

    return {
      hasLeagues,
      tiers,
      requiredHourlyRates,
      target,
      formatEIValue,
      rewardIconPath,
      rewardName,
      rewardAmountDisplay,
    };
  },
});
</script>
