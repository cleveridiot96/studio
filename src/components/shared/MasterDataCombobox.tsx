
import * as React from "react";
import { useFormContext } from "react-hook-form";
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
  name: string; // react-hook-form field name
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
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const { watch, setValue } = useFormContext(); // Use watch and setValue from useFormContext
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
        <Command shouldFilter={false}> {/* Manual filtering is done via filteredOptions */}
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
                  <Button // Using a Button for better semantics and accessibility here
                    variant="ghost"
                    size="sm"
                    onClick={() => { // Changed from onMouseDown to onClick for Button
                      if (onAddNew) onAddNew();
                      setOpen(false);
                      setSearch("");
                    }}
                    className="mt-2 w-full justify-start text-left"
                  >
                    <Plus className="h-4 w-4 mr-2" /> {addNewLabel}
                  </Button>
                )}
              </CommandEmpty>
            ) : (
              filteredOptions.map((option) => (
                // Using div with onMouseDown as per user's "Final Bulletproof Fix"
                <div
                  key={option.value}
                  onMouseDown={(e) => { // Using onMouseDown as specifically requested
                    e.preventDefault(); // Prevent focus loss from input
                    setValue(name, option.value, { shouldValidate: true });
                    setOpen(false);
                    setSearch(""); // Reset search on select
                  }}
                  className={cn(
                    "cursor-pointer px-4 py-2 hover:bg-accent flex items-center text-sm", // Adjusted padding to match CommandItem
                    currentValueFromForm === option.value && "font-semibold bg-accent/30"
                  )}
                  role="option"
                  aria-selected={currentValueFromForm === option.value}
                  tabIndex={0} // Make it focusable
                  onKeyDown={(e) => { // Basic keyboard support for Enter/Space
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setValue(name, option.value, { shouldValidate: true });
                      setOpen(false);
                      setSearch("");
                    }
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", currentValueFromForm === option.value ? "opacity-100" : "opacity-0")}
                  />
                  {option.label}
                </div>
              ))
            )}
            {/* "Add New" button, always available if onAddNew is provided and not already shown in CommandEmpty */}
            {onAddNew && !(filteredOptions.length === 0 && search.length > 0) && (
                 <div
                    key="add-new-action-master" // Unique key
                    onMouseDown={(e) => { // Using onMouseDown
                        e.preventDefault();
                        if (onAddNew) onAddNew();
                        setOpen(false);
                        setSearch(""); // Reset search
                    }}
                    className="cursor-pointer px-4 py-2 hover:bg-accent flex items-center text-sm mt-1 border-t" // Adjusted padding
                    role="button" // More appropriate role
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (onAddNew) onAddNew();
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
