// src/components/shared/SearchBar.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchData, type SearchableItem } from '@/lib/searchEngine';
import { Command, CommandInput, CommandList, CommandEmpty } from '@/components/ui/command';
import { Search as SearchIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { FuseResult } from 'fuse.js';

const HighlightedText: React.FC<{ text: string; indices: readonly [number, number][] }> = ({ text, indices }) => {
  if (!indices || indices.length === 0) {
    return <>{text}</>;
  }

  const parts = [];
  let lastIndex = 0;

  indices.forEach(([start, end], i) => {
    // Add the part of the string before the highlight
    if (start > lastIndex) {
      parts.push(text.substring(lastIndex, start));
    }
    // Add the highlighted part
    parts.push(<mark key={i} className="bg-yellow-300 text-black rounded-sm px-0.5">{text.substring(start, end + 1)}</mark>);
    lastIndex = end + 1;
  });

  // Add the remaining part of the string
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};


const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FuseResult<SearchableItem>[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const commandRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close the results list
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setTimeout(() => { // Use timeout to allow link click to register
            setOpen(false);
        }, 150);
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

  const handleSelectResult = (href: string) => {
    router.push(href);
    setQuery('');
    setOpen(false);
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const getBestMatch = (item: FuseResult<SearchableItem>): { text: string; indices: readonly [number, number][] } => {
      const titleMatch = item.matches?.find(m => m.key === 'title');
      if (titleMatch) {
          return { text: titleMatch.value!, indices: titleMatch.indices };
      }
      const searchableTextMatch = item.matches?.find(m => m.key === 'searchableText');
      if (searchableTextMatch) {
           // As searchableText is not for display, we return the title but highlight based on where match was found
           return { text: item.item.title, indices: [] }; // Cannot highlight if match is not in title
      }
      return { text: item.item.title, indices: [] };
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
                results.map((result) => {
                    const { item } = result;
                    const bestMatch = getBestMatch(result);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            passHref
                            legacyBehavior
                        >
                            <a
                                onClick={() => handleSelectResult(item.href)}
                                className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                )}
                            >
                                <div className="flex flex-col uppercase">
                                    <span className="font-medium">
                                       <HighlightedText text={bestMatch.text} indices={bestMatch.indices} />
                                    </span>
                                    <span className="text-xs text-muted-foreground uppercase">
                                        {item.type} {item.date ? `- ${format(parseISO(item.date), 'dd/MM/yy')}` : ''}
                                    </span>
                                </div>
                            </a>
                        </Link>
                    )
                })
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
