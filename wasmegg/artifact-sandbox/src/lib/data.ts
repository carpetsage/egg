import lunr from 'lunr';

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
    if (
      artifact.afxId === afxId &&
      artifact.afxLevel === afxLevel &&
      artifact.afxRarity === afxRarity
    ) {
      return artifact;
    }
  }
  return null;
}

export function stoneFromId(id: string): ItemProps | null {
  return stoneIdToStone.get(id) || null;
}

export function stoneFromAfxIdLevel(
  afxId: ArtifactSpec.Name,
  afxLevel: ArtifactSpec.Level
): ItemProps | null {
  for (const stone of stones) {
    if (stone.afxId === afxId && stone.afxLevel === afxLevel) {
      return stone;
    }
  }
  return null;
}

const artifactsSearchIndex = lunr(function () {
  this.ref('id');
  this.field('display');
  for (const artifact of artifacts) {
    this.add(artifact);
  }
});

const stonesSearchIndex = lunr(function () {
  this.ref('id');
  this.field('display');
  for (const stone of stones) {
    this.add(stone);
  }
});

// Searching functionality is copied from data.ts of loot-simulator.

// These words or prefix of words aren't indexed, and would cause zero matches
// if otherwise queried as required.
const searchTermIgnoreList = ['a', 'i', 'in', 'o', 'of', 't', 'th', 'the'];

// Since lunr's wildcard doesn't match the empty string (e.g. "Simple Demeters
// necklace" is matched by "+necklace" but not "+necklace*"), we have to search
// twice, once with wildcard and once without, in order to return search results
// as the user types.
//
// See https://github.com/olivernn/lunr.js/issues/370
function search<T>(index: lunr.Index, userQuery: string, refToItem: (ref: string) => T): T[] {
  let terms = userQuery
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(term => term.toLowerCase());
  // As long as the query doesn't end in whitespace, the final term should be
  // treated as partial (user is in the middle of typing the term).
  const partialFinal = terms[terms.length - 1] !== '';
  terms = terms.filter(term => term !== '');
  const fullMatches = index.query(query => {
    terms.forEach(term => {
      if (!searchTermIgnoreList.includes(term)) {
        query.term(term, { presence: lunr.Query.presence.REQUIRED });
      }
    });
  });
  if (!partialFinal) {
    return fullMatches.map(result => refToItem(result.ref));
  }
  const partialFinalMatches = index.query(query => {
    terms.forEach((term, index) => {
      if (index === terms.length - 1) {
        // Add a trailing wildcard to the final term, which is being typed out.
        query.term(term, {
          wildcard: lunr.Query.wildcard.TRAILING,
          presence: lunr.Query.presence.REQUIRED,
        });
      } else {
        if (!searchTermIgnoreList.includes(term)) {
          query.term(term, { presence: lunr.Query.presence.REQUIRED });
        }
      }
    });
  });
  const matches = fullMatches
    .concat(partialFinalMatches)
    .sort((result1, result2) => result2.score - result1.score);
  // Deduplicate and keep the highest score entry of each result.
  const matchRefs = new Set(matches.map(result => result.ref));
  return [...matchRefs.entries()].map(([ref]) => refToItem(ref));
}

export function searchArtifacts(userQuery: string): ItemProps[] {
  return search(artifactsSearchIndex, userQuery, ref => artifactIdToArtifact.get(ref)!);
}

export function searchStones(userQuery: string): ItemProps[] {
  return search(stonesSearchIndex, userQuery, ref => stoneIdToStone.get(ref)!);
}
