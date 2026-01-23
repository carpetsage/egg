<template>
  <div class="fixed right-0 top-0 h-full z-50">
    <!-- Toggle button -->
    <button
      class="absolute top-4 right-0 bg-gray-800 text-white px-2 py-4 rounded-l-lg text-xs"
      :class="{ 'right-80': isOpen }"
      @click="isOpen = !isOpen"
    >
      {{ isOpen ? '→' : '← Assets' }}
    </button>

    <!-- Sidebar panel -->
    <div
      v-show="isOpen"
      class="w-80 h-full bg-white border-l border-gray-300 shadow-lg overflow-y-auto"
    >
      <div class="p-4">
        <h2 class="text-lg font-bold mb-4">Asset Browser</h2>
        <p class="text-xs text-gray-500 mb-4">Click any asset to copy its iconURL code.</p>

        <!-- Search -->
        <input
          v-model="search"
          type="text"
          placeholder="Search assets..."
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-4"
        />

        <!-- Asset categories -->
        <div v-for="category in filteredCategories" :key="category.name" class="mb-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">{{ category.name }}</h3>
          <div class="grid grid-cols-4 gap-2">
            <div
              v-for="asset in category.assets"
              :key="asset.path"
              class="relative group cursor-pointer"
              @click="copyAsset(asset)"
            >
              <img
                :src="getAssetUrl(asset.path)"
                :alt="asset.name"
                class="w-12 h-12 object-contain bg-gray-100 rounded p-1 hover:bg-blue-100"
              />
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                {{ asset.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Copied notification -->
        <div
          v-if="copiedAsset"
          class="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-sm"
        >
          Copied: {{ copiedAsset }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';

interface Asset {
  name: string;
  path: string;
  size?: number;
}

interface AssetCategory {
  name: string;
  assets: Asset[];
}

const ASSET_CATEGORIES: AssetCategory[] = [
  {
    name: 'Virtue Eggs',
    assets: [
      { name: 'Curiosity', path: 'egginc/egg_curiosity.png' },
      { name: 'Integrity', path: 'egginc/egg_integrity.png' },
      { name: 'Kindness', path: 'egginc/egg_kindness.png' },
      { name: 'Humility', path: 'egginc/egg_humility.png' },
      { name: 'Resilience', path: 'egginc/egg_resilience.png' },
    ],
  },
  {
    name: 'Special Eggs',
    assets: [
      { name: 'Truth', path: 'egginc/egg_truth.png' },
      { name: 'Soul', path: 'egginc/egg_soul.png' },
      { name: 'Prophecy', path: 'egginc/egg_of_prophecy.png' },
      { name: 'Enlightenment', path: 'egginc/egg_enlightenment.png' },
    ],
  },
  {
    name: 'Standard Eggs',
    assets: [
      { name: 'Edible', path: 'egginc/egg_edible.png' },
      { name: 'Superfood', path: 'egginc/egg_superfood.png' },
      { name: 'Medical', path: 'egginc/egg_medical2.png' },
      { name: 'Rocket Fuel', path: 'egginc/egg_rocketfuel.png' },
      { name: 'Super Material', path: 'egginc/egg_supermaterial.png' },
      { name: 'Fusion', path: 'egginc/egg_fusion.png' },
      { name: 'Quantum', path: 'egginc/egg_quantum.png' },
      { name: 'CRISPR', path: 'egginc/egg_crispr.png' },
      { name: 'Tachyon', path: 'egginc/egg_tachyon.png' },
      { name: 'Graviton', path: 'egginc/egg_graviton.png' },
      { name: 'Dilithium', path: 'egginc/egg_dilithium.png' },
      { name: 'Prodigy', path: 'egginc/egg_prodigy.png' },
      { name: 'Terraform', path: 'egginc/egg_terraform.png' },
      { name: 'Antimatter', path: 'egginc/egg_antimatter.png' },
      { name: 'Dark Matter', path: 'egginc/egg_darkmatter.png' },
      { name: 'AI', path: 'egginc/egg_ai.png' },
      { name: 'Nebula', path: 'egginc/egg_vision.png' },
      { name: 'Universe', path: 'egginc/egg_universe.png' },
    ],
  },
  {
    name: 'Icons',
    assets: [
      { name: 'Soul Food', path: 'egginc/r_icon_soul_food.png' },
      { name: 'Prophecy Bonus', path: 'egginc/r_icon_prophecy_bonus.png' },
      { name: 'Mission Duration', path: 'egginc/r_icon_afx_mission_duration.png' },
      { name: 'Mission Capacity', path: 'egginc/r_icon_afx_mission_capacity.png' },
      { name: 'App Icon', path: 'egginc/ei_app_icon.png' },
      { name: 'Shell Script', path: 'egginc/icon_shell_script_colored.png' },
    ],
  },
  {
    name: 'Boosts',
    assets: [
      { name: 'Jimbo\'s', path: 'egginc/b_icon_jimbos_orange_big.png' },
      { name: 'Tachyon Prism', path: 'egginc/b_icon_tachyon_prism_orange_big.png' },
      { name: 'Soul Beacon', path: 'egginc/b_icon_soul_beacon_orange.png' },
      { name: 'Boost Beacon', path: 'egginc/b_icon_boost_beacon_orange.png' },
    ],
  },
  {
    name: 'Vehicles',
    assets: [
      { name: 'Trike', path: 'egginc/ei_vehicle_icon_trike.png' },
      { name: 'Transit Van', path: 'egginc/ei_vehicle_icon_transit_van.png' },
      { name: 'Pickup', path: 'egginc/ei_vehicle_icon_pickup.png' },
      { name: '10ft Truck', path: 'egginc/ei_vehicle_icon_10ft.png' },
      { name: '24ft Truck', path: 'egginc/ei_vehicle_icon_24ft.png' },
      { name: 'Semi', path: 'egginc/ei_vehicle_icon_semi.png' },
      { name: 'Double Semi', path: 'egginc/ei_vehicle_icon_double_semi.png' },
      { name: 'Future Semi', path: 'egginc/ei_vehicle_icon_future_semi.png' },
      { name: 'Mega Semi', path: 'egginc/ei_vehicle_icon_mega_semi.png' },
      { name: 'Hover Semi', path: 'egginc/ei_vehicle_icon_hover_semi.png' },
      { name: 'Quantum Transporter', path: 'egginc/ei_vehicle_icon_quantum_transporter.png' },
      { name: 'Hyperloop', path: 'egginc/ei_vehicle_icon_hyperloop_engine.png' },
    ],
  },
  {
    name: 'Habitats',
    assets: [
      { name: 'Coop', path: 'egginc/ei_hab_icon_coop.png' },
      { name: 'Shack', path: 'egginc/ei_hab_icon_shack.png' },
      { name: 'Super Shack', path: 'egginc/ei_hab_icon_super_shack.png' },
      { name: 'Short House', path: 'egginc/ei_hab_icon_short_house.png' },
      { name: 'The Standard', path: 'egginc/ei_hab_icon_the_standard.png' },
      { name: 'Long House', path: 'egginc/ei_hab_icon_long_house.png' },
      { name: 'Double Decker', path: 'egginc/ei_hab_icon_double_decker.png' },
      { name: 'Warehouse', path: 'egginc/ei_hab_icon_warehouse.png' },
      { name: 'Center', path: 'egginc/ei_hab_icon_center.png' },
      { name: 'Bunker', path: 'egginc/ei_hab_icon_bunker.png' },
      { name: 'Eggkea', path: 'egginc/ei_hab_icon_eggkea.png' },
      { name: 'HAB 1000', path: 'egginc/ei_hab_icon_hab1k.png' },
      { name: 'Hangar', path: 'egginc/ei_hab_icon_hanger.png' },
      { name: 'Tower', path: 'egginc/ei_hab_icon_tower.png' },
      { name: 'HAB 10000', path: 'egginc/ei_hab_icon_hab10k.png' },
      { name: 'Eggtopia', path: 'egginc/ei_hab_icon_eggtopia.png' },
      { name: 'Monolith', path: 'egginc/ei_hab_icon_monolith.png' },
      { name: 'Portal', path: 'egginc/ei_hab_icon_portal.png' },
      { name: 'Chicken Universe', path: 'egginc/ei_hab_icon_chicken_universe.png' },
    ],
  },
  {
    name: 'Artifacts',
    assets: [
      { name: 'Puzzle Cube T4', path: 'egginc/afx_puzzle_cube_4.png' },
      { name: 'Lunar Totem T4', path: 'egginc/afx_lunar_totem_4.png' },
      { name: 'Demeters Necklace T4', path: 'egginc/afx_demeters_necklace_4.png' },
      { name: 'Vial Martian Dust T4', path: 'egginc/afx_vial_martian_dust_4.png' },
      { name: 'Aurelian Brooch T4', path: 'egginc/afx_aurelian_brooch_4.png' },
      { name: 'Beak of Midas T4', path: 'egginc/afx_beak_of_midas_4.png' },
      { name: 'Book of Basan T4', path: 'egginc/afx_book_of_basan_4.png' },
      { name: 'Tachyon Deflector T4', path: 'egginc/afx_tachyon_deflector_4.png' },
      { name: 'Dilithium Monocle T4', path: 'egginc/afx_dilithium_monocle_4.png' },
      { name: 'Quantum Metronome T4', path: 'egginc/afx_quantum_metronome_4.png' },
      { name: 'Interstellar Compass T4', path: 'egginc/afx_interstellar_compass_4.png' },
      { name: 'Light of Eggendil T4', path: 'egginc/afx_light_eggendil_4.png' },
      { name: 'Carved Rainstick T4', path: 'egginc/afx_carved_rainstick_4.png' },
      { name: 'Ornate Gusset T4', path: 'egginc/afx_ornate_gusset_4.png' },
      { name: 'The Chalice T4', path: 'egginc/afx_the_chalice_4.png' },
      { name: 'Phoenix Feather T4', path: 'egginc/afx_phoenix_feather_4.png' },
      { name: 'Tungsten Ankh T4', path: 'egginc/afx_tungsten_ankh_4.png' },
      { name: 'Ship in Bottle T4', path: 'egginc/afx_ship_in_a_bottle_4.png' },
      { name: 'Titanium Actuator T4', path: 'egginc/afx_titanium_actuator_4.png' },
      { name: 'Mercurys Lens T4', path: 'egginc/afx_mercurys_lens_4.png' },
      { name: 'Neodymium Medallion T4', path: 'egginc/afx_neodymium_medallion_4.png' },
    ],
  },
  {
    name: 'Stones',
    assets: [
      { name: 'Prophecy Stone T4', path: 'egginc/afx_prophecy_stone_4.png' },
      { name: 'Soul Stone T4', path: 'egginc/afx_soul_stone_4.png' },
      { name: 'Clarity Stone T4', path: 'egginc/afx_clarity_stone_4.png' },
      { name: 'Dilithium Stone T4', path: 'egginc/afx_dilithium_stone_4.png' },
      { name: 'Life Stone T4', path: 'egginc/afx_life_stone_4.png' },
      { name: 'Quantum Stone T4', path: 'egginc/afx_quantum_stone_4.png' },
      { name: 'Terra Stone T4', path: 'egginc/afx_terra_stone_4.png' },
      { name: 'Tachyon Stone T4', path: 'egginc/afx_tachyon_stone_4.png' },
      { name: 'Shell Stone T4', path: 'egginc/afx_shell_stone_4.png' },
      { name: 'Lunar Stone T4', path: 'egginc/afx_lunar_stone_4.png' },
    ],
  },
];

export default defineComponent({
  setup() {
    const isOpen = ref(false);
    const search = ref('');
    const copiedAsset = ref<string | null>(null);

    const filteredCategories = computed(() => {
      if (!search.value) return ASSET_CATEGORIES;

      const query = search.value.toLowerCase();
      return ASSET_CATEGORIES.map(cat => ({
        ...cat,
        assets: cat.assets.filter(a =>
          a.name.toLowerCase().includes(query) ||
          a.path.toLowerCase().includes(query)
        ),
      })).filter(cat => cat.assets.length > 0);
    });

    const getAssetUrl = (path: string) => {
      return `https://eggincassets.pages.dev/64/${path}`;
    };

    const copyAsset = async (asset: Asset) => {
      const code = `iconURL('${asset.path}', 64)`;
      await navigator.clipboard.writeText(code);
      copiedAsset.value = asset.name;
      setTimeout(() => {
        copiedAsset.value = null;
      }, 2000);
    };

    return {
      isOpen,
      search,
      filteredCategories,
      getAssetUrl,
      copyAsset,
      copiedAsset,
    };
  },
});
</script>
