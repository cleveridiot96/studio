
"use client"

import * as React from "react"
import { useFormContext } from "react-hook-form";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MasterItem } from "@/lib/types"; // Assuming MasterItem is still relevant for typing options if needed

// The options prop should be an array of objects with value and label
interface Option {
  value: string;
  label: string;
  // Optionally include original item type if needed for display or logic
  type?: string; 
}

interface MasterDataComboboxProps {
  name: string; // react-hook-form field name
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  notFoundMessage?: string;
  addNewLabel?: string;
  onAddNew?: () => void; // For triggering "Add New" functionality
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
  const [open, setOpen] = React.useState(false);
  const { watch, setValue } = useFormContext(); // Get form context
  const currentValue = watch(name); // Watch the current value of the field

  const handleSelect = (selectedValue: string) => {
    setValue(name, selectedValue, { shouldValidate: true }); // Set form value
    setOpen(false);
  };

  const displayLabel = options.find((opt) => opt.value === currentValue)?.label || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-sm", !currentValue && "text-muted-foreground")}
          disabled={disabled}
        >
          <span className="flex items-center truncate">
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>
                {notFoundMessage}
                {onAddNew && (
                  <Button variant="ghost" className="mt-1 w-full justify-start text-sm" onClick={() => { onAddNew(); setOpen(false); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {addNewLabel}
                  </Button>
                )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value} // cmdk uses this for filtering AND passes it to onSelect
                  onSelect={() => {
                    handleSelect(option.value);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", currentValue === option.value ? "opacity-100" : "opacity-0")}
                  />
                  {option.label}
                  {option.type && <span className="ml-2 text-xs text-muted-foreground">({option.type})</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            {onAddNew && (
                <>
                    <CommandSeparator />
                    <CommandGroup>
                        <CommandItem
                            onSelect={() => {
                                onAddNew();
                                setOpen(false);
                            }}
                            className="cursor-pointer"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {addNewLabel}
                        </CommandItem>
                    </CommandGroup>
                </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
