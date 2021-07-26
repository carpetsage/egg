import { getNumProphecyEggs } from './prophecy_eggs';
import { ei } from './proto';

export function getNumSoulEggs(backup: ei.IBackup): number {
  return backup.game?.soulEggsD || 0;
}

export function getSoulFoodLevel(backup: ei.IBackup): number {
  const epicResearches = backup.game?.epicResearch || [];
  let soulFoodLevel = 0;
  for (const r of epicResearches) {
    if (r.id === 'soul_eggs') {
      soulFoodLevel = r.level!;
    }
  }
  return soulFoodLevel;
}

export function getProphecyBonusLevel(backup: ei.IBackup): number {
  const epicResearches = backup.game?.epicResearch || [];
  let prophecyBonusLevel = 0;
  for (const r of epicResearches) {
    if (r.id === 'prophecy_bonus') {
      prophecyBonusLevel = r.level!;
    }
  }
  return prophecyBonusLevel;
}

export function getNakedEarningBonus(backup: ei.IBackup): number {
  const soulEggBonus = 0.1 + getSoulFoodLevel(backup) * 0.01;
  const prophecyEggBonus = 0.05 + getProphecyBonusLevel(backup) * 0.01;
  return (
    getNumSoulEggs(backup) * soulEggBonus * (1 + prophecyEggBonus) ** getNumProphecyEggs(backup)
  );
}

// Implements farmer roles from the Egg, Inc. Discord.
//
// !?gethexcodes all
//
// ...
// Farmer: #ca6500
// Farmer II: #c68100
// Farmer III: #c49c00
// Kilofarmer: #c2b900
// Kilofarmer II: #afc300
// Kilofarmer III: #93c400
// Megafarmer: #75c800
// Megafarmer II: #59cd00
// Megafarmer III: #3cd300
// Gigafarmer: #1dda00
// Gigafarmer II: #00e204
// Gigafarmer III: #00eb27
// Terafarmer: #00f44e
// Terafarmer II: #00fe77
// Terafarmer III: #0cfca0
// Petafarmer: #1af7c4
// Petafarmer II: #27f4e3
// Petafarmer III: #33e0f0
// Exafarmer: #3dc4ee
// Exafarmer II: #46acec
// Exafarmer III: #4c96ea
// Zettafarmer: #5181e9
// Zettafarmer II: #546de8
// Zettafarmer III: #5557e8
// Yottafarmer: #6854e8
// Yottafarmer II: #7c51e9
// Yottafarmer III: #914dea
// Xennafarmer: #a746eb
// Xennafarmer II: #c13dee
// Xennafarmer III: #dd33f0
// Weccafarmer: #f327e9
// Weccafarmer II: #f71bcb
// Weccafarmer III: #fb0da8
// Vendafarmer: #fe007f
// Vendafarmer II: #f71bcb
// Vendafarmer III: #e132f1
// Uadafarmer: #ac44ec
// Uadafarmer II: #8150e9
// Uadafarmer III: #5a55e8
// Treidafarmer: #527ae9
// Treidafarmer II: #48a4eb
// Treidafarmer III: #38d3ef
// Quadafarmer: #21f5d5
// Quadafarmer II: #07fd93
// Quadafarmer III: #00f141
// Pendafarmer: #08df00
// Pendafarmer II: #43d100
// Pendafarmer III: #7bc700
// Exedafarmer: #b2c200
// Exedafarmer II: #c49c00
// Exedafarmer III: #ca6500
// Infinifarmer: #546e7a
// ...
//
// pbpaste | perl -lape 's/\/\/ /{name:"/; s/: /",color:"/; s/$/"},/' | pbcopy

export type FarmerRole = {
  oom: number;
  name: string;
  color: string;
};

