<template>
  <div>
    <div class="mt-4 mb-2 text-sm font-medium text-gray-700">Visual artifacts picker</div>
    <div class="my-2 text-sm text-gray-700">Artifacts</div>
    <artifact-grid-section :families="artifactFamilies" />
    <div class="my-2 text-sm text-gray-700">Stones &amp; fragments</div>
    <artifact-grid-section :families="stoneFamilies" />
    <div class="my-2 text-sm text-gray-700">Ingredients</div>
    <artifact-grid-section :families="ingredientFamilies" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import ArtifactGridSection from '@/components/ArtifactGridSection.vue';

import { ei } from 'lib';
import data from 'lib/artifacts/data';

import Type = ei.ArtifactSpec.Type;

const artifactFamilies = data.artifact_families.filter(f => f.afx_type === Type.ARTIFACT);
const stoneFamilies = data.artifact_families.filter(f => f.afx_type === Type.STONE);
const ingredientFamilies = data.artifact_families.filter(f => f.afx_type === Type.INGREDIENT);

export default defineComponent({
  components: {
    ArtifactGridSection,
  },
  setup() {
    return {
      artifactFamilies,
      stoneFamilies,
      ingredientFamilies,
    };
  },
});
</script>
