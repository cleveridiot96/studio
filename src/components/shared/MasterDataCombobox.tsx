
"use client";

import * as React from "react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, ChevronsUpDown, Pencil } from "lucide-react";
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
  onEdit?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  triggerId?: string;
}

export const MasterDataCombobox: React.FC<MasterDataComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = "SELECT AN OPTION",
  searchPlaceholder = "SEARCH...",
  notFoundMessage = "NO MATCH FOUND.",
  addNewLabel = "ADD NEW",
  onAddNew,
  onEdit,
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

  const { filteredOptions, suggestion } = React.useMemo(() => {
    if (!search) {
      return { filteredOptions: options, suggestion: null };
    }
    const fuseResults = fuse.search(search);
    const filtered = fuseResults.map(result => result.item);
    
    let suggestion: string | null = null;
    if (fuseResults.length === 0) {
      const didYouMeanSuggestion = didYouMean(search, options.map(opt => opt.label), {
        threshold: 0.6,
        caseSensitive: false,
      });
      suggestion = Array.isArray(didYouMeanSuggestion) ? didYouMeanSuggestion[0] : didYouMeanSuggestion;
    }

    return { filteredOptions: filtered, suggestion };
  }, [options, search, fuse]);

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
  
  const handleEdit = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(value);
      setOpen(false);
      setSearch("");
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearch(suggestion);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-sm uppercase h-9", !value && "text-muted-foreground", className)}
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
                <CommandItem
                    onSelect={() => handleSelect(undefined)}
                     className={cn(
                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                        !value && "font-semibold bg-accent"
                    )}
                >
                    <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    <span className="italic">CLEAR SELECTION</span>
                </CommandItem>
                <Separator className="my-1" />

              {filteredOptions.length === 0 && search.length > 0 ? (
                <CommandEmpty>
                  {notFoundMessage}
                  {suggestion && (
                      <div className="mt-1 text-xs text-muted-foreground">
                          Did you mean: <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleSuggestionClick(suggestion)}>{suggestion}</Button>?
                      </div>
                  )}
                  {onAddNew && (
                    <CommandItem onSelect={handleAddNew} className="cursor-pointer mt-2 border-t">
                      <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                    </CommandItem>
                  )}
                </CommandEmpty>
              ) : (
                <>
                  {filteredOptions.map((option) => (
                    <Tooltip key={option.value} delayDuration={300}>
                      <TooltipTrigger asChild>
                        <CommandItem
                          value={option.value}
                          onSelect={() => handleSelect(option.value)}
                          className="uppercase"
                        >
                          <Check
                              className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}
                          />
                          <span className="flex-grow truncate">{option.label}</span>
                          {onEdit && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 ml-2 rounded-md p-1 opacity-50 hover:opacity-100"
                                onClick={(e) => handleEdit(e, option.value)}
                                aria-label={`EDIT ${option.label}`}
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </CommandItem>
                      </TooltipTrigger>
                      {option.tooltipContent && (
                        <TooltipContent side="right" align="start">
                          {option.tooltipContent}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                  {onAddNew && (
                    <CommandItem onSelect={handleAddNew} className="cursor-pointer mt-1 border-t">
                      <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                    </CommandItem>
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
