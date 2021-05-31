<template>
  <div class="mx-4 xl:mx-0">
    <div class="flex justify-center -mt-2 mb-2">
      <div class="relative flex items-start">
        <div class="flex items-center h-5">
          <input
            id="spoilers"
            v-model="spoilers"
            name="spoilers"
            type="checkbox"
            class="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 rounded"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="spoilers" class="text-gray-600">Show unseen items (SPOILERS)</label>
        </div>
      </div>
    </div>

    <ul class="list-disc list-inside text-xs leading-tight space-y-1">
      <li>
        Hovering on the icon or name of an item reveals its crafting recipe; clicking on it takes
        you to the relevant page on
        <a
          href="https://wasmegg.netlify.app/artifact-explorer/"
          target="_blank"
          class="text-blue-500 hover:text-blue-600"
          >Artifact explorer</a
        >.
      </li>
      <li>
        Items with a green dot in the corner can be crafted from your current possessions. How many
        is shown to the right. Intermediate crafting and demoting are both allowed here. For
        instance, if you have 3 common, 1 rare and 1 epic T3 necklaces and 11 T2 gold meteorites,
        these satisfy the 6 T3 necklaces and 1 T3 gold meteorite required for a T4 necklace, which
        is considered craftable.
      </li>
      <li>
        Hovering or clicking on the "crafted" / "can craft" line shows the estimated crafting
        expenses sunk into the specific item, and the cost of the next craft.
      </li>
    </ul>

    <h3 class="my-2 text-sm font-medium text-gray-900">Artifacts</h3>
    <artifact-grid :inventory="inventory" :families="artifacts" :spoilers="spoilers" />

    <h3 class="my-2 text-sm font-medium text-gray-900">Stones &amp; stone fragments</h3>
    <artifact-grid :inventory="inventory" :families="stones" :spoilers="spoilers" />

    <h3 class="my-2 text-sm font-medium text-gray-900">Ingredients</h3>
    <artifact-grid :inventory="inventory" :families="ingredients" :spoilers="spoilers" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

import { ei, getLocalStorage, Inventory, InventoryFamily, setLocalStorage } from 'lib';
import ArtifactGrid from '@/components/ArtifactGrid.vue';

const SPOILERS_LOCALSTORAGE_KEY = 'spoilers';

export default defineComponent({
  components: {
    ArtifactGrid,
  },
  props: {
    inventory: {
      type: Object as PropType<Inventory>,
      required: true,
    },
  },
  setup(props) {
    const { inventory } = toRefs(props);
    // Type casting because somehow InventoryFamily loses protected props during toRefs.
    const catalog = computed(() => inventory.value.catalog as InventoryFamily[]);
    const artifacts = computed(() =>
      catalog.value.filter(family => family.type === ei.ArtifactSpec.Type.ARTIFACT).reverse()
    );
    const stones = computed(() =>
      catalog.value.filter(family => family.type === ei.ArtifactSpec.Type.STONE).reverse()
    );
    const ingredients = computed(() =>
      catalog.value.filter(family => family.type === ei.ArtifactSpec.Type.INGREDIENT).reverse()
    );
    const spoilers = ref(getLocalStorage(SPOILERS_LOCALSTORAGE_KEY) === 'true');
    watch(spoilers, () => {
      setLocalStorage(SPOILERS_LOCALSTORAGE_KEY, spoilers.value);
    });
    return {
      catalog,
      artifacts,
      stones,
      ingredients,
      spoilers,
    };
  },
});
</script>
