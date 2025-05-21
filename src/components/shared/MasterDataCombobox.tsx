
import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from "cmdk";
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
  isLot?: boolean; // Add a prop to indicate if it's a lot combobox
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
  isLot = false, // Default to false
  disabled,
}) => {
  const { control, setValue } = useFormContext();
  const { field } = useController({ name, control }); // field.onChange can be used
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  
  // Filter for Mumbai if it's a lot combobox, then apply search filter
  const filteredOptions = React.useMemo(() => {
    const locationFilteredOptions = isLot ? options.filter((option: any) => option.location === 'Mumbai') : options;
    return locationFilteredOptions.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, isLot]);

  const selectedLabel = options.find((opt) => opt.value === field.value)?.label;
  const currentValueFromForm = field.value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          onBlur={() => setOpen(false)}
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
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredOptions.length === 0 && search.length > 0 && !onAddNew ? (
              <CommandEmpty>
                {notFoundMessage}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem // Apply the onMouseDown handler here
                    key={option.value}
                    value={option.value} // Use value for command filtering
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent the default mouse down action
                      setValue(name, option.value, { shouldValidate: true });
                      setOpen(false);
                      setSearch(""); // clear search after selection
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", currentValueFromForm === option.value ? "opacity-100" : "opacity-0")}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {/* "Add New" option at the bottom of the list, if onAddNew is provided */}
            {onAddNew && (
              <CommandItem
                key="add-new-action"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddNew?.();
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
