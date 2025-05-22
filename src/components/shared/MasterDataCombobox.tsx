
"use client";

import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Option {
  value: string;
  label: string;
  tooltipContent?: React.ReactNode; // Added for tooltip support
}

interface MasterDataComboboxProps {
  name: string;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  addNewLabel?: string;
  onAddNew?: () => void;
  disabled?: boolean;
}

export const MasterDataCombobox: React.FC<MasterDataComboboxProps> = ({
  name,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  notFoundMessage = "No match found.",
  addNewLabel = "Add New",
  onAddNew,
  disabled,
}) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() =>
    options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    ), [options, search]);

  const selectedLabel = options.find((opt) => opt.value === field.value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-sm", !field.value && "text-muted-foreground")}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false} className="max-h-[300px]">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <TooltipProvider>
            <CommandList className="max-h-[calc(300px-theme(spacing.12)-theme(spacing.2))]"> {/* Adjusted for padding */}
              {filteredOptions.length === 0 && search.length > 0 ? (
                <CommandEmpty>
                  {notFoundMessage}
                  {onAddNew && (
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
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
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            field.onChange(option.value);
                            setOpen(false);
                            setSearch("");
                          }}
                          className={cn(
                            "cursor-pointer px-4 py-2 hover:bg-accent flex items-center text-sm w-full",
                            field.value === option.value && "font-semibold"
                          )}
                          role="option"
                          aria-selected={field.value === option.value}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", field.value === option.value ? "opacity-100" : "opacity-0")}
                          />
                          <span className="flex-grow truncate">{option.label}</span>
                        </div>
                      </TooltipTrigger>
                      {option.tooltipContent && (
                        <TooltipContent side="right" align="start" className="z-[99999]"> {/* Ensure tooltip is on top */}
                          {option.tooltipContent}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                  {onAddNew && (filteredOptions.length > 0 || search.length === 0) && (
                    <div
                       onMouseDown={(e) => {
                        e.preventDefault();
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
