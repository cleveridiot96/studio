
"use client";

import * as React from "react";
import { Command, CommandInput, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Fuse from 'fuse.js';
import didYouMean from 'didyoumean2';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface Option {
  value: string;
  label: string;
  tooltipContent?: React.ReactNode;
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

  const handleSelect = (selectedValue: string | undefined) => {
    onChange(selectedValue);
    setOpen(false);
    setSearch("");
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
      setOpen(false);
      setSearch("");
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
          />
          <TooltipProvider>
            <CommandList className="max-h-[calc(300px-theme(spacing.12)-theme(spacing.2))]">
                <div
                    onClick={() => handleSelect(undefined)}
                    className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                        !value && "font-semibold bg-accent"
                    )}
                    role="option"
                    aria-selected={!value}
                >
                    <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    <span className="italic">Clear selection</span>
                </div>
                <Separator className="my-1" />

              {filteredOptions.length === 0 && search.length > 0 ? (
                <CommandEmpty>
                  {notFoundMessage}
                  {onAddNew && (
                    <div
                      onClick={handleAddNew}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      role="button"
                    >
                      <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                    </div>
                  )}
                </CommandEmpty>
              ) : (
                <>
                  {filteredOptions.map((option) => (
                    <Tooltip key={option.value} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => handleSelect(option.value)}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            value === option.value && "font-semibold"
                          )}
                          role="option"
                          aria-selected={value === option.value}
                        >
                          <Check
                              className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}
                          />
                          <span className="flex-grow truncate">{option.label}</span>
                        </div>
                      </TooltipTrigger>
                      {option.tooltipContent && (
                        <TooltipContent side="right" align="start">
                          {option.tooltipContent}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                  {onAddNew && (
                    <div
                        onClick={handleAddNew}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground mt-1 border-t"
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
