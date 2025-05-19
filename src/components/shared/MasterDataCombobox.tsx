
import * as React from "react";
import { useController, useFormContext } from "react-hook-form";
import { Command, CommandInput, CommandList, CommandEmpty } from "@/components/ui/command";
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
  const { control, setValue } // Use setValue from useFormContext if not using field.onChange
    = useFormContext(); 
  const { field } = useController({ name, control }); // field.onChange can be used

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
        <Command shouldFilter={false}>
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
                  <Button // This button is outside the scrollable list, should be fine
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onAddNew?.();
                      setOpen(false);
                      setSearch("");
                    }}
                    className="mt-2 w-full justify-start text-left p-2" // Adjusted padding for consistency
                  >
                    <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                  </Button>
                )}
              </CommandEmpty>
            ) : (
              <>
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Crucial to prevent focus loss from input
                      field.onChange(option.value); // Use field.onChange from useController
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "cursor-pointer px-2 py-1.5 text-sm hover:bg-accent flex items-center rounded-sm mx-1 my-0.5", // Style like CommandItem
                      field.value === option.value && "font-semibold bg-accent/50" // Style for selected
                    )}
                    role="option"
                    aria-selected={field.value === option.value}
                    tabIndex={0} // Make it focusable for keyboard nav if desired (cmdk usually handles this for CommandItem)
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        field.onChange(option.value);
                        setOpen(false);
                        setSearch("");
                      }
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", field.value === option.value ? "opacity-100" : "opacity-0")}
                    />
                    {option.label}
                  </div>
                ))}
              </>
            )}
            {/* "Add New" option at the bottom of the list, if onAddNew is provided */}
            {/* This ensures it's always available if not in CommandEmpty state */}
            {onAddNew && (filteredOptions.length > 0 || search.length === 0) && (
              <div
                key="add-new-action-list"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddNew?.();
                  setOpen(false);
                  setSearch("");
                }}
                className="cursor-pointer px-2 py-1.5 text-sm hover:bg-accent flex items-center rounded-sm mx-1 my-0.5 mt-1 border-t pt-1" // Style like CommandItem
                role="button" // More appropriate role
                tabIndex={0}
                 onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onAddNew?.();
                        setOpen(false);
                        setSearch("");
                      }
                    }}
              >
                <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
