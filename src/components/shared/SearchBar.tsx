
// src/components/shared/SearchBar.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchData, type SearchableItem } from '@/lib/searchEngine';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Search as SearchIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchableItem[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const commandRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close the results list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search query changes
  useEffect(() => {
    if (query.trim().length > 1) {
      const res = searchData(query);
      setResults(res.slice(0, 10)); // Limit to top 10 results
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSelectResult = (itemHref: string) => {
    router.push(itemHref);
    setQuery('');
    setOpen(false);
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md flex-shrink min-w-0" ref={commandRef}>
      <Command className="overflow-visible bg-transparent">
        <div className="relative rounded-md border border-input shadow-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <CommandInput
            value={query}
            onValueChange={setQuery}
            onFocus={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search anything..."
            className="w-full pl-10 pr-4 h-10 border-none focus:ring-0 bg-transparent"
          />
        </div>
        
        {open && query.length > 1 && (
          <div className="absolute top-full mt-1.5 bg-background border border-border shadow-lg rounded-md z-50 w-full">
            <CommandList>
              {results.length > 0 ? (
                results.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.type} ${item.id}`} // Give cmdk a unique value string to work with
                    onSelect={() => handleSelectResult(item.href)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.type} {item.date ? `- ${format(parseISO(item.date), 'dd/MM/yy')}` : ''}
                      </span>
                    </div>
                  </CommandItem>
                ))
              ) : (
                <CommandEmpty>No results found for "{query}".</CommandEmpty>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
};

export default SearchBar;
