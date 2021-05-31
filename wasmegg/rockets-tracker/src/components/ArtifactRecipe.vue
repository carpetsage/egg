<template>
  <div class="grid gap-x-1 gap-y-1" :style="{ gridTemplateColumns: 'repeat(2, max-content)' }">
    <template v-for="ingredient in recipe.ingredients" :key="ingredient.id">
      <div class="flex items-center">{{ ingredient.count }}&times;</div>
      <div class="flex items-center space-x-0.5">
        <template
          v-if="
            spoilers ||
            inventory.getItem({ name: ingredient.afx_id, level: ingredient.afx_level }).discovered
          "
        >
          <img
            :src="iconURL(`egginc/${ingredient.icon_filename}`, 64)"
            class="h-6 w-6 flex-shrink-0"
          />
          <span class="truncate">{{ ingredient.name }} (T{{ ingredient.tier_number }})</span>
        </template>
        <template v-else>
          <img
            class="h-6 w-6 flex-shrink-0 silhouette"
            :src="iconURL(`egginc/${ingredient.icon_filename}`, 64)"
          />
          <span>?</span>
        </template>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

import { iconURL, Inventory } from 'lib';
import { Recipe } from 'lib/artifacts/data';

export default defineComponent({
  props: {
    inventory: {
      type: Object as PropType<Inventory>,
      required: true,
    },
    spoilers: {
      type: Boolean,
      required: true,
    },
    recipe: {
      type: Object as PropType<Recipe>,
      required: true,
    },
  },
  setup() {
    return {
      iconURL,
    };
  },
});
</script>

<style scoped>
img.silhouette {
  filter: contrast(0%) brightness(150%);
}
</style>
