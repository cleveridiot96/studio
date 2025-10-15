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
  options = [],
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

  const fuse = React.useMemo(() => {
    if (!options || options.length === 0) {
      return new Fuse([], { keys: ['label'], threshold: 0.3, includeScore: true });
    }
    return new Fuse(options, {
      keys: ['label'],
      threshold: 0.3,
      includeScore: true,
    });
  }, [options]);

  const didYouMeanSuggest = React.useMemo(() => {
    if (!search || !options || options.length === 0) return null;
    const suggestions = didYouMean(search, options.map(opt => opt.label), {
      threshold: 0.6,
      caseSensitive: false,
    });
    return Array.isArray(suggestions) ? suggestions[0] : suggestions;
  }, [search, options]);
  
  const filteredOptions = React.useMemo(() => {
    if (!options || options.length === 0) return [];
    if (!search) {
      return options;
    }
    return fuse.search(search).map(result => result.item);
  }, [options, search, fuse]);

  const selectedLabel = React.useMemo(() => {
    if (!options || !value) return undefined;
    return options.find((opt) => opt.value === value)?.label;
  }, [options, value]);

  const handleSelectOption = React.useCallback((selectedValue: string | undefined) => {
    onChange(selectedValue);
    setOpen(false);
    setSearch("");
  }, [onChange]);

  const handleAddNew = React.useCallback(() => {
    if (onAddNew) {
      onAddNew();
      setOpen(false);
      setSearch("");
    }
  }, [onAddNew]);
  
  const handleEdit = React.useCallback((e: React.MouseEvent, val: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit(val);
      setOpen(false);
      setSearch("");
    }
  }, [onEdit]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && filteredOptions.length === 0 && onAddNew) {
        handleAddNew();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          {selectedLabel && (
            <TooltipContent>
              <p>{selectedLabel}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[99999]">
        <Command shouldFilter={false} onKeyDown={handleKeyDown}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <TooltipProvider>
            <CommandList>
              <CommandItem 
                value="__clear__"
                onSelect={() => handleSelectOption(undefined)}
                className="cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground group-hover:bg-accent group-hover:text-foreground"
              >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  <span className="italic">CLEAR SELECTION</span>
              </CommandItem>
              <Separator className="my-1" />

              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <Tooltip key={option.value} delayDuration={500}>
                    <TooltipTrigger asChild>
                      <CommandItem
                        value={option.value}
                        onSelect={() => handleSelectOption(option.value)}
                        className="group uppercase flex justify-between items-center w-full cursor-pointer text-foreground/90 hover:bg-accent hover:text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <div className="flex items-center flex-grow truncate mr-2">
                          <Check className={cn("mr-2 h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                          <span className="truncate font-medium text-foreground">{option.label}</span>
                        </div>
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 p-1 opacity-0 group-hover:opacity-100"
                            onClick={(e) => handleEdit(e, option.value)}
                            aria-label={`EDIT ${option.label}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </CommandItem>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start">
                        <p>{option.label}</p>
                        {option.tooltipContent && <div>{option.tooltipContent}</div>}
                    </TooltipContent>
                  </Tooltip>
                ))
              ) : (
                !onAddNew && (
                  <CommandEmpty>
                      {notFoundMessage}
                       {didYouMeanSuggest && (
                        <div className="py-2 px-2 text-center text-xs text-muted-foreground">
                          Did you mean: <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setSearch(didYouMeanSuggest)}>{didYouMeanSuggest}</Button>?
                        </div>
                      )}
                  </CommandEmpty>
                )
              )}
                
              
              {onAddNew && (
                <CommandItem 
                  value="__add_new__"
                  onSelect={handleAddNew}
                  className="cursor-pointer mt-1 border-t aria-selected:bg-accent aria-selected:text-accent-foreground hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                </CommandItem>
              )}
            </CommandList>
          </TooltipProvider>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
