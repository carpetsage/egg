<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div
      v-for="slotIndex in 4"
      :key="slotIndex"
      class="relative aspect-square bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors group"
      @click="openArtifactPicker(slotIndex - 1)"
    >
      <template v-if="loadout[slotIndex - 1]">
        <div 
          class="w-full h-full relative p-2 flex flex-col items-center justify-center rounded-xl overflow-hidden shadow-inner"
          :class="rarityBgClass(loadout[slotIndex - 1]!.rarity)"
        >
          <img 
            :src="getArtifactIcon(loadout[slotIndex - 1]!)" 
            class="w-2/3 h-2/3 object-contain z-10 filter drop-shadow-lg"
          />
          
          <!-- Rarity text -->
          <div v-if="loadout[slotIndex - 1]!.rarity > 0" class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm z-20" :class="rarityBadgeClass(loadout[slotIndex - 1]!.rarity)">
            {{ rarityName(loadout[slotIndex - 1]!.rarity) }}
          </div>

          <!-- Stone Slots -->
          <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20">
            <div 
              v-for="stoneIndex in getArtifactSlots(loadout[slotIndex - 1]!)" 
              :key="stoneIndex"
              class="w-6 h-6 rounded-full bg-black bg-opacity-20 border border-white border-opacity-30 overflow-hidden hover:bg-opacity-40 transition-all flex items-center justify-center"
              @click.stop="openStonePicker(slotIndex - 1, stoneIndex - 1)"
            >
              <img 
                v-if="loadout[slotIndex - 1]!.stones[stoneIndex - 1]" 
                :src="getStoneIcon(loadout[slotIndex - 1]!.stones[stoneIndex - 1])"
                class="w-full h-full object-contain p-0.5"
              />
              <PlusIcon v-else class="h-3 w-3 text-white opacity-40 group-hover:opacity-70" />
            </div>
          </div>

          <!-- Remove button -->
          <button 
            class="absolute top-2 left-2 p-1 rounded bg-black/10 text-black/20 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-30"
            @click.stop="removeArtifact(slotIndex - 1)"
          >
            <XIcon class="h-3 w-3" />
          </button>
        </div>
      </template>
      <template v-else>
        <PlusCircleIcon class="h-10 w-10 text-gray-400 mb-1" />
        <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Slot {{ slotIndex }}</span>
      </template>
    </div>

    <!-- Artifact Picker Modal -->
    <div v-if="artifactPickerSlot !== null" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" @click.self="artifactPickerSlot = null">
      <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 class="text-xl font-black text-gray-900 tracking-tight">Equip Artifact</h3>
          <button @click="artifactPickerSlot = null" class="text-gray-400 hover:text-gray-600 transition-colors">
            <XIcon class="h-6 w-6" />
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto bg-white flex-grow custom-scrollbar">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              v-for="family in artifactFamilies" 
              :key="family.id" 
              class="border border-gray-100 rounded-2xl p-4 bg-gray-50 flex flex-col gap-3"
            >
              <div class="flex items-center gap-3">
                <img :src="iconURL('egginc/' + family.tiers[3].icon_filename, 64)" class="h-10 w-10" />
                <div>
                  <h4 class="font-bold text-gray-900 leading-tight">{{ family.name }}</h4>
                  <p class="text-[10px] text-gray-400 uppercase font-black tracking-widest">{{ family.effect }}</p>
                </div>
              </div>
              
              <div class="flex flex-wrap gap-2">
                <button 
                  v-for="item in familyItems(family)" 
                  :key="item.key"
                  class="flex-grow p-2.5 rounded-xl border flex items-center gap-2 hover:scale-[1.02] transition-all text-left"
                  :class="[
                    rarityBgClass(item.afxRarity),
                    loadout[artifactPickerSlot!]?.artifactId === item.key ? 'ring-2 ring-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                  ]"
                  @click="selectArtifact(artifactPickerSlot!, item)"
                >
                  <img :src="iconURL(item.iconPath, 64)" class="h-7 w-7" />
                  <div class="min-w-0">
                    <p class="text-[10px] font-bold text-gray-900 leading-tight truncate">{{ item.name }}</p>
                    <p class="text-[9px] text-gray-500 font-medium opacity-70">{{ item.effectSize }} {{ item.effectTargetShort }}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stone Picker Modal -->
    <div v-if="stonePickerSlot !== null" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[110] p-4 backdrop-blur-sm" @click.self="stonePickerSlot = null">
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col max-h-[70vh] overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 class="text-xl font-black text-gray-900 tracking-tight">Select Stone</h3>
          <button @click="stonePickerSlot = null" class="text-gray-400 hover:text-gray-600 transition-colors">
            <XIcon class="h-6 w-6" />
          </button>
        </div>
        
        <div class="p-4 overflow-y-auto bg-white flex-grow custom-scrollbar">
          <div class="grid grid-cols-2 gap-3">
            <!-- None stone -->
            <button 
              class="p-4 rounded-2xl border border-gray-100 hover:bg-red-50 hover:border-red-200 transition-all text-center flex flex-col items-center gap-2 group"
              @click="selectStone(stonePickerSlot.slot, stonePickerSlot.index, null)"
            >
              <div class="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-red-100 group-hover:text-red-500 transition-colors">
                <XIcon class="h-5 w-5" />
              </div>
              <span class="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-red-500">Remove</span>
            </button>

            <button 
              v-for="stone in suggestedStones" 
              :key="stone.key"
              class="p-4 rounded-2xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all text-center flex flex-col items-center gap-2 group"
              @click="selectStone(stonePickerSlot.slot, stonePickerSlot.index, stone.key)"
            >
              <img :src="iconURL(stone.iconPath, 64)" class="h-10 w-10 transform group-hover:scale-110 transition-transform" />
              <div class="min-w-0">
                <p class="text-[10px] font-black text-gray-900 leading-tight uppercase tracking-tight">{{ stone.name.split(' ').pop() }}</p>
                <p class="text-[9px] text-gray-500 font-medium opacity-70">{{ stone.effectSize }} {{ stone.effectTargetShort }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue';
import { PlusCircleIcon, PlusIcon, XIcon } from '@heroicons/vue/solid';
import { iconURL, ei } from '@/lib';
import type { ArtifactLoadout, ArtifactSlot } from '@/types';
import catalogRaw from '@/lib/catalog.json';
import artifactDataRaw from 'lib/artifacts/data.json';

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
  name: 'ArtifactLoadout',
  components: {
    PlusCircleIcon,
    PlusIcon,
    XIcon,
  },
  props: {
    loadout: {
      type: Array as PropType<ArtifactLoadout>,
      required: true,
    },
  },
  emits: ['update:loadout'],
  setup(props, { emit }) {
    const catalog = catalogRaw as CatalogItem[];
    const artifactData = artifactDataRaw;
    
    const artifactPickerSlot = ref<number | null>(null);
    const stonePickerSlot = ref<{ slot: number; index: number } | null>(null);

    // Group artifact data for the picker
    const artifactFamilies = computed(() => {
      return (artifactData as any).artifact_families.filter((f: any) => f.type === 'Artifact');
    });

    const familyItems = (family: any) => {
      // Find all items in catalog matching this afxId
      return catalog.filter(item => item.afxId === family.afx_id).map(item => ({
        ...item,
        effectTargetShort: item.effectTarget.replace('away earnings', 'Away').replace('egg value', 'Value').replace('research cost', 'Lab')
      }));
    };

    const stones = computed(() => {
      // Find all stones in catalog by checking family data
      const stoneFamilies = (artifactData as any).artifact_families.filter((f: any) => f.afx_type === 1);
      const stoneIds = stoneFamilies.map((f: any) => f.afx_id);
      
      return catalog.filter(item => stoneIds.includes(item.afxId)).map(item => ({
        ...item,
        effectTargetShort: item.effectTarget.replace('away earnings', 'Away').replace('egg value', 'Value').replace('research cost', 'Lab').replace('egg laying rate', 'Laying')
      }));
    });

    // Show all tiers of stones, grouped by type
    const suggestedStones = computed(() => {
       return stones.value.sort((a, b) => {
         if (a.afxId !== b.afxId) return a.afxId - b.afxId;
         return b.afxLevel - a.afxLevel;
       });
    });

    const openArtifactPicker = (index: number) => {
      artifactPickerSlot.value = index;
    };

    const openStonePicker = (slotIndex: number, stoneIndex: number) => {
      stonePickerSlot.value = { slot: slotIndex, index: stoneIndex };
    };

    const rarityBgClass = (rarity: number) => {
      switch (rarity) {
        case 1: return 'bg-blue-100 radial-rare';
        case 2: return 'bg-purple-100 radial-epic';
        case 3: return 'bg-yellow-100 radial-legendary';
        default: return 'bg-gray-100';
      }
    };

    const rarityBadgeClass = (rarity: number) => {
      switch (rarity) {
        case 1: return 'bg-blue-500';
        case 2: return 'bg-purple-500';
        case 3: return 'bg-yellow-600';
        default: return 'bg-gray-400';
      }
    };

    const rarityName = (rarity: number) => {
      switch (rarity) {
        case 1: return 'Rare';
        case 2: return 'Epic';
        case 3: return 'Legendary';
        default: return 'Common';
      }
    };

    const getArtifactIcon = (slot: ArtifactSlot) => {
      const item = catalog.find(i => i.key === slot.artifactId);
      return item ? iconURL(item.iconPath, 256) : '';
    };

    const getArtifactSlots = (slot: ArtifactSlot) => {
      const item = catalog.find(i => i.key === slot.artifactId);
      return item?.slots || 0;
    };

    const getStoneIcon = (stoneKey: string) => {
      const item = catalog.find(i => i.key === stoneKey);
      return item ? iconURL(item.iconPath, 64) : '';
    };

    const selectArtifact = (slotIndex: number, item: CatalogItem) => {
      const newLoadout = [...props.loadout];
      newLoadout[slotIndex] = {
        artifactId: item.key,
        rarity: item.afxRarity,
        stones: Array(item.slots).fill('')
      };
      emit('update:loadout', newLoadout);
      artifactPickerSlot.value = null;
    };

    const removeArtifact = (slotIndex: number) => {
      const newLoadout = [...props.loadout];
      newLoadout[slotIndex] = null;
      emit('update:loadout', newLoadout);
    };

    const selectStone = (slotIndex: number, stoneIndex: number, stoneKey: string | null) => {
      const newLoadout = JSON.parse(JSON.stringify(props.loadout));
      if (newLoadout[slotIndex]) {
        newLoadout[slotIndex].stones[stoneIndex] = stoneKey || '';
      }
      emit('update:loadout', newLoadout);
      stonePickerSlot.value = null;
    };

    return {
      artifactPickerSlot,
      stonePickerSlot,
      artifactFamilies,
      familyItems,
      suggestedStones,
      openArtifactPicker,
      openStonePicker,
      rarityBgClass,
      rarityBadgeClass,
      rarityName,
      getArtifactIcon,
      getArtifactSlots,
      getStoneIcon,
      selectArtifact,
      removeArtifact,
      selectStone,
      iconURL,
    };
  },
});
</script>

<style scoped>
.radial-rare {
  background: radial-gradient(circle, #ecfeff 0%, #b3ffff 50%, #6ab6ff 100%);
}
.radial-epic {
  background: radial-gradient(circle, #fdf4ff 0%, #ff40ff 50%, #c03fe2 100%);
}
.radial-legendary {
  background: radial-gradient(circle, #fffbeb 0%, #fffe41 50%, #eeab42 100%);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

@keyframes drop-shadow-glow {
  0% { filter: drop-shadow(0 0 5px rgba(255,255,255,0.5)); }
  50% { filter: drop-shadow(0 0 15px rgba(255,255,255,0.8)); }
  100% { filter: drop-shadow(0 0 5px rgba(255,255,255,0.5)); }
}
</style>
