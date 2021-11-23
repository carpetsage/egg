import { ei } from 'lib';

import Rarity = ei.ArtifactSpec.Rarity;
import DurationType = ei.MissionInfo.DurationType;

export function rarityFgClass500(rarity: Rarity) {
  switch (rarity) {
    case Rarity.RARE:
      return 'text-blue-500';
    case Rarity.EPIC:
      return 'text-purple-500';
    case Rarity.LEGENDARY:
      return 'text-yellow-500';
    default:
      return '';
  }
}

export function rarityFgClass400(rarity: Rarity) {
  switch (rarity) {
    case Rarity.RARE:
      return 'text-blue-400';
    case Rarity.EPIC:
      return 'text-purple-400';
    case Rarity.LEGENDARY:
      return 'text-yellow-400';
    default:
      return '';
  }
}

export function durationBorderClass(durationType: DurationType) {
  switch (durationType) {
    case DurationType.SHORT:
      return 'border-blue-500';
    case DurationType.LONG:
      return 'border-purple-500';
    case DurationType.EPIC:
      return 'border-yellow-500';
    default:
      return '';
  }
}

export function capitalize(s: string): string {
  if (s === '') {
    return '';
  }
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

export function sum(arr: number[]): number {
  return arr.reduce((s, x) => s + x);
}
