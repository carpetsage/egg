// Thin shim — all algorithm logic lives in the shared lib.
import { ArtifactSet, contenderToArtifactSet, ei, Farm, Inventory, recommendArtifactSet, Strategy } from 'lib';
import type { ArtifactAssemblyStatusNonMissing } from 'lib';

export { ArtifactAssemblyStatus, Contender } from 'lib';
export type { ArtifactAssemblyStatusNonMissing } from 'lib';

// Smart assistant only uses the four prestige strategies; re-export Strategy
// under the old name so consumers don't need to change.
export { Strategy as PrestigeStrategy };

export function suggestArtifactSet(
  backup: ei.IBackup,
  strategy: Strategy,
  opts?: { excludedIds?: string[] }
): {
  artifactSet: ArtifactSet;
  assemblyStatuses: ArtifactAssemblyStatusNonMissing[];
} {
  const inventory = new Inventory(backup.artifactsDb!, {
    excludedIds: opts?.excludedIds,
  });
  const homeFarm = new Farm(backup, backup.farms![0]);
  const winner = recommendArtifactSet(backup, strategy, opts);
  return contenderToArtifactSet(winner, homeFarm.artifactSet, inventory);
}
