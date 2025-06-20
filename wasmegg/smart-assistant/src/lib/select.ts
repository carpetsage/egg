import { allUsableItems, ei, Item, useSearch } from 'lib';

export type { Item };
export const excludableItems = allUsableItems.filter(item => item.afxType === ei.ArtifactSpec.Type.ARTIFACT);
export const itemIds = excludableItems.map(item => item.id);
export const itemIdToItem = new Map(excludableItems.map(item => [item.id, item]));

export type ItemSelectSpec = {
  id: string | null;
  rowid: string;
};

export function isListOfItemIds(x: unknown): x is string[] {
  const unknownIds = excludableItems.map(item => item.id);
  if (!Array.isArray(x)) {
    return false;
  }
  for (const el of x) {
    if (typeof el !== 'string') {
      return false;
    }
    if (!unknownIds.includes(el)) {
      return false;
    }
  }
  return true;
}

const { search: searchItems } = useSearch(excludableItems, 'id', ['display']);
export { searchItems };
