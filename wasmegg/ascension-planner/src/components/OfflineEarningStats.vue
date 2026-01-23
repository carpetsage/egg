<template>
  <div class="bg-purple-50 rounded-xl p-4 border border-purple-100">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h3 class="text-xs font-bold text-purple-500 uppercase tracking-widest">Initial Offline Earnings</h3>
        <select 
          v-model="unit" 
          class="bg-purple-100 border-none text-[10px] font-bold text-purple-600 rounded px-1.5 py-0.5 focus:ring-0 cursor-pointer uppercase"
        >
          <option value="min">/ min</option>
          <option value="hr">/ hr</option>
          <option value="day">/ day</option>
        </select>
      </div>
      <div class="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-purple-100">
        <span class="text-[10px] font-bold text-purple-400">CTE</span>
        <span class="text-xs font-black text-purple-600 tabular-nums">{{ clothedTE.toFixed(2) }}</span>
      </div>
    </div>

    <div class="flex items-baseline gap-1">
      <p class="text-3xl font-black text-purple-700 tabular-nums">
        {{ formattedValue }}
      </p>
      <span class="text-sm font-bold text-purple-400 uppercase tracking-tight">{{ unitLabel }}</span>
    </div>

    <div class="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      <div v-if="eggValueMult > 1" class="whitespace-nowrap flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-purple-600 border border-purple-100">
        <span class="opacity-50">Value:</span>
        {{ eggValueMult.toFixed(2) }}x
      </div>
      <div v-if="awayMult > 1" class="whitespace-nowrap flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-purple-600 border border-purple-100">
        <span class="opacity-50">Away:</span>
        {{ awayMult.toFixed(2) }}x
      </div>
      <div v-if="teBonus > 1" class="whitespace-nowrap flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-purple-600 border border-purple-100">
        <span class="opacity-50">TE:</span>
        {{ formatEIValue(teBonus) }}x
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import { 
  Artifact, 
  newItem, 
  eggValueMultiplier, 
  awayEarningsMultiplier, 
  formatEIValue 
} from '@/lib';
import type { ArtifactLoadout, Modifiers, ArtifactSlot } from '@/types';
import catalogRaw from '@/lib/catalog.json';

interface CatalogItem {
  key: string;
  afxId: number;
  afxLevel: number;
  afxRarity: number;
  name: string;
  rarity: string;
  effectTarget: string;
  effectSize: string;
  effectDelta: number;
  slots: number;
  iconPath: string;
}

export default defineComponent({
  name: 'OfflineEarningStats',
  props: {
    truthEggs: {
      type: Number,
      required: true
    },
    artifacts: {
      type: Array as PropType<ArtifactLoadout>,
      required: true
    },
    modifiers: {
      type: Object as PropType<Modifiers | undefined>,
      default: undefined
    }
  },
  setup(props) {
    const unit = ref<'min' | 'hr' | 'day'>('hr');
    const catalog = catalogRaw as CatalogItem[];

    const libArtifacts = computed(() => {
      return props.artifacts
        .filter((slot): slot is ArtifactSlot => slot !== null)
        .map(slot => {
          const item = catalog.find(i => i.key === slot.artifactId);
          if (!item) return null;
          const host = newItem({
            name: item.afxId,
            level: item.afxLevel,
            rarity: item.afxRarity,
          });
          const stones = slot.stones
            .filter(s => s !== '')
            .map(stoneKey => {
              const stoneItem = catalog.find(i => i.key === stoneKey);
              if (!stoneItem) return null;
              return newItem({
                name: stoneItem.afxId,
                level: stoneItem.afxLevel,
                rarity: stoneItem.afxRarity,
              });
            })
            .filter((s): s is any => s !== null);
          return new Artifact(host, stones);
        })
        .filter((a): a is Artifact => a !== null);
    });

    const eggValueMult = computed(() => eggValueMultiplier(libArtifacts.value));
    const awayMult = computed(() => awayEarningsMultiplier(libArtifacts.value));
    const teBonus = computed(() => Math.pow(1.1, props.truthEggs));

    // Base rate calculation (assuming max population 10B and max research)
    // Based on findings in docs/earnings.md and library code
    const baseGemsPerSecond = 1e12; // A representative standard base for high-CTE displays

    const totalMultiplier = computed(() => {
      let mult = teBonus.value * eggValueMult.value * awayMult.value;
      if (props.modifiers) {
        mult *= (props.modifiers.earnings || 1);
        mult *= (props.modifiers.awayEarnings || 1);
      }
      return mult;
    });

    const gemsPerSecond = computed(() => baseGemsPerSecond * totalMultiplier.value);

    // Calculate Clothed TE for display
    const clothedTE = computed(() => {
      const multiplierAsTE = Math.log(totalMultiplier.value) / Math.log(1.1);
      return props.truthEggs + multiplierAsTE;
    });

    const formattedValue = computed(() => {
      let val = gemsPerSecond.value;
      if (unit.value === 'min') val *= 60;
      if (unit.value === 'hr') val *= 3600;
      if (unit.value === 'day') val *= 86400;
      return formatEIValue(val);
    });

    const unitLabel = computed(() => {
      if (unit.value === 'min') return 'gems/min';
      if (unit.value === 'hr') return 'gems/hr';
      return 'gems/day';
    });

    return {
      unit,
      clothedTE,
      formattedValue,
      unitLabel,
      eggValueMult,
      awayMult,
      teBonus,
      formatEIValue
    };
  }
});
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
