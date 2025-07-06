
"use client";

import * as React from "react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Fuse from 'fuse.js';
import didYouMean from 'didyoumean2';

// Note: Removed tooltips from individual items to ensure reliable keyboard/mouse selection.
// Complex nested components within cmdk items can interfere with event handling.

interface Option {
  value: string;
  label: string;
  tooltipContent?: React.ReactNode; // Kept in interface for future compatibility if a non-interfering solution is found
}

interface MasterDataComboboxProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
  disabled?: boolean;
  className?: string;
  triggerId?: string;
}

export const MasterDataCombobox: React.FC<MasterDataComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  notFoundMessage = "No match found.",
  addNewLabel = "Add New",
  onAddNew,
  disabled,
  className,
  triggerId,
}) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const fuse = React.useMemo(() => new Fuse(options, {
    keys: ['label'],
    threshold: 0.3,
  }), [options]);

  const didYouMeanSuggest = React.useMemo(() => {
    if (!search) return null;
    const suggestions = didYouMean(search, options.map(opt => opt.label), {
      threshold: 0.6,
      caseSensitive: false,
    });
    return Array.isArray(suggestions) ? suggestions[0] : suggestions;
  }, [search, options]);

  const filteredOptions = React.useMemo(() => {
    if (!search) {
      return options;
    }
    const fuseResults = fuse.search(search).map(result => result.item);
    if (typeof didYouMeanSuggest === 'string' && didYouMeanSuggest && !fuseResults.some(opt => opt.label === didYouMeanSuggest)) {
        const suggestionOption = options.find(opt => opt.label === didYouMeanSuggest);
        if (suggestionOption) {
            return [suggestionOption, ...fuseResults];
        }
    }
    return fuseResults;
  }, [options, search, fuse, didYouMeanSuggest]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (filteredOptions.length > 0) {
        // Let the default cmdk behavior handle Enter on a selected item
        return;
      }
      // If no options, but we can add new, trigger add new
      if (search.length > 0 && onAddNew) {
        e.preventDefault();
        onAddNew();
        setOpen(false);
        setSearch("");
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-sm", !value && "text-muted-foreground", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[99999]">
        <Command shouldFilter={false} className="max-h-[300px]">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            autoFocus
            onKeyDown={handleKeyDown}
          />
          <CommandList className="max-h-[calc(300px-theme(spacing.12)-theme(spacing.2))]">
            {filteredOptions.length === 0 && search.length > 0 ? (
              <CommandEmpty>
                {notFoundMessage}
                {onAddNew && (
                  <CommandItem
                    onSelect={() => {
                      onAddNew?.();
                      setOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                  </CommandItem>
                )}
              </CommandEmpty>
            ) : (
              <>
                {filteredOptions.map((option) => (
                   <CommandItem
                      key={option.value}
                      value={option.label} // Use label for cmdk internal matching
                      onSelect={() => {
                          onChange(option.value);
                          setOpen(false);
                          setSearch("");
                      }}
                      className={cn(
                        "cursor-pointer",
                        value === option.value && "font-semibold"
                      )}
                    >
                      <Check
                          className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}
                      />
                      <span className="flex-grow truncate">{option.label}</span>
                  </CommandItem>
                ))}
                {onAddNew && (
                  <CommandItem
                      onSelect={() => {
                        onAddNew?.();
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer mt-1 border-t"
                  >
                    <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                  </CommandItem>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
