
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Command, CommandInput, CommandList, CommandEmpty } from "@/components/ui/command";
// CommandItem import is removed as it's replaced by custom divs for options
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
  const { watch, setValue } = useFormContext();
  const currentValueFromForm = watch(name);

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() =>
    options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    ), [options, search]);

  const displayLabel = options.find((opt) => opt.value === currentValueFromForm)?.label || placeholder;

  const handleAddNewClick = () => {
    if (onAddNew) {
      onAddNew();
    }
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
        <Command shouldFilter={false} className="[&_[cmdk-list]]:max-h-[250px]"> {/* Increased max height slightly */}
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredOptions.length === 0 && search.length > 0 ? (
              <CommandEmpty className="py-2 px-4 text-sm text-center"> {/* Added styling to CommandEmpty */}
                {notFoundMessage}
                {onAddNew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddNewClick}
                    className="mt-2 w-full justify-start text-left text-primary hover:text-primary"
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
                    onMouseDown={(e) => { // Using onMouseDown as per your explicit instruction
                      e.preventDefault(); 
                      setValue(name, option.value, { shouldValidate: true });
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "cursor-pointer px-4 py-2 hover:bg-accent flex items-center text-sm",
                      currentValueFromForm === option.value && "font-semibold bg-accent/30"
                    )}
                    role="option"
                    aria-selected={currentValueFromForm === option.value}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", currentValueFromForm === option.value ? "opacity-100" : "opacity-0")}
                    />
                    {option.label}
                  </div>
                ))}
              </>
            )}
            {/* "Add New" option if onAddNew is provided, shown when search is empty or when results are present */}
            {onAddNew && (
               <div
                key="add-new-action-master" // Unique key
                onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddNewClick();
                }}
                className="cursor-pointer px-4 py-2 hover:bg-accent flex items-center text-sm mt-1 border-t text-primary hover:text-primary"
                role="option"
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
