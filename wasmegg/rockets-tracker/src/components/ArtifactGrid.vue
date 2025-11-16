<template>
  <ul class="my-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <template v-for="family in families" :key="family.name">
      <li v-if="spoilers || family.discovered" class="col-span-1 bg-gray-50 rounded-lg shadow divide-y divide-gray-200">
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
                      <a v-if="spoilers || tier.discovered" :href="artifactExplorerLink(tier)" target="_blank">
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
                        <tippy tag="img" class="h-12 w-12 p-1 silhouette" :src="iconURL(tier.iconPath, 128)">
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
                            content: 'total number of this item currently owned, including &quot;shiny&quot; ones',
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
                        <span v-if="tier.haveLegendary > 0" :class="artifactRarityFgClass(Rarity.LEGENDARY)"
                          >{{ tier.haveLegendary }} Legendary</span
                        >
                      </div>
                      <div v-if="tier.isStone && tier.have > 0" class="delimited text-xs text-gray-400">
                        <tippy v-if="tier.slotted > 0" tag="span" class="text-purple-400"
                          ><span class="underline">{{ tier.slotted }} slotted</span
                          ><template #content>
                            <artifact-gallery
                              :artifact-set="new ArtifactSet(inventory.artifactsWithStone(tier), false)"
                              :mini="true" /></template
                        ></tippy>
                        <span v-else>0 slotted</span>
                        <span>{{ tier.have - tier.slotted }} free</span>
                      </div>
                      <tippy tag="div" class="delimited text-xs text-gray-400">
                        <span v-if="tier.crafted > 0">Crafted {{ tier.crafted }}</span>
                        <span v-if="craftableCount(tier) > 0" class="text-green-500">
                          <template v-if="tier.crafted > 0">can</template>
                          <template v-else>Can</template> craft {{ craftableCount(tier) }}
                        </span>

                        <template #content>
                          <p>
                            You spent an estimated
                            <span class="text-yellow-300">{{ ts(tier.sunkCost) }}</span>
                            golden eggs on crafting this item and gained
                            <span class="text-blue-300">{{ ts(tier.totalCraftingXp) }}</span>
                            xp from crafting this item.
                          </p>
                          <template v-if="tier.isArtifact">
                            The next craft has a
                            <template v-for="rarity in tier.possibleRarities" :key="rarity">
                              <template v-if="rarity != Rarity.COMMON"> / </template>
                              <span :class="artifactRarityFgClassBright(rarity)">
                                {{ ts(nextCraftRarityChance(tier, craftingLevel.rarityMult, rarity, tier.crafted)) }}%
                              </span>
                            </template>
                            chance of being
                            <template v-for="rarity in tier.possibleRarities" :key="rarity">
                              <template v-if="rarity != Rarity.COMMON"> / </template>
                              <span :class="artifactRarityFgClassBright(rarity)">
                                {{ titleCase(Rarity[rarity]) }}
                              </span>
                            </template>
                            .
                          </template>

                          <template v-if="craftableCount(tier) === 0"
                            >The next craft is going to cost
                            <span class="text-blue-300">{{ ts(tier.nextCraftCost) }}</span>
                            GE, but you don't have enough materials at the moment.
                          </template>
                          <template v-else-if="!nextRecursiveCraftable(tier)">
                            The next craft is going to cost
                            <span class="text-blue-300">{{ ts(tier.nextCraftCost) }}</span>
                            GE (not including the cost of intermediate crafting); you'll have to do some demotion before
                            having enough materials to craft.
                          </template>
                          <template v-else-if="nextRecursiveCraftCost(tier) > tier.nextCraftCost">
                            The next craft is going to cost
                            <span class="text-blue-300">{{ ts(tier.nextCraftCost) }}</span>
                            GE, or
                            <span class="text-blue-300">{{ ts(nextRecursiveCraftCost(tier)) }}</span>
                            GE if the cost of recursive crafting of materials is included.
                          </template>
                          <template v-else>
                            The next craft is going to cost
                            <span class="text-blue-300">{{ ts(tier.nextCraftCost) }}</span>
                            GE.
                          </template>
                        </template>
                      </tippy>
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
import {
  ArtifactSet,
  ei,
  iconURL,
  Inventory,
  InventoryFamily,
  InventoryItem,
  getCraftingLevelFromXp,
  titleCase,
} from 'lib';
import { artifactRarityFgClass, artifactRarityFgClassBright } from '@/utils';
import ArtifactRecipe from '@/components/ArtifactRecipe.vue';
import ArtifactGallery from './ArtifactGallery.vue';

