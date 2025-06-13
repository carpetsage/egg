import dayjs from 'dayjs';
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
  return getNumSoulEggs(backup) * soulEggBonus * (1 + prophecyEggBonus) ** getNumProphecyEggs(backup);
}

// Implements farmer roles from the Egg, Inc. Discord.
//
// !?gethexcodes all

//
// pbpaste | perl -lape 's/\/\/ /{name:"/; s/: /",color:"/; s/$/"},/' | pbcopy

export type FarmerRole = {
  oom: number;
  name: string;
  color: string;
};

const roles: FarmerRole[] = [
  { oom: 0, name: 'Farmer', color: '#d43500' },
  { oom: 1, name: 'Farmer II', color: '#d14400' },
  { oom: 2, name: 'Farmer III', color: '#cd5500' },
  { oom: 3, name: 'Kilofarmer', color: '#ca6800' },
  { oom: 4, name: 'Kilofarmer II', color: '#c77a00' },
  { oom: 5, name: 'Kilofarmer III', color: '#c58a00' },
  { oom: 6, name: 'Megafarmer', color: '#c49400' },
  { oom: 7, name: 'Megafarmer II', color: '#c39f00' },
  { oom: 8, name: 'Megafarmer III', color: '#c3a900' },
  { oom: 9, name: 'Gigafarmer', color: '#c2b100' },
  { oom: 10, name: 'Gigafarmer II', color: '#c2ba00' },
  { oom: 11, name: 'Gigafarmer III', color: '#c2c200' },
  { oom: 12, name: 'Terafarmer', color: '#aec300' },
  { oom: 13, name: 'Terafarmer II', color: '#99c400' },
  { oom: 14, name: 'Terafarmer III', color: '#85c600' },
  { oom: 15, name: 'Petafarmer', color: '#51ce00' },
  { oom: 16, name: 'Petafarmer II', color: '#16dc00' },
  { oom: 17, name: 'Petafarmer III', color: '#00ec2e' },
  { oom: 18, name: 'Exafarmer', color: '#00fa68' },
  { oom: 19, name: 'Exafarmer II', color: '#0afc9c' },
  { oom: 20, name: 'Exafarmer III', color: '#1cf7ca' },
  { oom: 21, name: 'Zettafarmer', color: '#2af3eb' },
  { oom: 22, name: 'Zettafarmer II', color: '#35d9f0' },
  { oom: 23, name: 'Zettafarmer III', color: '#40bced' },
  { oom: 24, name: 'Yottafarmer', color: '#46a8eb' },
  { oom: 25, name: 'Yottafarmer II', color: '#4a9aea' },
  { oom: 26, name: 'Yottafarmer III', color: '#4e8dea' },
  { oom: 27, name: 'Xennafarmer', color: '#527ce9' },
  { oom: 28, name: 'Xennafarmer II', color: '#5463e8' },
  { oom: 29, name: 'Xennafarmer III', color: '#6155e8' },
  { oom: 30, name: 'Weccafarmer', color: '#7952e9' },
  { oom: 31, name: 'Weccafarmer II', color: '#8b4fe9' },
  { oom: 32, name: 'Weccafarmer III', color: '#9d4aeb' },
  { oom: 33, name: 'Vendafarmer', color: '#b343ec' },
  { oom: 34, name: 'Vendafarmer II', color: '#d636ef' },
  { oom: 35, name: 'Vendafarmer III', color: '#f327e5' },
  { oom: 36, name: 'Uadafarmer', color: '#f915ba' },
  { oom: 37, name: 'Uadafarmer II', color: '#fc0a9c' },
  { oom: 38, name: 'Uadafarmer III', color: '#ff007d' },
  { oom: 39, name: 'Treidafarmer', color: '#f7005d' },
  { oom: 40, name: 'Treidafarmer II', color: '#f61fd2' },
  { oom: 41, name: 'Treidafarmer III', color: '#9c4aea' },
  { oom: 42, name: 'Quadafarmer', color: '#5559e8' },
  { oom: 43, name: 'Quadafarmer II', color: '#4a9deb' },
  { oom: 44, name: 'Quadafarmer III', color: '#2df0f2' },
  { oom: 45, name: 'Pendafarmer', color: '#00f759' },
  { oom: 46, name: 'Pendafarmer II', color: '#7ec700' },
  { oom: 47, name: 'Pendafarmer III', color: '#c2bf00' },
  { oom: 48, name: 'Exedafarmer', color: '#c3a000' },
  { oom: 49, name: 'Exedafarmer II', color: '#c87200' },
  { oom: 50, name: 'Exedafarmer III', color: '#d43500' },
  { oom: 51, name: 'Infinifarmer', color: '#546e7a' },
];

export function soulPowerToFarmerRole(soulPower: number): FarmerRole {
  const oom = Math.floor(Math.max(soulPower, 0));
  // For Infinifarmer, set oom to match the soulPower.
  const role =
    oom < roles.length
      ? roles[oom]
      : {
          ...roles[roles.length - 1],
          oom,
        };
  const now = dayjs();
  const end = dayjs(1712089800 * 1000); // 24 hours later
  if (now < end) {
    const index = Math.floor(Math.random() * roles.length);
    role.color = roles[index].color;
  }
  return role;
}

export function earningBonusToFarmerRole(earningBonus: number): FarmerRole {
  return soulPowerToFarmerRole(Math.log10(earningBonus));
}
