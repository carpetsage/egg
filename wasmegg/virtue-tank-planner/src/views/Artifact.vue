<template>
    <div>
    <label>Maximum Days to Wait</label><input v-model="waitTime_days" v-se>
  </div>

  <div class="-mx-4 sm:mx-0 bg-gray-50 overflow-hidden sm:rounded-lg sm:shadow-md isolate">
    <div class="bg-gray-100 px-4 py-4 border-b border-gray-200 sm:px-6">
      <div class="-ml-4 -mt-2 flex items-center justify-between flex-wrap sm:flex-nowrap">
        <div class="ml-4 mt-2">
          <artifact-name :artifact="artifact" :show-tier="false" :no-link="true" :no-availability-marker="true" />
        </div>
        <div class="ml-4 mt-2 flex-shrink-0">
          <share :id="artifact.id" :page="'artifact'" />
        </div>
      </div>
    </div>

    <div class="px-4 py-4 sm:px-6 space-y-2">
      <ArtifactMissionOptimizer :artifact-id="artifactId" :max-wait-time_seconds="waitTime_days * 86400" />
    </div>

    <template v-if="artifact.recipe">
      <div class="px-4 py-4 sm:px-6 space-y-2">
        <div class="text-sm font-medium text-gray-500">Crafting recipe:</div>
        <div>
          <table class="tabular-nums">
            <tbody>
              <tr v-for="ingredient in artifact.recipe.ingredients" :key="ingredient.id">
                <td class="text-left text-sm">{{ ingredient.count }}&times;</td>
                <td class="pl-1">
                  <artifact-name :artifact="id2artifact(ingredient.id)" :show-tier="true" />
                </td>
              </tr>
            </tbody>
          </table>
          <div class="my-0.5 -mx-0.5 flex items-center space-x-1">
            <img class="h-4 w-4" :src="iconURL('egginc-extras/icon_golden_egg.png', 64)" />
            <span class="text-sm">
              {{ artifact.recipe.crafting_price.initial.toLocaleString('en-US') }} &ndash;
              {{ artifact.recipe.crafting_price.minimum.toLocaleString('en-US') }}
            </span>
            <base-info
              v-tippy="{
                content:
                  `The crafting price is determined by the following formula: ` +
                  `<img class='p-2 bg-white' src='${craftingPriceFormulaImage}'>`,
                allowHTML: true,
              }"
            />
          </div>
          <span class="text-sm"> {{ artifact.crafting_xp.toLocaleString('en-US') }} Crafting XP </span>
        </div>
      </div>
      <hr />
    </template>

    <template v-if="!artifact.ingredients_available_from_missions">
      <div class="px-4 py-4 sm:px-6 space-y-2">
        <div class="flex items-center space-x-1">
          <span class="text-sm font-medium text-gray-500">Hard dependencies</span>
          <base-info
            v-tippy="{
              content:
                'For an item unobtainable from missions, the hard dependencies are the highest level mission-obtainable items in the crafting ingredient tree; i.e., you absolutely have to gather these ingredients to craft the item in question, no way to skip them.',
            }"
          />
        </div>
        <div>
          <table class="tabular-nums">
            <tbody>
              <tr v-for="ingredient in artifact.hard_dependencies" :key="ingredient.id">
                <td class="text-left text-sm">{{ ingredient.count }}&times;</td>
                <td class="pl-1">
                  <artifact-name :artifact="id2artifact(ingredient.id)" :show-tier="true" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <hr />
    </template>

    <template v-if="recursiveIngredients.length > 0">
      <div class="px-4 py-4 sm:px-6 space-y-2">
        <div class="flex items-center space-x-1">
          <span class="text-sm font-medium text-gray-500">Recursive ingredients</span>
          <base-info
            v-tippy="{
              content: 'Ingredients of ingredients, ingredients of ingredients of ingredients, etc.',
            }"
          />
        </div>
        <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
          <li v-for="ingredient in recursiveIngredients" :key="ingredient.id">
            <artifact-name :artifact="ingredient" :show-tier="true" />
          </li>
        </ul>
      </div>
      <hr />
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs, ref, watch, } from 'vue';