type ItemId = string;
const TOOMUCHSHIT = 9000000;

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
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
    ignoreRares: {
      type: Boolean,
      required: false,
      default: false,
    },
    ignoreEpics: {
      type: Boolean,
      required: false,
      default: false,
    },
    ignoreLeggies: {
      type: Boolean,
      required: false,
      default: false,
    },
    ignoreSlottedStones: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  setup(props) {
    const { inventory, families, backup, ignoreRares, ignoreEpics, ignoreLeggies, ignoreSlottedStones } = toRefs(props);
    const craftableCounts = computed(() => {
      const counts = new Map<ItemId, number>();
      // Type casting because somehow InventoryFamily loses protected props during toRefs.
      for (const family of families.value as InventoryFamily[]) {
        for (const tier of family.tiers) {
          if (tier.have > TOOMUCHSHIT) {
            break;
          }
          counts.set(
            tier.id,
            inventory.value.countCraftable(
              tier,
              ignoreRares.value,
              ignoreEpics.value,
              ignoreLeggies.value,
              ignoreSlottedStones.value
            )
          );
        }
      }
      return counts;
    });
    const craftableCount = (item: InventoryItem) => {
      return craftableCounts.value.get(item.id) || 0;
    };
    const nextRecursiveCrafts = computed(() => {
      const counts = new Map<ItemId, { craftable: boolean; cost: number }>();
      for (const family of families.value as InventoryFamily[]) {
        for (const tier of family.tiers) {
          if (tier.have > TOOMUCHSHIT) {
            break;
          }
          counts.set(tier.id, inventory.value.nextRecursiveCraft(tier));
        }
      }
      return counts;
    });
    const nextRecursiveCraftable = (item: InventoryItem) => {
      return nextRecursiveCrafts.value.get(item.id)?.craftable ?? false;
    };
    const nextRecursiveCraftCost = (item: InventoryItem) => {
      return nextRecursiveCrafts.value.get(item.id)?.cost ?? 0;
    };
    const nextCraftRarityChance = (
      item: InventoryItem,
      craft_multiplier: number,
      rarity: number,
      crafted_count: number
    ) => {
      let craft_chance = 100.0; //For Common: Initialize with 100% chance
      if (rarity > 0) {
        craft_chance = item.craftChance(craft_multiplier, rarity, crafted_count); //Rare or better
      }
      for (let i = rarity + 1; i < 4; i++) {
        if (item.possibleRarity(i)) {
          //Subtract resulting chance of next higher existing rarity and return. Look at Auxbrain's medium post about craft chances.
          craft_chance = craft_chance - item.craftChance(craft_multiplier, i, crafted_count);
          return craft_chance;
        }
      }
      return craft_chance;
    };

    const craftingXp = computed(() => Math.floor(backup.value.artifacts?.craftingXp || 0));
    const craftingLevel = computed(() => getCraftingLevelFromXp(craftingXp.value));

    return {
      artifactExplorerLink,
      Rarity: ei.ArtifactSpec.Rarity,
      artifactRarityFgClass,
      artifactRarityFgClassBright,
      craftableCount,
      nextRecursiveCraftable,
      nextRecursiveCraftCost,
      nextCraftRarityChance,
      ArtifactSet,
      craftingLevel,
      iconURL,
      ts,
      titleCase,
    };
  },
});

function artifactExplorerLink(item: InventoryItem) {
  return `/artifact-explorer/#/artifact/${item.id}/`;
}

// To string with thousand separators.
function ts(x: number): string {
  return x.toLocaleString('en-US');
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
