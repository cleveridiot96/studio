
// src/components/shared/SearchBar.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchData, type SearchableItem } from '@/lib/searchEngine';
import { Input } from '@/components/ui/input';
import { Command, CommandInput, CommandList, CommandEmpty } from '@/components/ui/command';
import { Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchableItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setShowResults(false);
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
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelectResult = (item: SearchableItem) => {
    router.push(item.href);
    setQuery('');
    setResults([]);
    setIsFocused(false);
    setShowResults(false);
    if (inputRef.current) {
        inputRef.current.blur(); // Remove focus from input
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={searchContainerRef}>
      <Command className="overflow-visible bg-transparent">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <CommandInput
            ref={inputRef}
            asChild
            onValueChange={handleSearch}
            value={query}
            onFocus={() => setIsFocused(true)}
            className="w-full pl-10 pr-4 py-2 h-10 rounded-md shadow-sm border border-input bg-background" // ensure height consistency
          >
            <Input
              type="text"
              placeholder="Search anything..."
              value={query} // Controlled input
              onChange={(e) => handleSearch(e.target.value)} // Keep direct onChange for Input if needed
            />
          </CommandInput>
        </div>

        {isFocused && showResults && (
          <div className="absolute top-full mt-1.5 bg-background border border-border shadow-lg rounded-md z-50 w-full max-h-80">
            <CommandList className="overflow-y-auto">
              {results.length > 0 ? (
                results.map((item, index) => (
                  <div
                    key={item.id + '-' + index}
                    onClick={() => handleSelectResult(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectResult(item);
                      }
                    }}
                    className="p-3 hover:bg-accent cursor-pointer text-sm rounded-md mx-1 my-0.5"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.type} {item.date ? `- ${format(new Date(item.date), 'dd MMM yy')}` : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                query.trim().length > 1 && <CommandEmpty>No results found for "{query}".</CommandEmpty>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
};

export default SearchBar;