import { ei, iconURL } from 'lib';
import { AfxTier, allPossibleTiers, getArtifactTierPropsFromId as id2artifact } from 'lib/artifacts/data';
import { cmpArtifactTiers } from '@/lib';
import { rarityFgClass500 } from '@/utils';
import BaseInfo from 'ui/components/BaseInfo.vue';
import ArtifactName from '@/components/ArtifactName.vue';
import ArtifactMissionOptimizer from '@/components/ArtifactMissionOptimizer.vue';
import Share from '@/components/Share.vue';
import craftingPriceFormulaImage from '@/assets/crafting-price-formula.svg';

import Type = ei.ArtifactSpec.Type;

export default defineComponent({
  components: {
    BaseInfo,
    ArtifactName,
    ArtifactMissionOptimizer: ArtifactMissionOptimizer,
    Share,
  },
  props: {
    page: {
      type: String,
      required: true,
    },
    artifactId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { artifactId,  } = toRefs(props);


    const waitTime_days = ref(30);

    const artifact = computed(() => id2artifact(artifactId.value));
    const recursiveIngredients = computed(() => {
      if (!artifact.value.recipe) {
        return [];
      }
      const queue = artifact.value.recipe.ingredients.map(it => id2artifact(it.id)!);
      const directIngredients = new Set(queue.map(it => it.id));
      const seen = new Set();
      const ingredients = [];
      while (queue.length > 0) {
        const item = queue.shift()!;
        if (!directIngredients.has(item.id)) {
          if (seen.has(item.id)) {
            continue;
          }
          ingredients.push(item);
        }
        seen.add(item.id);
        if (!item.recipe) {
          continue;
        }
        queue.push(...item.recipe.ingredients.map(it => id2artifact(it.id)));
      }
      return ingredients.sort(cmpArtifactTiers);
    });
    const dependents = computed(() => calculateDependents(artifact.value));
    const recursiveDependents = computed(() => {
      const queue = dependents.value.map(it => it.item);
      const directDependentIds = new Set(queue.map(it => it.id));
      const seen = new Set();
      const deps = [];
      while (queue.length > 0) {
        const item = queue.shift()!;
        if (!directDependentIds.has(item.id)) {
          if (seen.has(item.id)) {
            continue;
          }
          deps.push(item);
        }
        seen.add(item.id);
        queue.push(...calculateDependents(item).map(it => it.item));
      }
      return deps.sort(cmpArtifactTiers);
    });
    const hardDependents = computed(() => {
      const allDependents = dependents.value.map(it => it.item).concat(recursiveDependents.value);
      const hard = [];
      for (const dependent of allDependents) {
        if (dependent.hard_dependencies !== null) {
          for (const ingredient of dependent.hard_dependencies) {
            if (ingredient.id === artifactId.value) {
              hard.push({
                item: dependent,
                count: ingredient.count,
              });
            }
          }
        }
      }
      return hard.sort((it1, it2) => cmpArtifactTiers(it1.item, it2.item));
    });

    return {
      id2artifact,
      artifact,
      recursiveIngredients,
      dependents,
      recursiveDependents,
      hardDependents,
      craftingPriceFormulaImage,
      iconURL,
      rarityFgClass500,
      Type,
      waitTime_days
    };
  },
});

function calculateDependents(item: AfxTier): { item: AfxTier; count: number }[] {
  const dependents = [];
  for (const it of allPossibleTiers) {
    if (!it.recipe) {
      continue;
    }
    for (const ingredient of it.recipe.ingredients) {
      if (ingredient.id === item.id) {
        dependents.push({
          item: it,
          count: ingredient.count,
        });
        break;
      }
    }
  }
  return dependents;
}
</script>
