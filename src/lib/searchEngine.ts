
// src/lib/searchEngine.ts
import Fuse from 'fuse.js';
import type { FuseResult } from 'fuse.js';
import type { SearchableItem } from './buildSearchData'; // Assuming this type will be defined here

let fuse: Fuse<SearchableItem>;

const fuseOptions: Fuse.IFuseOptions<SearchableItem> = {
  keys: [
      { name: 'title', weight: 0.5 },
      { name: 'searchableText', weight: 0.3 },
      { name: 'type', weight: 0.1 },
      { name: 'id', weight: 0.1 },
  ],
  threshold: 0.5, // Loosened for more "fuzzy" results
  includeScore: true,
  includeMatches: true,
  useExtendedSearch: true,
  ignoreLocation: true,
};

export const initSearchEngine = (data: SearchableItem[]) => {
  fuse = new Fuse(data, fuseOptions);
  console.info("SEARCH ENGINE INITIALIZED/UPDATED WITH", data.length, "ITEMS.");
};

export const searchData = (query: string): FuseResult<SearchableItem>[] => {
  if (!fuse || !query.trim()) {
    return [];
  }
  // Normalize query to handle variations like G.G, G G etc.
  const normalizedQuery = query.replace(/[\s.]+/g, '').toUpperCase();

  const results = fuse.search(normalizedQuery);
  return results; // Return the full FuseResult object
};
