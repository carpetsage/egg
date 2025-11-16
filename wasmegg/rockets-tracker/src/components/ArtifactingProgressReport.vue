<template>
  <div class="mx-4 xl:mx-0">
    <div
      class="w-max max-w-full px-3 py-2 text-center text-xs text-green-800 bg-green-50 rounded-md shadow-sm mx-auto -mt-2 mb-2"
    >
      Visualize and share your inventory with
      <a
        :href="`/inventory-visualizer/?playerId=${playerId}`"
        target="_blank"
        class="text-green-700 hover:text-green-900 underline"
        >Inventory visualizer</a
      >.
    </div>

    <div class="flex justify-center mb-2 space-x-4">
      <div class="relative flex items-start">
        <div class="flex items-left h-5">
          <input
            id="spoilers"
            v-model="spoilers"
            name="spoilers"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="spoilers" class="text-gray-600">Show unseen items (SPOILERS)</label>
        </div>
      </div>
      <div class="relative flex items-start">
        <div class="flex items-left h-5">
          <input
            id="showVirtue"
            v-model="showVirtue"
            name="showVirtue"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="showVirtue" class="text-gray-600">Show virtue items</label>
        </div>
      </div>
    </div>
    <div class="text-center">Don't use as crafting ingredients:</div>
    <div class="flex justify-center mb-2">
      <div class="relative flex items-start">
        <!-- Toggle demoting rares -->
        <div class="flex items-center h-5">
          <input
            id="ignore_rares"
            v-model="ignore_rares"
            name="ignore_rares"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="ignore_rares" class="text-gray-600">Rares</label>
        </div>
        <!-- Toggle demoting epics -->
        <div class="flex items-center h-5 ml-2">
          <input
            id="ignore_epics"
            v-model="ignore_epics"
            name="ignore_epics"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="ignore_epics" class="text-gray-600">Epics</label>
        </div>
        <!-- Toggle demoting legendaries -->
        <div class="flex items-center h-5 ml-2">
          <input
            id="ignore_leggies"
            v-model="ignore_leggies"
            name="ignore_leggies"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="ignore_leggies" class="text-gray-600">Legendaries</label>
        </div>
        <!-- Toggle unslotting stones -->
        <div class="flex items-center h-5 ml-2">
          <input
            id="ignore_slotted_stones"
            v-model="ignore_slotted_stones"
            name="ignore_slotted_stones"
            type="checkbox"
            class="h-4 w-4 text-green-600 border-gray-300 rounded focus:outline-none focus:ring-0 focus:ring-offset-0"
          />
        </div>
        <div class="ml-2 text-sm">
          <label for="ignore_slotted_stones" class="text-gray-600">Slotted Stones</label>
        </div>
      </div>
    </div>

    <ul class="list-disc list-inside text-xs leading-tight space-y-1">
      <li>
        Hovering on the icon or name of an item reveals its crafting recipe; clicking on it takes you to the relevant
        page on
        <a href="/artifact-explorer/" target="_blank" class="text-blue-500 hover:text-blue-600">Artifact explorer</a>.
      </li>
      <li>
        Items with a green dot in the corner can be crafted from your current possessions. How many is shown to the
        right. Intermediate crafting and demoting are both allowed here. For instance, if you have 4 common, 1 rare and
        1 epic T3 necklaces and 11 T2 gold meteorites, these satisfy the 6 T3 necklaces and 1 T3 gold meteorite required
        for a T4 necklace, which is considered craftable.
      </li>
      <li>
        Hovering or clicking on the "crafted" / "can craft" line shows the estimated crafting expenses sunk into the
        specific item, and the cost of the next craft.
      </li>
    </ul>

    <h3 class="my-2 text-sm font-medium text-gray-900">Artifacts</h3>
    <artifact-grid
      :inventory="showVirtue ? virtueInventory : inventory"
      :families="artifacts"
      :spoilers="spoilers"
      :backup="backup"
      :ignore-rares="ignore_rares"
      :ignore-epics="ignore_epics"
      :ignore-leggies="ignore_leggies"
    />

    <h3 class="my-2 text-sm font-medium text-gray-900">Stones &amp; stone fragments</h3>
    <artifact-grid
      :inventory="showVirtue ? virtueInventory : inventory"
      :families="stones"
      :spoilers="spoilers"
      :backup="backup"
      :ignore-slotted-stones="ignore_slotted_stones"
    />

    <h3 class="my-2 text-sm font-medium text-gray-900">Ingredients</h3>
    <artifact-grid
      :inventory="showVirtue ? virtueInventory : inventory"
      :families="ingredients"
      :spoilers="spoilers"
      :backup="backup"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, toRefs, watch } from 'vue';

