<template>
  <ul class="my-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <template v-for="family in families" :key="family.name">
      <li
        v-if="spoilers || family.discovered"
        class="col-span-1 bg-gray-50 rounded-lg shadow divide-y divide-gray-200"
      >
        <div class="w-full flex items-center justify-between px-6 py-4 space-x-4">
          <div class="flex-1 truncate">
            <div class="flex items-center space-x-3" :class="{ 'opacity-30': !family.discovered }">
              <h3 class="text-gray-900 text-sm font-medium truncate" :title="family.effect">
                {{ family.name }}
              </h3>
            </div>
            <p
              class="mt-1 text-gray-500 text-xs truncate"
              :class="{ 'opacity-30': !family.discovered }"
              :title="family.effect"
            >
              {{ family.effect }}
            </p>
            <div class="mt-2 space-y-2">
              <template v-for="tier in family.tiers" :key="tier.tierNumber">
                <div class="relative">
                  <!-- This is absolute-poisitioned outside the entire list
                  entry because we don't want to inherit the opacity. -->
                  <span
                    v-if="craftableCount(tier) > 0"
                    v-tippy="{
                      content: 'Have enough ingredients or transitive ingredients to craft',
                    }"
                    class="absolute block h-2 w-2 rounded-full ring-1 ring-white bg-green-300"
                    :style="{ top: '0.125rem', left: '2.375rem' }"
                  ></span>

                  <div
                    v-if="spoilers || tier.tierNumber <= family.highestTierDiscovered + 1 || true"
                    class="flex items-center space-x-2"
                    :class="{ 'opacity-30': !tier.discovered }"
                  >
                    <div class="h-12 w-12 bg-gray-150 rounded-full">
                      <a
                        v-if="spoilers || tier.discovered"
                        :href="artifactExplorerLink(tier)"
                        target="_blank"
                      >
                        <tippy tag="img" class="h-12 w-12 p-1" :src="iconURL(tier.iconPath, 128)">
                          <template v-if="tier.props.recipe" #content>
                            <p>Crafting recipe:</p>
                            <artifact-recipe
                              v-if="tier.props.recipe"
                              :inventory="inventory"
                              :spoilers="spoilers"
                              :recipe="tier.props.recipe"
                            />
                          </template>
                        </tippy>
                      </a>
                      <template v-else>
                        <tippy
                          tag="img"
                          class="h-12 w-12 p-1 silhouette"
                          :src="iconURL(tier.iconPath, 128)"
                        >
                          <template v-if="tier.props.recipe" #content>
                            <p>Crafting recipe:</p>
                            <artifact-recipe
                              v-if="tier.props.recipe"
                              :inventory="inventory"
                              :spoilers="spoilers"
                              :recipe="tier.props.recipe"
                            />
                          </template>
                        </tippy>
                      </template>
                    </div>

                    <div v-if="spoilers || tier.discovered">
                      <div class="text-xs text-gray-500">
                        <tippy tag="span" target="_blank" class="text-gray-500 hover:text-gray-600">
                          {{ tier.tierName }}
                          <template v-if="tier.props.recipe" #content>
                            <p>Crafting recipe:</p>
                            <artifact-recipe
                              v-if="tier.props.recipe"
                              :inventory="inventory"
                              :spoilers="spoilers"
                              :recipe="tier.props.recipe"
                            />
                          </template>
                        </tippy>
                        &times;
                        <span
                          v-tippy="{
                            content:
                              'total number of this item currently owned, including &quot;shiny&quot; ones',
                          }"
                          >{{ tier.have }}</span
                        >
                      </div>
                      <div class="delimited text-xs text-gray-400 truncate">
                        <span v-if="tier.haveRare > 0" :class="artifactRarityFgClass(Rarity.RARE)"
                          >{{ tier.haveRare }} Rare</span
                        >
                        <span v-if="tier.haveEpic > 0" :class="artifactRarityFgClass(Rarity.EPIC)"
                          >{{ tier.haveEpic }} Epic</span
                        >
                        <span
                          v-if="tier.haveLegendary > 0"
                          :class="artifactRarityFgClass(Rarity.LEGENDARY)"
                          >{{ tier.haveLegendary }} Legendary</span
                        >
                      </div>
                      <div
                        v-if="tier.isStone && tier.have > 0"
                        class="delimited text-xs text-gray-400"
                      >
                        <tippy v-if="tier.slotted > 0" tag="span" class="text-purple-400"
                          ><span class="underline">{{ tier.slotted }} slotted</span
                          ><template #content>
                            <artifact-gallery
                              :artifact-set="
                                new ArtifactSet(inventory.artifactsWithStone(tier), false)
                              "
                              :mini="true" /></template
                        ></tippy>
                        <span v-else>0 slotted</span>
                        <span>{{ tier.have - tier.slotted }} free</span>
                      </div>
                      <div
                        v-tippy="{
                          content:
                            `You spent an estimated ${tier.sunkCost.toLocaleString('en-US')} ` +
                            `golden eggs on crafting this item. The next craft is going to cost ` +
                            `${tier.nextCraftCost.toLocaleString('en-US')} GE.`,
                        }"
                        class="delimited text-xs text-gray-400"
                      >
                        <span v-if="tier.crafted > 0">Crafted {{ tier.crafted }}</span>
                        <span v-if="craftableCount(tier) > 0" class="text-green-500">
                          <template v-if="tier.crafted > 0">can</template>
                          <template v-else>Can</template> craft {{ craftableCount(tier) }}
                        </span>
                      </div>
                    </div>

                    <div
                      v-else
                      v-tippy="{ content: 'turn on &quot;show unseen items&quot; to unlock' }"
                      class="text-xs text-gray-500"
                    >
                      ?
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </li>
    </template>
  </ul>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import { ArtifactSet, ei, iconURL, Inventory, InventoryFamily, InventoryItem } from 'lib';
import { artifactRarityFgClass } from '@/utils';
import ArtifactRecipe from '@/components/ArtifactRecipe.vue';
import ArtifactGallery from './ArtifactGallery.vue';

type ItemId = string;

export default defineComponent({
  components: {
    Tippy,
    ArtifactRecipe,
    ArtifactGallery,
  },
  props: {
    inventory: {
      type: Object as PropType<Inventory>,
      required: true,
    },
    families: {
      type: Array as PropType<InventoryFamily[]>,
      required: true,
    },
    spoilers: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const { inventory, families } = toRefs(props);
    const craftableCounts = computed(() => {
      const counts = new Map<ItemId, number>();
      // Type casting because somehow InventoryFamily loses protected props during toRefs.
      for (const family of families.value as InventoryFamily[]) {
        for (const tier of family.tiers) {
          counts.set(tier.id, inventory.value.countCraftable(tier));
        }
      }
      return counts;
    });
    const craftableCount = (item: InventoryItem) => {
      return craftableCounts.value.get(item.id) || 0;
    };
    return {
      artifactExplorerLink,
      Rarity: ei.ArtifactSpec.Rarity,
      artifactRarityFgClass,
      craftableCount,
      ArtifactSet,
      iconURL,
    };
  },
});

function artifactExplorerLink(item: InventoryItem) {
  return `/artifact-explorer/#/artifact/${item.id}/`;
}
</script>

<style scoped>
img.silhouette {
  filter: contrast(0%) brightness(50%);
}

.delimited > *::after {
  content: ', ';
}

.delimited > *:last-child::after {
  content: '';
}
</style>
