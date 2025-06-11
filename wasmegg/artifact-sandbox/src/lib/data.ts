import { useSearch } from 'lib';
import { ArtifactSpec } from 'lib/sandbox/schema';
import data from './data.json';
import { ItemProps } from './types';

export const artifacts = data.artifacts;
export const stones = data.stones;

export const artifactIdToArtifact = new Map(artifacts.map(artifact => [artifact.id, artifact]));
export const stoneIdToStone = new Map(stones.map(stone => [stone.id, stone]));

export function artifactFromId(id: string): ItemProps | null {
  return artifactIdToArtifact.get(id) || null;
}

export function artifactFromAfxIdLevelRarity(
  afxId: ArtifactSpec.Name,
  afxLevel: ArtifactSpec.Level,
  afxRarity: ArtifactSpec.Rarity
): ItemProps | null {
  for (const artifact of artifacts) {
    if (artifact.afxId === afxId && artifact.afxLevel === afxLevel && artifact.afxRarity === afxRarity) {
      return artifact;
    }
  }
  return null;
}

export function stoneFromId(id: string): ItemProps | null {
  return stoneIdToStone.get(id) || null;
}

export function stoneFromAfxIdLevel(afxId: ArtifactSpec.Name, afxLevel: ArtifactSpec.Level): ItemProps | null {
  for (const stone of stones) {
    if (stone.afxId === afxId && stone.afxLevel === afxLevel) {
      return stone;
    }
  }
  return null;
}

const { search: searchArtifacts } = useSearch(artifacts, 'id', ['display']);
const { search: searchStones } = useSearch(stones, 'id', ['display']);
export { searchArtifacts, searchStones };
