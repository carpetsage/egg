import { useSearch } from 'lib';
import { artifactTiers } from './artifacts';
import { missions } from './missions';
export { missions };

export const artifacts = artifactTiers.map(artifact => ({
  ...artifact,
  display: `${artifact.name} (T${artifact.tier_number})`,
}));
export const artifactIds = artifacts.map(artifact => artifact.id);
export const artifactIdToArtifact = new Map(artifacts.map(artifact => [artifact.id, artifact]));
export const missionIds = missions.map(mission => mission.missionTypeId);
export const missionIdToMission = new Map(missions.map(mission => [mission.missionTypeId, mission]));

const { search: searchArtifacts } = useSearch(artifacts, 'id', ['display']);
const { search: searchMissions } = useSearch(missions, 'missionTypeId', ['name']);
export { searchArtifacts, searchMissions };
