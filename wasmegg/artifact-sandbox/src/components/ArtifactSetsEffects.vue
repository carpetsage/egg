<template>
  <div class="mx-auto mt-3 mb-2 space-y-2 justify-center">
    <div class="text-base text-center font-medium uppercase">Selected aggregate effects</div>

    <div>
      <div class="flex flex-wrap items-center justify-center">
        <span class="flex whitespace-nowrap mr-2">
          <img :src="iconURL('egginc/egg_truth.png', 64)" class="inline h-5 w-5" />
          <span class="text-sm Prophecy">{{ builds.config.truthEggs }}</span>
        </span>
        <span class="flex whitespace-nowrap mr-2">
          <img :src="iconURL('egginc/egg_of_prophecy.png', 64)" class="inline h-5 w-5" />
          <span class="text-sm Prophecy">{{ builds.config.prophecyEggs }}</span>
        </span>
        <span class="flex whitespace-nowrap">
          <img :src="iconURL('egginc/egg_soul.png', 64)" class="inline h-5 w-5" />
          <span class="text-sm Soul">{{ formatEIValue(builds.config.soulEggs) }}</span>
        </span>
      </div>

      <div class="flex flex-col items-center justify-center">
        <template v-if="builds.config.epicResearchMaxed()">Max epic research</template>
        <template v-else>
          <div>Max epic research except:</div>
          <div v-if="builds.config.soulFood < 140" class="flex whitespace-nowrap">
            <img :src="iconURL('egginc/r_icon_soul_food.png', 64)" class="inline h-6 w-6 -mt-0.5" />
            <span class="text-sm">
              Soul food
              <span class="Soul">{{ builds.config.soulFood }} / 140</span>
            </span>
          </div>
          <div v-if="builds.config.prophecyBonus < 5" class="flex whitespace-nowrap">
            <img :src="iconURL('egginc/r_icon_prophecy_bonus.png', 64)" class="inline h-6 w-6 -mt-0.5 mr-0.5" />
            <span class="text-sm">
              Prophecy bonus
              <span class="Prophecy">{{ builds.config.prophecyBonus }} / 5</span>
            </span>
          </div>
        </template>
      </div>
    </div>

    <div v-if="builds.config.anyBoostActive()" class="flex flex-col items-center justify-center">
      <div v-if="builds.config.birdFeedActive" class="flex whitespace-nowrap">
        <img :src="iconURL('egginc/b_icon_jimbos_orange_big.png', 64)" class="inline h-5 w-5 mr-1" />
        <span class="text-sm">Bird feed active</span>
      </div>
      <div v-if="builds.config.tachyonPrismActive" class="flex whitespace-nowrap">
        <img :src="iconURL('egginc/b_icon_tachyon_prism_orange_big.png', 64)" class="inline h-5 w-5 mr-1" />
        <span class="text-sm">Tachyon prism active</span>
      </div>
      <div v-if="builds.config.soulBeaconActive" class="flex whitespace-nowrap">
        <img :src="iconURL('egginc/b_icon_soul_beacon_orange.png', 64)" class="inline h-5 w-5 mr-1" />
        <span class="text-sm">Soul beacon active</span>
      </div>
      <div v-if="builds.config.boostBeaconActive" class="flex whitespace-nowrap">
        <img :src="iconURL('egginc/b_icon_boost_beacon_orange.png', 64)" class="inline h-5 w-5 mr-1" />
        <span class="text-sm">Boost beacon active</span>
      </div>
    </div>

    <div v-if="builds.config.tachyonDeflectorBonus > 0" class="flex flex-wrap items-center justify-center">
      <span class="flex whitespace-nowrap">
        <img :src="iconURL('egginc/afx_tachyon_deflector_4.png', 64)" class="inline h-5 w-5 mr-1" />
        <span class="text-sm">
          Tachyon deflector
          <span class="Bonus">+{{ formatEIPercentage(builds.config.tachyonDeflectorBonus) }}</span>
        </span>
      </span>
    </div>

    <!-- Responsive: Single column mobile, two column desktop using CSS Grid -->
    <div class="max-w-xs sm:max-w-2xl mx-auto">
      <div class="grid grid-cols-1 sm:grid-cols-2 sm:gap-0 items-stretch overflow-hidden rounded-md">
        <!-- First half -->
        <div class="sm:rounded-l-md sm:rounded-r-none overflow-hidden">
          <table class="min-w-full h-full">
            <tbody>
              <!-- Earning bonus percentage and multiplier from artifacts -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="eb"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Value">{{ formatEIPercentage(earningBonus(build, config)) }}</span>
                <span class="Bonus">&nbsp;(&times;{{ formatFloat(earningBonusMultiplier(build, config)) }})</span>
              </artifact-sets-effects-row>

              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="eb_virtue"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Value">{{ formatEIPercentage(earningBonus(build, config, true)) }}</span>
                <span class="Bonus">&nbsp;(&times;{{ formatFloat(earningBonusMultiplier(build, config, true)) }})</span>
              </artifact-sets-effects-row>

              <!-- Farmer role based on current earning bonus -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="role"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <template v-for="role in [earningBonusToFarmerRole(earningBonus(build, config))]" :key="role.name">
                  <span :style="{ color: role.color }">
                    {{ role.name }}
                  </span>
                </template>
              </artifact-sets-effects-row>

              <!-- Overall earnings multiplier from all sources -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="earnings"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Bonus">&times;{{ formatFloat(earningsMultiplier(build, config)) }}</span>
              </artifact-sets-effects-row>

              <!-- Maximum running chicken bonus achievable -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="max-rcb"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Value">{{ maxRunningChickenBonus(build, config) }}</span>
                <span class="Bonus"
                  >&nbsp;(&times;{{ formatFloat(maxRunningChickenBonusMultiplier(build, config)) }})</span
                >
              </artifact-sets-effects-row>

              <!-- Earnings multiplier when max running chicken bonus is active -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="earnings-max-rcb"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Bonus"
                  >&times;{{ formatFloat(earningsWithMaxRunningChickenBonusMultiplier(build, config)) }}</span
                >
              </artifact-sets-effects-row>

              <!-- Soul eggs gain multiplier with preloaded habs -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="se-gain"
                :show-footnote="showFootnotes"
                :dagger="true"
                :builds="builds"
              >
                <span class="Bonus">&times;{{ formatFloat(soulEggsGainMultiplier(build, config)) }}</span>
              </artifact-sets-effects-row>

              <!-- Soul eggs gain multiplier when starting with empty habs -->
              <artifact-sets-effects-row
                effect-id="se-gain-empty-habs"
                :show-footnote="showFootnotes"
                :dagger="true"
                :builds="builds"
              >
                <template #name>SE gain w/<br />empty habs start</template>
                <template #default="{ build, config }">
                  <span class="Bonus"
                    >&times;{{ formatFloat(soulEggsGainWithEmptyHabsStartMultiplier(build, config)) }}</span
                  >
                </template>
              </artifact-sets-effects-row>

              <!-- Boost duration multiplier from artifacts -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="boost-duration"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Bonus">&times;{{ formatFloat(boostDurationMultiplier(build, config)) }}</span>
              </artifact-sets-effects-row>

              <!-- Research cost discount percentage -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="research-discount"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Bonus">{{ formatFloat(researchPriceDiscount(build, config) * 100) }}%</span>
              </artifact-sets-effects-row>
            </tbody>
          </table>
        </div>

        <!-- Second half -->
        <div class="sm:rounded-r-md sm:rounded-l-none overflow-hidden">
          <table class="min-w-full h-full">
            <tbody>
              <!-- Away earnings multiplier relative to current RCB -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="earnings-away-relative"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Bonus">&times;{{ formatFloat(awayEarningsMultiplier(build, config) / config.RCB) }}</span>
              </artifact-sets-effects-row>

              <!-- Away earnings multiplier (absolute) -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="earnings-away"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Bonus">&times;{{ formatFloat(awayEarningsMultiplier(build, config)) }}</span>
              </artifact-sets-effects-row>

              <!-- Away soul eggs gain multiplier relative to current RCB -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="se-gain-away-relative"
                :show-footnote="showFootnotes"
                :dagger="true"
                :builds="builds"
              >
                <span class="Bonus"
                  >&times;{{ formatFloat(soulEggsGainMultiplierAway(build, config) / config.RCB ** 0.21) }}</span
                >
              </artifact-sets-effects-row>

              <!-- Away soul eggs gain multiplier (absolute) -->
              <artifact-sets-effects-row
                effect-id="se-gain-away"
                :show-footnote="showFootnotes"
                :dagger="true"
                :builds="builds"
              >
                <template #name>Away SE gain</template>
                <template #default="{ build, config }">
                  <span class="Bonus">&times;{{ formatFloat(soulEggsGainMultiplierAway(build, config)) }}</span>
                </template>
              </artifact-sets-effects-row>

              <!-- Maximum habitat space with multiplier -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="max-hab-space"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Value">{{ maxHabSpace(build, config).toLocaleString('en-US') }}</span>
                <span class="Bonus">&nbsp;(&times;{{ formatFloat(habSpaceMultiplier(build, config)) }})</span>
              </artifact-sets-effects-row>

              <!-- Maximum internal hatchery rate per minute per habitat -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="max-ihr"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span
                  v-tippy="{
                    content: `
                      At this IHR and with max internal hatchery calm, it takes roughly
                      <span class='text-blue-400'>
                        ${daysToDiamondTrophyAtMaxIHR(build, config).toFixed(1)}
                      </span>
                      days to hatch 10 billion chickens without boosts.`,
                    allowHTML: true,
                  }"
                  class="cursor-help"
                >
                  <span class="Value"
                    >{{
                      formatEIValue(maxInternalHatcheryRatePerMinPerHab(build, config), { minOom: 6 })
                    }}/min/hab</span
                  >
                  <span class="Bonus"
                    >&nbsp;(&times;{{ formatFloat(internalHatcheryRateMultiplier(build, config)) }})</span
                  >
                </span>
              </artifact-sets-effects-row>

              <!-- Egg laying rate multiplier -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="elr"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Bonus">&times;{{ formatFloat(layingRateMultiplier(build, config)) }}</span>
              </artifact-sets-effects-row>

              <!-- Maximum hourly egg laying rate -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="max-elr"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Value">{{ formatEIValue(maxHourlyLayingRate(build, config)) }}/hr</span>
                <span class="Bonus">&nbsp;(&times;{{ formatFloat(maxLayingRateMultiplier(build, config)) }})</span>
              </artifact-sets-effects-row>

              <!-- Maximum hourly shipping capacity -->
              <artifact-sets-effects-row
                v-slot="{ build, config }: { build: Build; config: Config }"
                effect-id="max-shipping-capacity"
                :show-footnote="showFootnotes"
                :builds="builds"
              >
                <span class="Value">{{ formatEIValue(maxHourlyShippingCapacity(build, config)) }}/hr</span>
                <span class="Bonus">&nbsp;(&times;{{ formatFloat(shippingCapacityMultiplier(build, config)) }})</span>
              </artifact-sets-effects-row>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-2 DaggerNote text-sm leading-tight max-w-prose mx-auto">
    <sup>&dagger;</sup> In order to maximize SE gain from boosted prestiges, you should optimize the
    <span class="DaggerNote--highlight">“SE gain”</span> or
    <span class="DaggerNote--highlight">“SE gain w/ empty habs start”</span> stat. If you start your boosts with
    preloaded, almost full habs, artifact effects over your SE gain is reflected by the
    <span class="DaggerNote--highlight">“SE gain”</span> stat, which you should attempt to maximize; if you start your
    boosts (including at least one tachyon prism) with empty habs, commonly seen in multi-prestige or all-in-one
    single-prestige strategies, you should instead maximize
    <span class="DaggerNote--highlight">“SE gain w/ empty habs start”</span>. Don't forget to configure
    <span class="uppercase">active boost effects</span> when optimizing aforementioned stats.
  </div>

  <div v-if="showFootnotes" class="mt-2">
    <ol class="list-decimal list-inside">
      <li v-for="(effect, index) in effects" :key="index" class="Note text-xs">
        <span class="text-gray-50">{{ effect.name }}:</span>
        {{ effect.note }}
      </li>
    </ol>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from 'vue';
