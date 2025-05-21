// src/lib/searchEngine.ts
import Fuse from 'fuse.js';
import type { SearchableItem } from './buildSearchData'; // Assuming this type will be defined here

let fuse: Fuse<SearchableItem>;

const fuseOptions: Fuse.IFuseOptions<SearchableItem> = {
  keys: ['searchableText', 'title', 'type', 'id'], // Adjusted keys for more comprehensive search
  threshold: 0.35, // Slightly adjusted threshold
  includeScore: false, // We only need the items
  // useExtendedSearch: true, // Consider for more complex queries later
  // ignoreLocation: true, // Search anywhere in the string
  // minMatchCharLength: 2, // Minimum characters to trigger search
};

export const initSearchEngine = (data: SearchableItem[]) => {
  fuse = new Fuse(data, fuseOptions);
  console.log("Search engine initialized with", data.length, "items.");
};

export const searchData = (query: string): SearchableItem[] => {
  if (!fuse || !query.trim()) {
    return [];
  }
  const results = fuse.search(query);
  return results.map((res) => res.item);
};
