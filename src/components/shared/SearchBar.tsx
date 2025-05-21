
// src/components/shared/SearchBar.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchData, type SearchableItem } from '@/lib/searchEngine';
import { Input } from '@/components/ui/input';
import { Command, CommandList, CommandEmpty } from '@/components/ui/command';
import { Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchableItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim().length > 1) {
      const res = searchData(value);
      setResults(res.slice(0, 10));
      setIsFocused(true);
    } else {
      setResults([]);
      setIsFocused(false);
    }
  };

  const handleSelectResult = (item: SearchableItem) => {
    router.push(item.href);
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={searchContainerRef}>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search anything..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.trim().length > 1 && setIsFocused(true)}
          className="w-full pl-10 pr-4 py-2 rounded-md shadow-sm"
        />
      </div>
      {isFocused && results.length > 0 && (
        <div className="absolute top-full mt-1.5 bg-background border border-border shadow-lg rounded-md z-50 w-full max-h-80 overflow-y-auto">
          <Command> {/* Command can still be used for structure, but items are divs */}
            <CommandList>
              {results.map((item, index) => (
                <div
                  key={item.id + '-' + index}
                  onClick={() => handleSelectResult(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectResult(item);
                    }
                  }}
                  className="p-3 hover:bg-accent cursor-pointer text-sm"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{item.type} {item.date ? `- ${format(new Date(item.date), 'dd MMM yy')}` : ''}</span>
                  </div>
                </div>
              ))}
            </CommandList>
          </Command>
        </div>
      )}
      {isFocused && query.trim().length > 1 && results.length === 0 && (
         <div className="absolute top-full mt-1.5 bg-background border border-border shadow-lg rounded-md z-50 w-full p-4">
            <CommandEmpty>No results found for "{query}".</CommandEmpty>
         </div>
      )}
    </div>
  );
};

export default SearchBar;
