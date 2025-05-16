
import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Plus, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
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

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredOptions.length === 0 && search.length > 0 ? (
              <CommandEmpty className="py-3">
                {notFoundMessage} {onAddNew ? 'Try adding a new one below.' : ''}

                )}
              </CommandEmpty>
            ) : (
              <>
                {/* Use a div with onMouseDown for options to fix selection issue */}
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={field.value === option.value}
                    onMouseDown={(e) => { // Use onMouseDown to prevent blur
                      e.preventDefault(); // Prevent blur before click
                      field.onChange(option.value); // Set value directly from option
                      setOpen(false);
                      setSearch(""); // Reset search on select
                    }}
                    className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground",
                      field.value === option.value && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", field.value === option.value ? "opacity-100" : "opacity-0")}
                    />
                    {option.label}                    
                  </div>
                ))}
                {/* Ensure "Add New" is consistently available if onAddNew is provided */}
                {onAddNew && (
                  <CommandItem
                    key="add-new-action"
                    value={`__add_new_${name}__`} // A unique value to differentiate from data options
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent blur before click
                      onAddNew?.();
                      setOpen(false);
                    }}
                    className="cursor-pointer mt-1 border-t pt-1 flex items-center"
                  >
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
