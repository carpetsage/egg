import { ei, MissionType } from 'lib';

export function missionDurationTypeFgClass(mission: MissionType): string {
  switch (mission.durationType) {
    case ei.MissionInfo.DurationType.TUTORIAL:
    case ei.MissionInfo.DurationType.SHORT:
      return 'text-blue-500';
    case ei.MissionInfo.DurationType.LONG:
      return 'text-purple-500';
    case ei.MissionInfo.DurationType.EPIC:
      return 'text-yellow-500';
    default:
      return '';
  }
}

export function missionDurationTypeBgClass(mission: MissionType): string {
  switch (mission.durationType) {
    case ei.MissionInfo.DurationType.TUTORIAL:
    case ei.MissionInfo.DurationType.SHORT:
      return 'bg-blue-500';
    case ei.MissionInfo.DurationType.LONG:
      return 'bg-purple-500';
    case ei.MissionInfo.DurationType.EPIC:
      return 'bg-yellow-500';
    default:
      return '';
  }
}

export function artifactRarityFgClass(afxRarity: ei.ArtifactSpec.Rarity): string {
  switch (afxRarity) {
    case ei.ArtifactSpec.Rarity.COMMON:
      return '';
    case ei.ArtifactSpec.Rarity.RARE:
      return 'text-rare';
    case ei.ArtifactSpec.Rarity.EPIC:
      return 'text-epic';
    case ei.ArtifactSpec.Rarity.LEGENDARY:
      return 'text-legendary';
  }
}

export function artifactRarityBgClass(afxRarity: ei.ArtifactSpec.Rarity): string {
  switch (afxRarity) {
    case ei.ArtifactSpec.Rarity.COMMON:
      return '';
    case ei.ArtifactSpec.Rarity.RARE:
      return 'bg-rare';
    case ei.ArtifactSpec.Rarity.EPIC:
      return 'bg-epic';
    case ei.ArtifactSpec.Rarity.LEGENDARY:
      return 'bg-legendary';
  }
}

export function formatLaunchPoints(x: number): string {
  if (x.toFixed(1).endsWith('.0')) {
    return x.toFixed(0);
  } else {
    return x.toFixed(1);
  }
}
