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
name: 'Farmer I', color:'#d43500'},
name: 'Farmer II', color:'#d14400'},
name: 'Farmer III', color:'#cd5500'},
name: 'Kilofarmer I', color:'#ca6800'},
name: 'Kilofarmer II', color:'#c77a00'},
name: 'Kilofarmer III', color:'#c58a00'},
name: 'Megafarmer I', color:'#c49400'},
name: 'Megafarmer II', color:'#c39f00'},
name: 'Megafarmer III', color:'#c3a900'},
name: 'Gigafarmer I', color:'#c2b100'},
name: 'Gigafarmer II', color:'#c2ba00'},
name: 'Gigafarmer III', color:'#c2c200'},
name: 'Terafarmer I', color:'#aec300'},
name: 'Terafarmer II', color:'#99c400'},
name: 'Terafarmer III', color:'#85c600'},
name: 'Petafarmer I', color:'#51ce00'},
name: 'Petafarmer II', color:'#16dc00'},
name: 'Petafarmer III', color:'#00ec2e'},
name: 'Exafarmer I', color:'#00fa68'},
name: 'Exafarmer II', color:'#0afc9c'},
name: 'Exafarmer III', color:'#1cf7ca'},
name: 'Zettafarmer I', color:'#2af3eb'},
name: 'Zettafarmer II', color:'#35d9f0'},
name: 'Zettafarmer III', color:'#40bced'},
name: 'Yottafarmer I', color:'#46a8eb'},
name: 'Yottafarmer II', color:'#4a9aea'},
name: 'Yottafarmer III', color:'#4e8dea'},
name: 'Xennafarmer I', color:'#527ce9'},
name: 'Xennafarmer II', color:'#5463e8'},
name: 'Xennafarmer III', color:'#6155e8'},
name: 'Weccafarmer I', color:'#7952e9'},
name: 'Weccafarmer II', color:'#8b4fe9'},
name: 'Weccafarmer III', color:'#9d4aeb'},
name: 'Vendafarmer I', color:'#b343ec'},
name: 'Vendafarmer II', color:'#d636ef'},
name: 'Vendafarmer III', color:'#f327e5'},
name: 'Uadafarmer I', color:'#f915ba'},
name: 'Uadafarmer II', color:'#fc0a9c'},
name: 'Uadafarmer III', color:'#ff007d'},
name: 'Treidafarmer', color:'#f7005d'},
name: 'Infinifarmer', color:'#546e7a'},
// ...
//
// pbpaste | perl -lape 's/\/\/ /{name:"/; s/: /",color:"/; s/$/"},/' | pbcopy

export type FarmerRole = {
  oom: number;
  name: string;
  color: string;
};

const roles: FarmerRole[] = [
  { oom: 0,  name: 'Farmer',                 color: '#ca6500'},
  { oom: 1,  name: 'Farmer II',              color: '#c77e00'},
  { oom: 2,  name: 'Farmer III',             color: '#c49300'},
  { oom: 3,  name: 'Kilofarmer',             color: '#c3ac00'},
  { oom: 4,  name: 'Kilofarmer II',          color: '#bfc200'},
  { oom: 5,  name: 'Kilofarmer III',         color: '#a9c300'},
  { oom: 6,  name: 'Megafarmer',             color: '#90c500'},
  { oom: 7,  name: 'Megafarmer II',          color: '#78c800'},
  { oom: 8,  name: 'Megafarmer III',         color: '#5fcc00'},
  { oom: 9,  name: 'Gigafarmer',             color: '#49d000'},
  { oom: 10, name: 'Gigafarmer II',          color: '#2fd600'},
  { oom: 11, name: 'Gigafarmer III',         color: '#13dd00'},
  { oom: 12, name: 'Terafarmer',             color: '#00e308'},
  { oom: 13, name: 'Terafarmer II',          color: '#00eb27'},
  { oom: 14, name: 'Terafarmer III',         color: '#00f349'},
  { oom: 15, name: 'Petafarmer',             color: '#00fa69'},
  { oom: 16, name: 'Petafarmer II',          color: '#06fe8e'},
  { oom: 17, name: 'Petafarmer III',         color: '#12fab0'},
  { oom: 18, name: 'Exafarmer',              color: '#1df6cb'},
  { oom: 19, name: 'Exafarmer II',           color: '#28f3e6'},
  { oom: 20, name: 'Exafarmer III',          color: '#32e4f0'},
  { oom: 21, name: 'Zettafarmer',            color: '#3bcaee'},
  { oom: 22, name: 'Zettafarmer II',         color: '#42b6ec'},
  { oom: 23, name: 'Zettafarmer III',        color: '#49a2eb'},
  { oom: 24, name: 'Yottafarmer',            color: '#4e8fea'},
  { oom: 25, name: 'Yottafarmer II',         color: '#517fe9'},
  { oom: 26, name: 'Yottafarmer III',        color: '#546de8'},
  { oom: 27, name: 'Xennafarmer',            color: '#555ae8'},
  { oom: 28, name: 'Xennafarmer II',         color: '#6154e8'},
  { oom: 29, name: 'Xennafarmer III',        color: '#7353e9'},
  { oom: 30, name: 'Weccafarmer',            color: '#854fe9'},
  { oom: 31, name: 'Weccafarmer II',         color: '#954bea'},
  { oom: 32, name: 'Weccafarmer III',        color: '#a945ec'},
  { oom: 33, name: 'Vendafarmer',            color: '#bf3eed'},
  { oom: 34, name: 'Vendafarmer II',         color: '#d735f0'},
  { oom: 35, name: 'Vendafarmer III',        color: '#ef2df2'},
  { oom: 36, name: 'Uadafarmer',             color: '#f522dc'},
  { oom: 37, name: 'Uadafarmer II',          color: '#f816c0'},
  { oom: 38, name: 'Uadafarmer III',         color: '#fc0ca4'},
  { oom: 39, name: 'Treidafarmer',           color: '#fe007f'},
  { oom: 40, name: 'Treidafarmer II',        color: '#f327e9'},
  { oom: 41, name: 'Treidafarmer III',       color: '#a746eb'},
  { oom: 42, name: 'Quadafarmer',            color: '#6854e8'},
  { oom: 43, name: 'Quadafarmer II',         color: '#5181e9'},
  { oom: 44, name: 'Quadafarmer III',        color: '#3dc4ee'},
  { oom: 45, name: 'Pendafarmer',            color: '#1af7c4'},
  { oom: 46, name: 'Pendafarmer II',         color: '#00f44e'},
  { oom: 47, name: 'Pendafarmer III',        color: '#1dda00'},
  { oom: 48, name: 'Exedafarmer',            color: '#75c800'},
  { oom: 49, name: 'Exedafarmer II',         color: '#c2b900'},
  { oom: 50, name: 'Exedafarmer III',        color: '#ca6500'},
  { oom: 51, name: 'Infinifarmer',           color: '#546e7a'},
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
