
// src/lib/searchEngine.ts
import Fuse from 'fuse.js';
import type { SearchableItem } from './buildSearchData'; // Assuming this type will be defined here

let fuse: Fuse<SearchableItem>;

const fuseOptions: Fuse.IFuseOptions<SearchableItem> = {
  keys: ['searchableText', 'title', 'type', 'id'],
  threshold: 0.35,
  includeScore: false,
  useExtendedSearch: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export const initSearchEngine = (data: SearchableItem[]) => {
  fuse = new Fuse(data, fuseOptions);
  console.log("Search engine initialized/updated with", data.length, "items.");
};

export const searchData = (query: string): SearchableItem[] => {
  if (!fuse || !query.trim()) {
    return [];
  }
  const results = fuse.search(query);
  return results.map((res) => res.item);
};
