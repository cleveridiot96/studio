
"use client";

import * as React from "react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Fuse from 'fuse.js';
import didYouMean from 'didyoumean2';


interface Option {
  value: string;
  label: string;
  tooltipContent?: React.ReactNode;
}

interface MasterDataComboboxProps {
  value: string | undefined; // Controlled component: value from parent
  onChange: (value: string | undefined) => void; // Controlled component: onChange handler from parent
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
  disabled?: boolean;
  name?: string; // Optional: for external refs or testing, but not for RHF control here
  className?: string;
  triggerId?: string;
}

export const MasterDataCombobox: React.FC<MasterDataComboboxProps> = ({
  value, // Use prop
  onChange, // Use prop
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  notFoundMessage = "No match found.",
  addNewLabel = "Add New",
  onAddNew,
  disabled,
  className,
  triggerId,
  // name prop is kept if needed for other purposes, but not for useController
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
      if (filteredOptions.length === 0 && search.length > 0 && onAddNew) {
        e.preventDefault();
        onAddNew();
        setOpen(false);
        setSearch("");
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <TooltipProvider>
            <CommandList className="max-h-[calc(300px-theme(spacing.12)-theme(spacing.2))]">
              {filteredOptions.length === 0 && search.length > 0 ? (
                <CommandEmpty>
                  {notFoundMessage}
                  {onAddNew && (
                    <div
                      onClick={() => {
                        onAddNew?.();
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer px-4 py-2 hover:bg-accent flex items-center text-sm"
                      role="button"
                    >
                      <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                    </div>
                  )}
                </CommandEmpty>
              ) : (
                <>
                  {filteredOptions.map((option) => (
                     <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => {
                            onChange(option.value);
                            setOpen(false);
                            setSearch("");
                        }}
                        className={cn(
                          "p-0 relative cursor-pointer",
                          value === option.value && "font-semibold"
                        )}
                      >
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center w-full px-4 py-2">
                                <Check
                                    className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}
                                />
                                <span className="flex-grow truncate">{option.label}</span>
                            </div>
                        </TooltipTrigger>
                        {option.tooltipContent && (
                          <TooltipContent side="right" align="start" className="z-[99999]">
                            {option.tooltipContent}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </CommandItem>
                  ))}
                  {onAddNew && (filteredOptions.length > 0 || search.length === 0) && (
                    <div
                       onClick={() => {
                        onAddNew?.();
                        setOpen(false);
                        setSearch("");
                      }}
                      className="cursor-pointer px-4 py-2 hover:bg-accent flex items-center text-sm mt-1 border-t"
                      role="button"
                    >
                      <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </TooltipProvider>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

    