import { earningBonusToFarmerRole, formatEIValue, iconURL } from 'lib';
import {
  boostDurationMultiplier,
  Build,
  Builds,
  Config,
  earningBonus,
  earningBonusMultiplier,
  earningsMultiplier,
  earningsWithMaxRunningChickenBonusMultiplier,
  awayEarningsMultiplier,
  formatFloat,
  habSpaceMultiplier,
  internalHatcheryRateMultiplier,
  layingRateMultiplier,
  maxHabSpace,
  maxHourlyLayingRate,
  maxHourlyShippingCapacity,
  maxInternalHatcheryRatePerMinPerHab,
  maxLayingRateMultiplier,
  maxRunningChickenBonus,
  maxRunningChickenBonusMultiplier,
  researchPriceDiscount,
  shippingCapacityMultiplier,
  soulEggsGainMultiplier,
  soulEggsGainWithEmptyHabsStartMultiplier,
  soulEggsGainMultiplierAway,
  soulEggsGainWithEmptyHabsStartMultiplierAway,
} from '@/lib';
import { effects } from '@/effects';
import ArtifactSetsEffectsRow from '@/components/ArtifactSetsEffectsRow.vue';

export default defineComponent({
  components: {
    ArtifactSetsEffectsRow,
  },
  props: {
    builds: {
      type: Builds,
      required: true,
    },
    showFootnotes: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { builds } = toRefs(props);

    const buildValidities = computed(() => builds.value.builds.map(build => !build.hasDuplicates()));
    const buildConfigs = computed(() => {
      const config = builds.value.config;
      return builds.value.builds.map((build): [Build, Config] => [build, config]);
    });

    const daysToDiamondTrophyAtMaxIHR = (build: Build, config: Config): number => {
      const rate = 4 /* 4 habs */ * 3 /* internal hatchery calm */ * maxInternalHatcheryRatePerMinPerHab(build, config);
      return 1e10 / (rate * 60 * 24);
    };

    return {
      buildValidities,
      buildConfigs,
      effects,

      earningBonus,
      earningBonusMultiplier,
      earningBonusToFarmerRole,
      earningsMultiplier,
      awayEarningsMultiplier,
      earningsWithMaxRunningChickenBonusMultiplier,
      maxRunningChickenBonus,
      maxRunningChickenBonusMultiplier,
      soulEggsGainMultiplier,
      soulEggsGainWithEmptyHabsStartMultiplier,
      soulEggsGainMultiplierAway,
      soulEggsGainWithEmptyHabsStartMultiplierAway,
      boostDurationMultiplier,
      researchPriceDiscount,
      maxHabSpace,
      habSpaceMultiplier,
      maxInternalHatcheryRatePerMinPerHab,
      internalHatcheryRateMultiplier,
      layingRateMultiplier,
      maxLayingRateMultiplier,
      maxHourlyLayingRate,
      shippingCapacityMultiplier,
      maxHourlyShippingCapacity,
      daysToDiamondTrophyAtMaxIHR,

      iconURL,
      formatEIValue,
      formatEIPercentage,
      formatFloat,
    };
  },
});

function formatEIPercentage(x: number): string {
  return formatEIValue(x * 100) + '%';
}
</script>

<style scoped>
tr:nth-child(odd) {
  background-color: hsl(0, 0%, 20%);
}

tr:nth-child(even) {
  background-color: hsl(0, 0%, 22%);
}

.Prophecy {
  color: #ffcc00;
}

.Soul {
  color: #c64eef;
}

.Value {
  color: #2d87ee;
}

.Bonus {
  color: #1e9c11;
}

.Note {
  color: #a6a6a6;
}

.DaggerNote {
  color: #b38c00;
}

.DaggerNote--highlight {
  color: #ffc601;
}
</style>
