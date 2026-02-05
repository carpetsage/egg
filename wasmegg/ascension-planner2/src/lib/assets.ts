export interface Asset {
    name: string;
    path: string;
}

export interface AssetCategory {
    name: string;
    assets: Asset[];
}

export const ASSET_CATEGORIES: AssetCategory[] = [
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
        name: 'Colleggtibles',
        assets: [
            { name: 'Unknown', path: 'egginc/egg_unknown.png' },
            { name: 'Carbon Fiber', path: 'egginc/egg_carbonfiber.png' },
            { name: 'Chocolate', path: 'egginc/egg_chocolate.png' },
            { name: 'Easter', path: 'egginc/egg_easter.png' },
            { name: 'Firework', path: 'egginc/egg_firework.png' },
            { name: 'Flame Retardant', path: 'egginc/egg_flameretardant.png' },
            { name: 'Lithium', path: 'egginc/egg_lithium.png' },
            { name: 'P.E.G.G.', path: 'egginc/egg_pegg.png' },
            { name: 'Pumpkin', path: 'egginc/egg_pumpkin.png' },
            { name: 'Silicon', path: 'egginc/egg_silicon.png' },
            { name: 'Waterballoon', path: 'egginc/egg_waterballoon.png' },
            { name: 'Wood', path: 'egginc/egg_wood.png' },
        ]
    },
    /*{
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
    },*/
    /*{
        name: 'Icons',
        assets: [
            { name: 'Soul Food', path: 'egginc/r_icon_soul_food.png' },
            { name: 'Prophecy Bonus', path: 'egginc/r_icon_prophecy_bonus.png' },
            { name: 'Mission Duration', path: 'egginc/r_icon_afx_mission_duration.png' },
            { name: 'Mission Capacity', path: 'egginc/r_icon_afx_mission_capacity.png' },
            { name: 'App Icon', path: 'egginc/ei_app_icon.png' },
            { name: 'Shell Script', path: 'egginc/icon_shell_script_colored.png' },
        ],
    },*/
    {
        name: 'Epic Research',
        assets: [
            { name: 'Hold to Hatch', path: 'egginc/r_icon_hold_to_hatch.png' },
            { name: 'Epic Hatchery', path: 'egginc/r_icon_epic_hatchery.png' },
            { name: 'Silo Capacity', path: 'egginc/r_icon_silo_capacity.png' },
            { name: 'Accounting Tricks', path: 'egginc/r_icon_accounting_tricks.png' },
            { name: 'Epic Int. Hatcheries', path: 'egginc/r_icon_epic_internal_hatchery.png' },
            { name: 'Cheaper Contractors', path: 'egginc/r_icon_cheaper_contractors.png' },
            { name: 'Bust Unions', path: 'egginc/r_icon_bust_unions.png' },
            { name: 'Lab Upgrade', path: 'egginc/r_icon_lab_upgrade.png' },
            { name: 'Epic Clucking', path: 'egginc/r_icon_epic_clucking.png' },
            { name: 'Epic Multiplier', path: 'egginc/r_icon_epic_multiplier.png' },
            { name: 'Drone Rewards', path: 'egginc/r_icon_drone_rewards.png' },
            { name: 'Video Doubler Time', path: 'egginc/r_icon_video_doubler_time.png' },
            { name: 'Internal Hatchery Calm', path: 'egginc/r_icon_internal_hatchery_calm.png' },
            { name: 'Soul Food', path: 'egginc/r_icon_soul_food.png' },
            { name: 'Prestige Bonus', path: 'egginc/r_icon_prestige_bonus.png' },
            { name: 'Epic Comfy Nests', path: 'egginc/r_icon_epic_egg_laying.png' },
            { name: 'Transportation Lobbyists', path: 'egginc/r_icon_transportation_lobbyist.png' },
            { name: 'Internal Hatchery Sharing', path: 'egginc/r_icon_internal_hatchery_sharing.png' },
            { name: 'Hold to Research', path: 'egginc/r_icon_hold_to_research.png' },
            { name: 'Prophecy Bonus', path: 'egginc/r_icon_prophecy_bonus.png' },
            { name: 'FTL Drive Upgrades', path: 'egginc/r_icon_afx_mission_duration.png' },
            { name: 'Zero-G Quantum Containment', path: 'egginc/r_icon_afx_mission_capacity.png' },
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
        name: 'Habs',
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
            { name: 'Puzzle Cube T1', path: 'egginc/afx_puzzle_cube_1.png' },
            { name: 'Puzzle Cube T2', path: 'egginc/afx_puzzle_cube_2.png' },
            { name: 'Puzzle Cube T3', path: 'egginc/afx_puzzle_cube_3.png' },
            { name: 'Puzzle Cube T4', path: 'egginc/afx_puzzle_cube_4.png' },

            { name: 'Lunar Totem T1', path: 'egginc/afx_lunar_totem_1.png' },
            { name: 'Lunar Totem T2', path: 'egginc/afx_lunar_totem_2.png' },
            { name: 'Lunar Totem T3', path: 'egginc/afx_lunar_totem_3.png' },
            { name: 'Lunar Totem T4', path: 'egginc/afx_lunar_totem_4.png' },

            { name: 'Demeters Necklace T1', path: 'egginc/afx_demeters_necklace_1.png' },
            { name: 'Demeters Necklace T2', path: 'egginc/afx_demeters_necklace_2.png' },
            { name: 'Demeters Necklace T3', path: 'egginc/afx_demeters_necklace_3.png' },
            { name: 'Demeters Necklace T4', path: 'egginc/afx_demeters_necklace_4.png' },

            { name: 'Vial Martian Dust T1', path: 'egginc/afx_vial_martian_dust_1.png' },
            { name: 'Vial Martian Dust T2', path: 'egginc/afx_vial_martian_dust_2.png' },
            { name: 'Vial Martian Dust T3', path: 'egginc/afx_vial_martian_dust_3.png' },
            { name: 'Vial Martian Dust T4', path: 'egginc/afx_vial_martian_dust_4.png' },

            { name: 'Aurelian Brooch T1', path: 'egginc/afx_aurelian_brooch_1.png' },
            { name: 'Aurelian Brooch T2', path: 'egginc/afx_aurelian_brooch_2.png' },
            { name: 'Aurelian Brooch T3', path: 'egginc/afx_aurelian_brooch_3.png' },
            { name: 'Aurelian Brooch T4', path: 'egginc/afx_aurelian_brooch_4.png' },

            { name: 'Beak of Midas T1', path: 'egginc/afx_beak_of_midas_1.png' },
            { name: 'Beak of Midas T2', path: 'egginc/afx_beak_of_midas_2.png' },
            { name: 'Beak of Midas T3', path: 'egginc/afx_beak_of_midas_3.png' },
            { name: 'Beak of Midas T4', path: 'egginc/afx_beak_of_midas_4.png' },

            { name: 'Book of Basan T1', path: 'egginc/afx_book_of_basan_1.png' },
            { name: 'Book of Basan T2', path: 'egginc/afx_book_of_basan_2.png' },
            { name: 'Book of Basan T3', path: 'egginc/afx_book_of_basan_3.png' },
            { name: 'Book of Basan T4', path: 'egginc/afx_book_of_basan_4.png' },

            { name: 'Tachyon Deflector T1', path: 'egginc/afx_tachyon_deflector_1.png' },
            { name: 'Tachyon Deflector T2', path: 'egginc/afx_tachyon_deflector_2.png' },
            { name: 'Tachyon Deflector T3', path: 'egginc/afx_tachyon_deflector_3.png' },
            { name: 'Tachyon Deflector T4', path: 'egginc/afx_tachyon_deflector_4.png' },

            { name: 'Dilithium Monocle T1', path: 'egginc/afx_dilithium_monocle_1.png' },
            { name: 'Dilithium Monocle T2', path: 'egginc/afx_dilithium_monocle_2.png' },
            { name: 'Dilithium Monocle T3', path: 'egginc/afx_dilithium_monocle_3.png' },
            { name: 'Dilithium Monocle T4', path: 'egginc/afx_dilithium_monocle_4.png' },

            { name: 'Quantum Metronome T1', path: 'egginc/afx_quantum_metronome_1.png' },
            { name: 'Quantum Metronome T2', path: 'egginc/afx_quantum_metronome_2.png' },
            { name: 'Quantum Metronome T3', path: 'egginc/afx_quantum_metronome_3.png' },
            { name: 'Quantum Metronome T4', path: 'egginc/afx_quantum_metronome_4.png' },

            { name: 'Interstellar Compass T1', path: 'egginc/afx_interstellar_compass_1.png' },
            { name: 'Interstellar Compass T2', path: 'egginc/afx_interstellar_compass_2.png' },
            { name: 'Interstellar Compass T3', path: 'egginc/afx_interstellar_compass_3.png' },
            { name: 'Interstellar Compass T4', path: 'egginc/afx_interstellar_compass_4.png' },

            { name: 'Light of Eggendil T1', path: 'egginc/afx_light_eggendil_1.png' },
            { name: 'Light of Eggendil T2', path: 'egginc/afx_light_eggendil_2.png' },
            { name: 'Light of Eggendil T3', path: 'egginc/afx_light_eggendil_3.png' },
            { name: 'Light of Eggendil T4', path: 'egginc/afx_light_eggendil_4.png' },

            { name: 'Carved Rainstick T1', path: 'egginc/afx_carved_rainstick_1.png' },
            { name: 'Carved Rainstick T2', path: 'egginc/afx_carved_rainstick_2.png' },
            { name: 'Carved Rainstick T3', path: 'egginc/afx_carved_rainstick_3.png' },
            { name: 'Carved Rainstick T4', path: 'egginc/afx_carved_rainstick_4.png' },

            { name: 'Ornate Gusset T1', path: 'egginc/afx_ornate_gusset_1.png' },
            { name: 'Ornate Gusset T2', path: 'egginc/afx_ornate_gusset_2.png' },
            { name: 'Ornate Gusset T3', path: 'egginc/afx_ornate_gusset_3.png' },
            { name: 'Ornate Gusset T4', path: 'egginc/afx_ornate_gusset_4.png' },

            { name: 'The Chalice T1', path: 'egginc/afx_the_chalice_1.png' },
            { name: 'The Chalice T2', path: 'egginc/afx_the_chalice_2.png' },
            { name: 'The Chalice T3', path: 'egginc/afx_the_chalice_3.png' },
            { name: 'The Chalice T4', path: 'egginc/afx_the_chalice_4.png' },

            { name: 'Phoenix Feather T1', path: 'egginc/afx_phoenix_feather_1.png' },
            { name: 'Phoenix Feather T2', path: 'egginc/afx_phoenix_feather_2.png' },
            { name: 'Phoenix Feather T3', path: 'egginc/afx_phoenix_feather_3.png' },
            { name: 'Phoenix Feather T4', path: 'egginc/afx_phoenix_feather_4.png' },

            { name: 'Tungsten Ankh T1', path: 'egginc/afx_tungsten_ankh_1.png' },
            { name: 'Tungsten Ankh T2', path: 'egginc/afx_tungsten_ankh_2.png' },
            { name: 'Tungsten Ankh T3', path: 'egginc/afx_tungsten_ankh_3.png' },
            { name: 'Tungsten Ankh T4', path: 'egginc/afx_tungsten_ankh_4.png' },

            { name: 'Ship in Bottle T1', path: 'egginc/afx_ship_in_a_bottle_1.png' },
            { name: 'Ship in Bottle T2', path: 'egginc/afx_ship_in_a_bottle_2.png' },
            { name: 'Ship in Bottle T3', path: 'egginc/afx_ship_in_a_bottle_3.png' },
            { name: 'Ship in Bottle T4', path: 'egginc/afx_ship_in_a_bottle_4.png' },

            { name: 'Titanium Actuator T1', path: 'egginc/afx_titanium_actuator_1.png' },
            { name: 'Titanium Actuator T2', path: 'egginc/afx_titanium_actuator_2.png' },
            { name: 'Titanium Actuator T3', path: 'egginc/afx_titanium_actuator_3.png' },
            { name: 'Titanium Actuator T4', path: 'egginc/afx_titanium_actuator_4.png' },

            { name: 'Mercurys Lens T1', path: 'egginc/afx_mercurys_lens_1.png' },
            { name: 'Mercurys Lens T2', path: 'egginc/afx_mercurys_lens_2.png' },
            { name: 'Mercurys Lens T3', path: 'egginc/afx_mercurys_lens_3.png' },
            { name: 'Mercurys Lens T4', path: 'egginc/afx_mercurys_lens_4.png' },

            { name: 'Neodymium Medallion T1', path: 'egginc/afx_neo_medallion_1.png' },
            { name: 'Neodymium Medallion T2', path: 'egginc/afx_neo_medallion_2.png' },
            { name: 'Neodymium Medallion T3', path: 'egginc/afx_neo_medallion_3.png' },
            { name: 'Neodymium Medallion T4', path: 'egginc/afx_neo_medallion_4.png' },
        ],
    },
    {
        name: 'Stones',
        assets: [
            { name: 'Prophecy Stone T2', path: 'egginc/afx_prophecy_stone_2.png' },
            { name: 'Prophecy Stone T3', path: 'egginc/afx_prophecy_stone_3.png' },
            { name: 'Prophecy Stone T4', path: 'egginc/afx_prophecy_stone_4.png' },

            { name: 'Soul Stone T2', path: 'egginc/afx_soul_stone_2.png' },
            { name: 'Soul Stone T3', path: 'egginc/afx_soul_stone_3.png' },
            { name: 'Soul Stone T4', path: 'egginc/afx_soul_stone_4.png' },

            { name: 'Clarity Stone T2', path: 'egginc/afx_clarity_stone_2.png' },
            { name: 'Clarity Stone T3', path: 'egginc/afx_clarity_stone_3.png' },
            { name: 'Clarity Stone T4', path: 'egginc/afx_clarity_stone_4.png' },

            { name: 'Dilithium Stone T2', path: 'egginc/afx_dilithium_stone_2.png' },
            { name: 'Dilithium Stone T3', path: 'egginc/afx_dilithium_stone_3.png' },
            { name: 'Dilithium Stone T4', path: 'egginc/afx_dilithium_stone_4.png' },

            { name: 'Life Stone T2', path: 'egginc/afx_life_stone_2.png' },
            { name: 'Life Stone T3', path: 'egginc/afx_life_stone_3.png' },
            { name: 'Life Stone T4', path: 'egginc/afx_life_stone_4.png' },

            { name: 'Quantum Stone T2', path: 'egginc/afx_quantum_stone_2.png' },
            { name: 'Quantum Stone T3', path: 'egginc/afx_quantum_stone_3.png' },
            { name: 'Quantum Stone T4', path: 'egginc/afx_quantum_stone_4.png' },

            { name: 'Terra Stone T2', path: 'egginc/afx_terra_stone_2.png' },
            { name: 'Terra Stone T3', path: 'egginc/afx_terra_stone_3.png' },
            { name: 'Terra Stone T4', path: 'egginc/afx_terra_stone_4.png' },

            { name: 'Tachyon Stone T2', path: 'egginc/afx_tachyon_stone_2.png' },
            { name: 'Tachyon Stone T3', path: 'egginc/afx_tachyon_stone_3.png' },
            { name: 'Tachyon Stone T4', path: 'egginc/afx_tachyon_stone_4.png' },

            { name: 'Shell Stone T2', path: 'egginc/afx_shell_stone_2.png' },
            { name: 'Shell Stone T3', path: 'egginc/afx_shell_stone_3.png' },
            { name: 'Shell Stone T4', path: 'egginc/afx_shell_stone_4.png' },

            { name: 'Lunar Stone T2', path: 'egginc/afx_lunar_stone_2.png' },
            { name: 'Lunar Stone T3', path: 'egginc/afx_lunar_stone_3.png' },
            { name: 'Lunar Stone T4', path: 'egginc/afx_lunar_stone_4.png' },
        ],
    },
    {
        name: 'Common Research',
        assets: [
            // Tier 1
            { name: 'Comfortable Nests', path: 'egginc/r_icon_comfortable_nests.png' },
            { name: 'Nutritional Supplements', path: 'egginc/r_icon_supplements.png' },
            { name: 'Better Incubators', path: 'egginc/r_icon_better_incubators.png' },
            { name: 'Excitable Chickens', path: 'egginc/r_icon_excitable.png' },

            // Tier 2
            { name: 'Hen House Remodel', path: 'egginc/r_icon_hab_capacity.png' },
            { name: 'Internal Hatcheries', path: 'egginc/r_icon_internal_hatchery.png' },
            { name: 'Padded Packaging', path: 'egginc/r_icon_padded_packaging.png' },
            { name: 'Hatchery Expansion', path: 'egginc/r_icon_hatchery_capacity.png' },
            { name: 'Bigger Eggs', path: 'egginc/r_icon_double_egg_size.png' },

            // Tier 3
            { name: 'Internal Hatchery Upgrades', path: 'egginc/r_icon_internal_hatchery2.png' },
            { name: 'Improved Leafsprings', path: 'egginc/r_icon_improved_leafsprings.png' },
            { name: 'Vehicle Reliability', path: 'egginc/r_icon_free_tuneups.png' },
            { name: 'Rooster Booster', path: 'egginc/r_icon_better_incubators2.png' },
            { name: 'Coordinated Clucking', path: 'egginc/r_icon_coordinated_clucking.png' },

            // Tier 4
            { name: 'Hatchery Rebuild', path: 'egginc/r_icon_hatchery_rebuild.png' },
            { name: 'USDE Prime Certification', path: 'egginc/r_icon_prime_certification.png' },
            { name: 'Hen House A/C', path: 'egginc/r_icon_hen_house_ac.png' },
            { name: 'Super-Feed™ Diet', path: 'egginc/r_icon_superfeed.png' },
            { name: 'Microlux™ Chicken Suites', path: 'egginc/r_icon_microlux_suites.png' },

            // Tier 5
            { name: 'Compact Incubators', path: 'egginc/r_icon_compact_incubators.png' },
            { name: 'Lightweight Boxes', path: 'egginc/r_icon_lightweight_boxes.png' },
            { name: 'Depot Worker Exoskeletons', path: 'egginc/r_icon_exoskeletons.png' },
            { name: 'Internal Hatchery Expansion', path: 'egginc/r_icon_internal_hatchery_expansion.png' },
            { name: 'Improved Genetics', path: 'egginc/r_icon_improved_genetics.png' },

            // Tier 6
            { name: 'Traffic Management', path: 'egginc/r_icon_traffic_management.png' },
            { name: 'Motivational Clucking', path: 'egginc/r_icon_motivational_clucking.png' },
            { name: 'Driver Training', path: 'egginc/r_icon_driver_training.png' },
            { name: 'Shell Fortification', path: 'egginc/r_icon_shell_fortification.png' },

            // Tier 7
            { name: 'Egg Loading Bots', path: 'egginc/r_icon_egg_bots.png' },
            { name: 'Super Alloy Frames', path: 'egginc/r_icon_super_alloy_frames.png' },
            { name: 'Even Bigger Eggs', path: 'egginc/r_icon_even_bigger_eggs.png' },
            { name: 'Internal Hatchery Expansion', path: 'egginc/r_icon_internal_hatchery_expansion2.png' },

            // Tier 8
            { name: 'Quantum Egg Storage', path: 'egginc/r_icon_quantum_egg_storage.png' },
            { name: 'Genetic Purification', path: 'egginc/r_icon_genetic_purification.png' },
            { name: 'Machine Learning Incubators', path: 'egginc/r_icon_machine_learning_incubators.png' },
            { name: 'Time Compression', path: 'egginc/r_icon_time_compression.png' },

            // Tier 9
            { name: 'Hover Upgrades', path: 'egginc/r_icon_hover_upgrades.png' },
            { name: 'Graviton Coating', path: 'egginc/r_icon_graviton_coating.png' },
            { name: 'Grav Plating', path: 'egginc/r_icon_grav_plating.png' },
            { name: 'Crystalline Shelling', path: 'egginc/r_icon_crystalline_shelling.png' },

            // Tier 10
            { name: 'Autonomous Vehicles', path: 'egginc/r_icon_autonomous_vehicles.png' },
            { name: 'Neural Linking', path: 'egginc/r_icon_neural_linking.png' },
            { name: 'Telepathic Will', path: 'egginc/r_icon_telepathic_will.png' },
            { name: 'Enlightened Chickens', path: 'egginc/r_icon_enlightened_chickens.png' },

            // Tier 11
            { name: 'Dark Containment', path: 'egginc/r_icon_dark_containment.png' },
            { name: 'Atomic Purification', path: 'egginc/r_icon_atomic_purification.png' },
            { name: 'Multiversal Layering', path: 'egginc/r_icon_multiversal_layering.png' },
            { name: 'Timeline Diversion', path: 'egginc/r_icon_timeline_diversion.png' },

            // Tier 12
            { name: 'Wormhole Dampening', path: 'egginc/r_icon_wormhole_dampening.png' },
            { name: 'Eggsistor Miniturization', path: 'egginc/r_icon_eggsistor_miniturization.png' },
            { name: 'Graviton Coupling', path: 'egginc/r_icon_gravitational_coupling.png' },
            { name: 'Neural Net Refinement', path: 'egginc/r_icon_neural_net_refinement.png' },

            // Tier 13
            { name: 'Matter Reconfiguration', path: 'egginc/r_icon_matter_reconfiguration.png' },
            { name: 'Timeline Splicing', path: 'egginc/r_icon_timeline_splicing.png' },
            { name: 'Hyper Portalling', path: 'egginc/r_icon_hyper_portalling.png' },
            { name: 'Relativity Optimization', path: 'egginc/r_icon_relativity_optimization.png' },
        ],
    },
];

