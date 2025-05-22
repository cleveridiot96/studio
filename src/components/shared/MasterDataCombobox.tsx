"use client";

import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  tooltipContent?: React.ReactNode;
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
  notFoundMessage = "No results found.",
  addNewLabel = "Add New",
  onAddNew,
  disabled = false,
}) => {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find(opt => opt.value === field.value);

  const handleSelect = (value: string) => {
    field.onChange(value);
    setOpen(false);
    setSearch("");
  };

  const handleAddNew = () => {
    onAddNew?.();
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
          disabled={disabled}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            autoFocus
          />

          <CommandList className="max-h-64 overflow-auto">
            <TooltipProvider>
              {filtered.length === 0 && search ? (
                <CommandEmpty className="p-2 text-sm">
                  {notFoundMessage}
                  {onAddNew && (
                    <div
                      onMouseDown={handleAddNew}
                      className="mt-2 flex items-center cursor-pointer text-primary hover:underline"
                    >
                      <Plus className="h-4 w-4 mr-1" /> {addNewLabel}
                    </div>
                  )}
                </CommandEmpty>
              ) : (
                <>
                  {filtered.map(opt => (
                    <Tooltip key={opt.value}>
                      <TooltipTrigger asChild>
                        <CommandItem
                          value={opt.value}
                          onMouseDown={e => {
                            e.preventDefault();
                            handleSelect(opt.value);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              opt.value === field.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">{opt.label}</span>
                        </CommandItem>
                      </TooltipTrigger>
                      {opt.tooltipContent && (
                        <TooltipContent>{opt.tooltipContent}</TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                  {onAddNew && (
                    <div
                      onMouseDown={e => {
                        e.preventDefault();
                        handleAddNew();
                      }}
                      className="mt-1 border-t pt-2 flex items-center text-sm px-4 cursor-pointer hover:bg-accent"
                    >
                      <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                    </div>
                  )}
                </>
              )}
            </TooltipProvider>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
