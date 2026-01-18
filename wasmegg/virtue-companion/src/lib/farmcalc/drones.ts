import { ei, Artifact } from 'lib';
import { droneRewardsMultiplier } from '../effects';
import { farmResearch } from './common';

// Based on @mikit's research:
// https://discord.com/channels/455380663013736479/455385659079917569/799780925793763379
export function calculateDroneValues(
  farm: ei.Backup.ISimulation,
  progress: ei.Backup.IGame,
  artifacts: Artifact[],
  params: {
    population: number;
    farmValue: number;
    rcb: number;
  }
): {
  tier1: number;
  tier1Prob: number;
  tier2: number;
  tier2Prob: number;
  tier3: number;
  tier3Prob: number;
  elite: number;
  gift: number;
} {
  const { farmValue, rcb } = params;
  const base = farmValue * rcb ** 0.5 * droneRewardsMultiplier(artifacts);
  const probMultiplier = biggerDronesProbabilityMultiplier(farm, progress);
  return {
    tier1: 0.00004 * base,
    tier1Prob: 1 - 0.1 * probMultiplier,
    tier2: 0.0002 * base,
    tier2Prob: 0.07 * probMultiplier,
    tier3: 0.001 * base,
    tier3Prob: 0.03 * probMultiplier,
    elite: 0.02 * base,
    gift: 0.005 * base,
  };
}

function biggerDronesProbabilityMultiplier(farm: ei.Backup.ISimulation, progress: ei.Backup.IGame): number {
  const research = farmResearch(farm, progress, {
    id: 'drone_rewards',
    name: 'Drone Rewards',
    maxLevel: 20,
    perLevel: 0.1,
  });
  return 1 + (research ? research.level * research.perLevel : 0);
}
