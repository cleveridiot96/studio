
// src/lib/searchEngine.ts
import Fuse from 'fuse.js';
import type { SearchableItem } from './buildSearchData'; // Assuming this type will be defined here

let fuse: Fuse<SearchableItem>;

const fuseOptions: Fuse.IFuseOptions<SearchableItem> = {
  keys: [
      { name: 'title', weight: 0.4 },
      { name: 'searchableText', weight: 0.3 },
      { name: 'type', weight: 0.2 },
      { name: 'id', weight: 0.1 },
  ],
  threshold: 0.4, // Adjusted for better fuzzy matching
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
  // Normalize query to handle variations like G.G, G G etc.
  // This simple normalization helps a lot, more complex logic can be added.
  const normalizedQuery = query.replace(/[\s.]+/g, '');

  const results = fuse.search(normalizedQuery);
  return results.map((res) => res.item);
};
