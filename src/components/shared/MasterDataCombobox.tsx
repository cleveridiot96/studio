
"use client"

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, ChevronsUpDown } from "lucide-react"; // Added ChevronsUpDown for consistency
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MasterDataComboboxProps {
  name: string; // react-hook-form field name
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string; // Added from common patterns
  notFoundMessage?: string; // Added from common patterns
  addNewLabel?: string; // Added from common patterns
  onAddNew?: () => void; // For triggering "Add New" functionality
  disabled?: boolean; // Added from common patterns
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
  const [search, setSearch] = React.useState("");
  const { watch, setValue } = useFormContext();
  const currentValueFromForm = watch(name);

  const filteredOptions = React.useMemo(() =>
    options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    ), [options, search]);

  const displayLabel = options.find((opt) => opt.value === currentValueFromForm)?.label || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-sm", !currentValueFromForm && "text-muted-foreground")}
          disabled={disabled}
        >
          <span className="truncate">
            {displayLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}> {/* Manual filtering is handled by filteredOptions */}
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredOptions.length === 0 && search.length > 0 ? (
              <CommandEmpty>
                {notFoundMessage}
                {onAddNew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      if (onAddNew) onAddNew();
                    }}
                    className="mt-2 w-full justify-start text-left"
                  >
                    <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                  </Button>
                )}
              </CommandEmpty>
            ) : (
              <>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value} // This value is used by CMDK for its internal logic and passed to onSelect
                    onSelect={(currentSelectedItemValue) => {
                      setValue(name, currentSelectedItemValue, { shouldValidate: true });
                      setOpen(false);
                      setSearch(""); // Reset search on select
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentValueFromForm === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
                {/* Always show "Add New" option if onAddNew is provided, regardless of filter */}
                {onAddNew && (
                    <CommandItem
                        key="add-new-action" // Unique key
                        onSelect={() => {
                            setOpen(false);
                            if (onAddNew) onAddNew();
                            setSearch(""); // Reset search
                        }}
                        className="cursor-pointer mt-1 border-t pt-1"
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