import { ei, getLocalStorage, Inventory, InventoryFamily, setLocalStorage } from 'lib';
import ArtifactGrid from '@/components/ArtifactGrid.vue';

const SPOILERS_LOCALSTORAGE_KEY = 'spoilers';
const SHOW_VIRTUE_LOCALSTORAGE_KEY = 'showVirtue';
const IGNORE_RARES_LOCALSTORAGE_KEY = 'ignoreRares';
const IGNORE_EPICS_LOCALSTORAGE_KEY = 'ignoreEpics';
const IGNORE_LEGGIES_LOCALSTORAGE_KEY = 'ignoreLeggies';
const IGNORE_SLOTTED_STONES_LOCALSTORAGE_KEY = 'ignoreSlottedStones';

export default defineComponent({
  components: {
    ArtifactGrid,
  },
  props: {
    playerId: {
      type: String,
      required: true,
    },
    inventory: {
      type: Object as PropType<Inventory>,
      required: true,
    },
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
  },
  setup(props) {
    const { inventory, backup } = toRefs(props);
    const virtueInventory = computed(() => new Inventory(backup.value.artifactsDb!, { virtue: true }));
    // Type casting because somehow InventoryFamily loses protected props during toRefs.
    const catalog = computed(() => (showVirtue.value ? virtueInventory : inventory).value.catalog as InventoryFamily[]);
    const artifacts = computed(() =>
      catalog.value.filter(family => family.type === ei.ArtifactSpec.Type.ARTIFACT).reverse()
    );
    const stones = computed(() => catalog.value.filter(family => family.type === ei.ArtifactSpec.Type.STONE).reverse());
    const ingredients = computed(() =>
      catalog.value.filter(family => family.type === ei.ArtifactSpec.Type.INGREDIENT).reverse()
    );
    const spoilers = ref(getLocalStorage(SPOILERS_LOCALSTORAGE_KEY) === 'true');
    watch(spoilers, () => {
      setLocalStorage(SPOILERS_LOCALSTORAGE_KEY, spoilers.value);
    });
    const showVirtue = ref(getLocalStorage(SHOW_VIRTUE_LOCALSTORAGE_KEY) === 'true');
    watch(showVirtue, () => {
      setLocalStorage(SHOW_VIRTUE_LOCALSTORAGE_KEY, showVirtue.value);
    });
    const ignore_epics = ref(getLocalStorage(IGNORE_EPICS_LOCALSTORAGE_KEY) === 'true');
    watch(ignore_epics, () => {
      setLocalStorage(IGNORE_EPICS_LOCALSTORAGE_KEY, ignore_epics.value);
    });
    const ignore_leggies = ref(getLocalStorage(IGNORE_LEGGIES_LOCALSTORAGE_KEY) === 'true');
    watch(ignore_leggies, () => {
      setLocalStorage(IGNORE_LEGGIES_LOCALSTORAGE_KEY, ignore_leggies.value);
    });
    const ignore_rares = ref(getLocalStorage(IGNORE_RARES_LOCALSTORAGE_KEY) === 'true');
    watch(ignore_rares, () => {
      setLocalStorage(IGNORE_RARES_LOCALSTORAGE_KEY, ignore_rares.value);
    });
    const ignore_slotted_stones = ref(getLocalStorage(IGNORE_SLOTTED_STONES_LOCALSTORAGE_KEY) === 'true');
    watch(ignore_slotted_stones, () => {
      setLocalStorage(IGNORE_SLOTTED_STONES_LOCALSTORAGE_KEY, ignore_slotted_stones.value);
    });
    return {
      catalog,
      artifacts,
      stones,
      ingredients,
      spoilers,
      showVirtue,
      ignore_rares,
      ignore_epics,
      ignore_leggies,
      ignore_slotted_stones,
      virtueInventory,
    };
  },
});
</script>
