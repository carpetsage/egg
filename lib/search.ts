import lunr from 'lunr';

// These words or prefix of words aren't indexed, and would cause zero matches
// if otherwise queried as required.
const searchTermIgnoreList = ['a', 'i', 'in', 'o', 'of', 't', 'th', 'the'];

// Used in combination with ui/components/BaseSelectFilterable.vue to implement
// filterable select menus.
export function useSearch<T extends object>(
  entries: T[],
  refField: keyof T & string,
  indexFields: (keyof T & string)[]
): {
  index: lunr.Index;
  search: (userQuery: string) => T[];
} {
  const index = lunr(function () {
    this.ref(refField);
    indexFields.forEach(field => this.field(field));
    entries.forEach(entry => this.add(entry));
  });

  const refEntryMap = new Map(entries.map(entry => [`${entry[refField]}`, entry]));
  const refToOriginalIndex = new Map(entries.map((entry, index) => [`${entry[refField]}`, index]));
  const refToEntry = (ref: string) => refEntryMap.get(ref)!;

  // Since lunr's wildcard doesn't match the empty string (e.g. "Simple Demeters
  // necklace" is matched by "+necklace" but not "+necklace*"), we have to search
  // twice, once with wildcard and once without, in order to return search results
  // as the user types.
  //
  // See https://github.com/olivernn/lunr.js/issues/370
  function search(userQuery: string): T[] {
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
      return fullMatches.map(result => refToEntry(result.ref));
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
    const matches = fullMatches.concat(partialFinalMatches).sort((result1, result2) => {
      // Extract prefix before the number (e.g., "word-word-word" from "word-word-word-4-epic")
      const prefixMatch1 = result1.ref.match(/^(.+)-(\d+)/);
      const prefixMatch2 = result2.ref.match(/^(.+)-(\d+)/);

      if (prefixMatch1?.at(1) === prefixMatch2?.at(1) && prefixMatch1?.at(1) !== undefined) {
        // If prefixes match, maintain original order
        const index1 = refToOriginalIndex.get(result1.ref) ?? 0;
        const index2 = refToOriginalIndex.get(result2.ref) ?? 0;
        return index1 - index2;
      }

      if (result2.score === result1.score) {
        // If scores are equal, maintain original order
        const index1 = refToOriginalIndex.get(result1.ref) ?? 0;
        const index2 = refToOriginalIndex.get(result2.ref) ?? 0;
        return index1 - index2;
      }

      // Otherwise sort by score
      return result2.score - result1.score;
    });

    const uniqueMatches = new Map(matches.map(result => [result.ref, result.score]));
    console.log('Matches:', uniqueMatches);

    // Deduplicate and keep the highest score entry of each result.
    const matchRefs = new Set(matches.map(result => result.ref));
    return [...matchRefs.entries()].map(([ref]) => refToEntry(ref));
  }

  return {
    index,
    search,
  };
}