const roles: FarmerRole[] = [
  { oom: 0, name: 'Farmer', color: '#ca6500' },
  { oom: 1, name: 'Farmer II', color: '#c68100' },
  { oom: 2, name: 'Farmer III', color: '#c49c00' },
  { oom: 3, name: 'Kilofarmer', color: '#c2b900' },
  { oom: 4, name: 'Kilofarmer II', color: '#afc300' },
  { oom: 5, name: 'Kilofarmer III', color: '#93c400' },
  { oom: 6, name: 'Megafarmer', color: '#75c800' },
  { oom: 7, name: 'Megafarmer II', color: '#59cd00' },
  { oom: 8, name: 'Megafarmer III', color: '#3cd300' },
  { oom: 9, name: 'Gigafarmer', color: '#1dda00' },
  { oom: 10, name: 'Gigafarmer II', color: '#00e204' },
  { oom: 11, name: 'Gigafarmer III', color: '#00eb27' },
  { oom: 12, name: 'Terafarmer', color: '#00f44e' },
  { oom: 13, name: 'Terafarmer II', color: '#00fe77' },
  { oom: 14, name: 'Terafarmer III', color: '#0cfca0' },
  { oom: 15, name: 'Petafarmer', color: '#1af7c4' },
  { oom: 16, name: 'Petafarmer II', color: '#27f4e3' },
  { oom: 17, name: 'Petafarmer III', color: '#33e0f0' },
  { oom: 18, name: 'Exafarmer', color: '#3dc4ee' },
  { oom: 19, name: 'Exafarmer II', color: '#46acec' },
  { oom: 20, name: 'Exafarmer III', color: '#4c96ea' },
  { oom: 21, name: 'Zettafarmer', color: '#5181e9' },
  { oom: 22, name: 'Zettafarmer II', color: '#546de8' },
  { oom: 23, name: 'Zettafarmer III', color: '#5557e8' },
  { oom: 24, name: 'Yottafarmer', color: '#6854e8' },
  { oom: 25, name: 'Yottafarmer II', color: '#7c51e9' },
  { oom: 26, name: 'Yottafarmer III', color: '#914dea' },
  { oom: 27, name: 'Xennafarmer', color: '#a746eb' },
  { oom: 28, name: 'Xennafarmer II', color: '#c13dee' },
  { oom: 29, name: 'Xennafarmer III', color: '#dd33f0' },
  { oom: 30, name: 'Weccafarmer', color: '#f327e9' },
  { oom: 31, name: 'Weccafarmer II', color: '#f71bcb' },
  { oom: 32, name: 'Weccafarmer III', color: '#fb0da8' },
  { oom: 33, name: 'Vendafarmer', color: '#fe007f' },
  { oom: 34, name: 'Vendafarmer II', color: '#f71bcb' },
  { oom: 35, name: 'Vendafarmer III', color: '#e132f1' },
  { oom: 36, name: 'Uadafarmer', color: '#ac44ec' },
  { oom: 37, name: 'Uadafarmer II', color: '#8150e9' },
  { oom: 38, name: 'Uadafarmer III', color: '#5a55e8' },
  { oom: 39, name: 'Treidafarmer', color: '#527ae9' },
  { oom: 40, name: 'Treidafarmer II', color: '#48a4eb' },
  { oom: 41, name: 'Treidafarmer III', color: '#38d3ef' },
  { oom: 42, name: 'Quadafarmer', color: '#21f5d5' },
  { oom: 43, name: 'Quadafarmer II', color: '#07fd93' },
  { oom: 44, name: 'Quadafarmer III', color: '#00f141' },
  { oom: 45, name: 'Pendafarmer', color: '#08df00' },
  { oom: 46, name: 'Pendafarmer II', color: '#43d100' },
  { oom: 47, name: 'Pendafarmer III', color: '#7bc700' },
  { oom: 48, name: 'Exedafarmer', color: '#b2c200' },
  { oom: 49, name: 'Exedafarmer II', color: '#c49c00' },
  { oom: 50, name: 'Exedafarmer III', color: '#ca6500' },
  { oom: 51, name: 'Infinifarmer', color: '#546e7a' },
];

export function soulPowerToFarmerRole(soulPower: number): FarmerRole {
  const oom = Math.floor(Math.max(soulPower, 0));
  // For Infinifarmer, set oom to match the soulPower.
  return oom < roles.length
    ? roles[oom]
    : {
        ...roles[roles.length - 1],
        oom,
      };
}

export function earningBonusToFarmerRole(earningBonus: number): FarmerRole {
  return soulPowerToFarmerRole(Math.log10(earningBonus));
}
