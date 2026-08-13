<template>
  <div v-if="artifactIds.length > 0" class="-mx-4 sm:mx-0 mt-2 mb-4 space-y-4">
    <!-- Header spans both columns -->
    <div class="bg-gray-100 px-4 py-4 border-b border-gray-200 sm:px-6 sm:rounded-lg sm:shadow-sm">
      <div class="-ml-4 -mt-2 flex items-center justify-between flex-wrap sm:flex-nowrap">
        <div class="ml-4 mt-2 space-y-1">
          <artifact-name
            v-for="artifact in artifacts"
            :key="artifact.id"
            :artifact="artifact"
            :show-tier="false"
            :no-link="true"
            :no-availability-marker="true"
          />
        </div>
        <div class="ml-4 mt-2 flex-shrink-0">
          <share :id="serializedArtifactIds" :page="'tank'" />
        </div>
      </div>
    </div>

    <div class="px-4 sm:px-0">
      <ArtifactMissionOptimizer :artifact-ids="artifactIds">
      </ArtifactMissionOptimizer>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs, watchEffect } from 'vue';
import { useRouter } from 'vue-router';

import { iconURL } from 'lib';
import { getArtifactTierPropsFromId as id2artifact } from 'lib/artifacts/data';
import { cmpArtifactTiers, serializeTankIds } from '@/lib';
import { parseKnownTankIds } from '@/lib/filter';
import BaseInfo from 'ui/components/BaseInfo.vue';
import ArtifactName from '@/components/ArtifactName.vue';
import ArtifactMissionOptimizer from '@/components/ArtifactMissionOptimizer.vue';
import Share from '@/components/Share.vue';
import craftingPriceFormulaImage from '@/assets/crafting-price-formula.svg';

function recursiveIngredientsOf(artifact: ReturnType<typeof id2artifact>) {
  if (!artifact.recipe) {
    return [];
  }
  const queue = artifact.recipe.ingredients.map(it => id2artifact(it.id)!);
  const directIngredients = new Set(queue.map(it => it.id));
  const seen = new Set();
  const ingredients = [];
  while (queue.length > 0) {
    const item = queue.shift()!;
    // Dedupe on first pop regardless of whether this is a direct ingredient.
    // Skipping the check for direct ingredients meant one reachable as a
    // descendant of another was re-expanded, and its whole subtree re-enqueued,
    // every time it recurred — same output, repeated work. That cost used to be
    // paid once per page; with several artifacts selected it is paid per
    // artifact.
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    if (!directIngredients.has(item.id)) {
      ingredients.push(item);
    }
    if (!item.recipe) {
      continue;
    }
    queue.push(...item.recipe.ingredients.map(it => id2artifact(it.id)));
  }
  return ingredients.sort(cmpArtifactTiers);
}

export default defineComponent({
  components: {
    BaseInfo,
    ArtifactName,
    ArtifactMissionOptimizer,
    Share,
  },
  props: {
    tankPlannerArtifactId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { tankPlannerArtifactId: rawParam } = toRefs(props);
    const router = useRouter();

    // Drop any id that doesn't resolve to a real artifact before it ever
    // reaches id2artifact()/getArtifactTierPropsFromId(), which throws for
    // unrecognized ids. The route param comes straight from the URL, so a
    // hand-edited link or a stale bookmark referencing a renamed/removed
    // artifact must not be able to crash this view.
    const artifactIds = computed(() => parseKnownTankIds(rawParam.value));
    const serializedArtifactIds = computed(() => serializeTankIds(artifactIds.value));
    const artifacts = computed(() => artifactIds.value.map(id => id2artifact(id)));
    // Keep this deep-linkable-single-artifact-compatible: with one id this is
    // just that artifact's recursive ingredients, same as before.
    const recursiveIngredientsByArtifact = computed(() => {
      const map = new Map<string, ReturnType<typeof id2artifact>[]>();
      for (const artifact of artifacts.value) {
        map.set(artifact.id, recursiveIngredientsOf(artifact));
      }
      return map;
    });

    // If every id in the URL was unknown, there's nothing left to plan for.
    // Elsewhere in the app (Main.vue), zero selected artifacts simply means
    // the tank route is never navigated to; bounce back home to match that
    // instead of rendering an empty planner.
    watchEffect(() => {
      if (rawParam.value && artifactIds.value.length === 0) {
        router.replace({ name: 'home' });
      }
    });

    return {
      id2artifact,
      artifactIds,
      serializedArtifactIds,
      artifacts,
      recursiveIngredientsByArtifact,
      craftingPriceFormulaImage,
      iconURL,
    };
  },
});
</script>
