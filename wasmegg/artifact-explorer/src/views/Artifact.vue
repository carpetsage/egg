<template>
  <div class="-mx-4 sm:mx-0 bg-gray-50 overflow-hidden sm:rounded-lg sm:shadow-md isolate">
    <div class="bg-gray-100 px-4 py-4 border-b border-gray-200 sm:px-6">
      <div class="-ml-4 -mt-2 flex items-center justify-between flex-wrap sm:flex-nowrap">
        <div class="ml-4 mt-2">
          <artifact-name :artifact="artifact" :show-tier="true" :no-link="true" :no-availability-marker="true" />
        </div>
        <div class="ml-4 mt-2 flex-shrink-0">
          <share :id="artifact.id" :page="'artifact'" />
        </div>
      </div>
    </div>

    <template v-if="artifact.effects">
      <div class="px-2 py-4 sm:px-4 space-y-2">
        <div class="px-2 text-sm font-medium text-gray-500">
          {{ artifact.effects.length > 1 ? 'Effects' : 'Effect' }}:
        </div>
        <div class="flex flex-col space-y-2">
          <div class="flex-grow overflow-auto">
            <table class="tabular-nums">
              <tbody>
                <tr
                  v-for="rarity in artifact.effects"
                  :key="rarity.afx_rarity"
                  :class="rarityFgClass500(rarity.afx_rarity)"
                >
                  <td v-if="artifact.has_rarities" class="h-5 px-2 whitespace-nowrap text-left text-sm leading-4">
                    {{ rarity.rarity }}
                  </td>
                  <td
                    v-if="rarity.slots !== null"
                    v-tippy="{ content: rarity.slots === 1 ? '1 slot' : `${rarity.slots} slots` }"
                    class="h-5 flex items-center px-2 whitespace-nowrap space-x-0.5"
                  >
                    <div
                      v-for="index in rarity.slots"
                      :key="index"
                      class="flex h-4 w-4 items-center justify-center rounded bg-gray-400"
                    >
                      <img
                        class="h-5 w-5 max-w-none"
                        :src="iconURL('egginc-extras/icon_afx_stone_slot.png', 64)"
                        :style="{ filter: 'brightness(10)' }"
                      />
                    </div>
                  </td>
                  <td class="h-5 px-2 truncate text-left text-sm leading-4">{{ rarity.effect }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <hr />
    </template>

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

    <div class="px-4 py-4 sm:px-6 space-y-2">
      <artifact-drop-stats :artifact-id="artifactId" />
    </div>

    <hr />
    <div class="px-4 py-4 sm:px-6 space-y-2">
      <template v-if="dependents.length > 0">
        <div class="text-sm font-medium text-gray-500">Used in:</div>
        <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3 tabular-nums">
          <li v-for="dependent in dependents" :key="dependent.item.id" class="flex">
            <span class="text-sm pr-1 whitespace-nowrap">{{ dependent.count }}x in</span>
            <artifact-name :artifact="dependent.item" :show-tier="true" />
          </li>
        </ul>
      </template>
      <div v-else class="text-sm font-medium text-gray-500">Not used in crafting.</div>
    </div>

    <template v-if="hardDependents.length > 0">
      <hr />
      <div class="px-4 py-4 sm:px-6 space-y-2">
        <div class="flex items-center space-x-1">
          <span class="text-sm font-medium text-gray-500">Hard dependents</span>
          <base-info
            v-tippy="{
              content:
                'For a mission-obtainable item, a hard dependent is a mission-unobtainable item that must use the indicated number of this item in its crafting tree.',
            }"
          />
        </div>
        <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3 tabular-nums">
          <li v-for="dependent in hardDependents" :key="dependent.item.id" class="flex">
            <span class="text-sm pr-1 whitespace-nowrap">{{ dependent.count }}x in</span>
            <artifact-name :artifact="dependent.item" :show-tier="true" />
          </li>
        </ul>
      </div>
    </template>

    <template v-if="recursiveDependents.length > 0">
      <hr />
      <div class="px-4 py-4 sm:px-6 space-y-2">
        <div class="flex items-center space-x-1">
          <span class="text-sm font-medium text-gray-500">Recursive dependents</span>
          <base-info
            v-tippy="{
              content:
                'Dependents of dependents (i.e. &quot;used in&quot;), dependents of dependents of dependents, etc.',
            }"
          />
        </div>
        <ul class="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
          <li v-for="dependent in recursiveDependents" :key="dependent.id">
            <artifact-name :artifact="dependent" :show-tier="true" />
          </li>
        </ul>
      </div>
    </template>

    <hr />
    <div class="px-4 py-4 sm:px-6 space-y-1">
      <div>
        <span class="text-sm font-medium text-gray-500 mr-1"> What do I get from consuming this item? </span>
        <a
          :href="`https://wasmegg-carpet.netlify.app/consumption-sheet/#${artifactId}`"
          target="_blank"
          class="inline-flex items-center border-dashed border-b border-gray-700 text-sm whitespace-nowrap leading-tight space-x-0.5"
        >
          <span>Consumption sheet</span>
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
            <path
              d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
            />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      </div>
      <div v-if="artifact.afx_type === Type.STONE || artifact.afx_type === Type.STONE_INGREDIENT">
        <span class="text-sm font-medium text-gray-500 mr-1">
          Consuming which items yields this
          {{ artifact.afx_type === Type.STONE ? 'stone' : 'stone fragment' }}?
        </span>
        <a
          :href="`https://wasmegg-carpet.netlify.app/consumption-sheet/#${artifact.id}-sources`"
          target="_blank"
          class="inline-flex items-center border-dashed border-b border-gray-700 text-sm whitespace-nowrap leading-tight space-x-0.5"
        >
          <span>Consumption sheet</span>
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
            <path
              d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
            />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';

import { ei, iconURL } from 'lib';
import { AfxTier, allPossibleTiers, getArtifactTierPropsFromId as id2artifact } from 'lib/artifacts/data';
import { cmpArtifactTiers } from '@/lib';
import { rarityFgClass500 } from '@/utils';
import BaseInfo from 'ui/components/BaseInfo.vue';
import ArtifactName from '@/components/ArtifactName.vue';
import ArtifactDropStats from '@/components/ArtifactDropStats.vue';
import Share from '@/components/Share.vue';
import craftingPriceFormulaImage from '@/assets/crafting-price-formula.svg';

import Type = ei.ArtifactSpec.Type;

export default defineComponent({
  components: {
    BaseInfo,
    ArtifactName,
    ArtifactDropStats,
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
    const { artifactId } = toRefs(props);
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