const COLLEGG_ICON_MAP: Record<string, string> = {
    'carbon-fiber': 'egginc/egg_carbonfiber.png',
    'chocolate': 'egginc/egg_chocolate.png',
    'easter': 'egginc/egg_easter.png',
    'firework': 'egginc/egg_firework.png',
    'pumpkin': 'egginc/egg_pumpkin.png',
    'waterballoon': 'egginc/egg_waterballoon.png',
    'lithium': 'egginc/egg_lithium.png',
    'flame-retardant': 'egginc/egg_flameretardant.png',
    'wood': 'egginc/egg_wood.png',
    'silicon': 'egginc/egg_silicon.png',
    'pegg': 'egginc/egg_pegg.png',
    'truth': 'egginc/egg_truth.png',
    'silo_capacity': 'egginc/r_icon_silo_capacity.png',
    'epic_internal_incubators': 'egginc/r_icon_epic_internal_hatchery.png',
    'cheaper_contractors': 'egginc/r_icon_cheaper_contractors.png',
    'bust_unions': 'egginc/r_icon_bust_unions.png',
    'cheaper_research': 'egginc/r_icon_lab_upgrade.png',
    'int_hatch_calm': 'egginc/r_icon_internal_hatchery_calm.png',
    'epic_egg_laying': 'egginc/r_icon_epic_egg_laying.png',
    'transportation_lobbyist': 'egginc/r_icon_transportation_lobbyist.png',
    'afx_mission_time': 'egginc/r_icon_afx_mission_duration.png',
    'soul_eggs': 'egginc/r_icon_soul_food.png',
    'hold_to_hatch': 'egginc/r_icon_hold_to_hatch.png',
    'epic_hatchery': 'egginc/r_icon_epic_hatchery.png',
    'video_doubler_time': 'egginc/r_icon_video_doubler_time.png',
    'epic_clucking': 'egginc/r_icon_epic_clucking.png',
    'epic_multiplier': 'egginc/r_icon_epic_multiplier.png',
    'int_hatch_sharing': 'egginc/r_icon_internal_hatchery_sharing.png',
    'accounting_tricks': 'egginc/r_icon_accounting_tricks.png',
    'prestige_bonus': 'egginc/r_icon_prestige_bonus.png',
    'drone_rewards': 'egginc/r_icon_drone_rewards.png',
    'prophecy_bonus': 'egginc/r_icon_prophecy_bonus.png',
    'hold_to_research': 'egginc/r_icon_hold_to_research.png',
    'comfy_nests': 'egginc/r_icon_comfortable_nests.png',
    'nutritional_sup': 'egginc/r_icon_supplements.png',
    'better_incubators': 'egginc/r_icon_better_incubators.png',
    'excitable_chickens': 'egginc/r_icon_excitable.png',
    'hab_capacity1': 'egginc/r_icon_hab_capacity.png',
    'internal_hatchery1': 'egginc/r_icon_internal_hatchery.png',
    'padded_packaging': 'egginc/r_icon_padded_packaging.png',
    'hatchery_expansion': 'egginc/r_icon_hatchery_capacity.png',
    'bigger_eggs': 'egginc/r_icon_double_egg_size.png',
    'internal_hatchery2': 'egginc/r_icon_internal_hatchery2.png',
    'leafsprings': 'egginc/r_icon_improved_leafsprings.png',
    'vehicle_reliablity': 'egginc/r_icon_free_tuneups.png',
    'rooster_booster': 'egginc/r_icon_better_incubators2.png',
    'coordinated_clucking': 'egginc/r_icon_coordinated_clucking.png',
    'hatchery_rebuild1': 'egginc/r_icon_hatchery_rebuild.png',
    'usde_prime': 'egginc/r_icon_prime_certification.png',
    'hen_house_ac': 'egginc/r_icon_hen_house_ac.png',
    'superfeed': 'egginc/r_icon_superfeed.png',
    'microlux': 'egginc/r_icon_microlux_suites.png',
    'compact_incubators': 'egginc/r_icon_compact_incubators.png',
    'lightweight_boxes': 'egginc/r_icon_lightweight_boxes.png',
    'excoskeletons': 'egginc/r_icon_exoskeletons.png',
    'internal_hatchery3': 'egginc/r_icon_internal_hatchery_expansion.png',
    'improved_genetics': 'egginc/r_icon_improved_genetics.png',
    'traffic_management': 'egginc/r_icon_traffic_management.png',
    'motivational_clucking': 'egginc/r_icon_motivational_clucking.png',
    'driver_training': 'egginc/r_icon_driver_training.png',
    'shell_fortification': 'egginc/r_icon_shell_fortification.png',
    'egg_loading_bots': 'egginc/r_icon_egg_bots.png',
    'super_alloy': 'egginc/r_icon_super_alloy_frames.png',
    'even_bigger_eggs': 'egginc/r_icon_even_bigger_eggs.png',
    'internal_hatchery4': 'egginc/r_icon_internal_hatchery_expansion2.png',
    'quantum_storage': 'egginc/r_icon_quantum_egg_storage.png',
    'genetic_purification': 'egginc/r_icon_genetic_purification.png',
    'internal_hatchery5': 'egginc/r_icon_machine_learning_incubators.png',
    'time_compress': 'egginc/r_icon_time_compression.png',
    'hover_upgrades': 'egginc/r_icon_hover_upgrades.png',
    'graviton_coating': 'egginc/r_icon_graviton_coating.png',
    'grav_plating': 'egginc/r_icon_grav_plating.png',
    'chrystal_shells': 'egginc/r_icon_crystalline_shelling.png',
    'autonomous_vehicles': 'egginc/r_icon_autonomous_vehicles.png',
    'neural_linking': 'egginc/r_icon_neural_linking.png',
    'telepathic_will': 'egginc/r_icon_telepathic_will.png',
    'enlightened_chickens': 'egginc/r_icon_enlightened_chickens.png',
    'dark_containment': 'egginc/r_icon_dark_containment.png',
    'atomic_purification': 'egginc/r_icon_atomic_purification.png',
    'multi_layering': 'egginc/r_icon_multiversal_layering.png',
    'timeline_diversion': 'egginc/r_icon_timeline_diversion.png',
    'wormhole_dampening': 'egginc/r_icon_wormhole_dampening.png',
    'eggsistor': 'egginc/r_icon_eggsistor_miniturization.png',
    'micro_coupling': 'egginc/r_icon_gravitational_coupling.png',
    'neural_net_refine': 'egginc/r_icon_neural_net_refinement.png',
    'matter_reconfig': 'egginc/r_icon_matter_reconfiguration.png',
    'timeline_splicing': 'egginc/r_icon_timeline_splicing.png',
    'hyper_portalling': 'egginc/r_icon_hyper_portalling.png',
    'relativity_optimization': 'egginc/r_icon_relativity_optimization.png',
};

export function getColleggtibleIconPath(id: string): string {
    return COLLEGG_ICON_MAP[id] ?? 'egginc/egg_unknown.png';
}
