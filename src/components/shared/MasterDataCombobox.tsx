"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"
import type { LucideProps } from "lucide-react";

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { MasterItem } from "@/lib/types"

interface MasterDataComboboxProps {
  items: MasterItem[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onAddNew: () => void;
  placeholder: string;
  searchPlaceholder: string;
  notFoundMessage: string;
  addNewLabel: string;
  disabled?: boolean;
  itemIcon?: React.ComponentType<LucideProps>; // Optional icon for the item
}

export function MasterDataCombobox({
  items,
  value,
  onChange,
  onAddNew,
  placeholder,
  searchPlaceholder,
  notFoundMessage,
  addNewLabel,
  disabled,
  itemIcon: ItemIcon,
}: MasterDataComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedItem = value ? items.find((item) => item.id === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm"
          disabled={disabled}
        >
          <span className="flex items-center">
            {ItemIcon && !selectedItem && <ItemIcon className="mr-2 h-4 w-4 opacity-50" />}
            {selectedItem ? (
              <>
                {ItemIcon && <ItemIcon className="mr-2 h-4 w-4" />}
                {selectedItem.name}
              </>
            ) : (
              placeholder
            )}
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
                 <Button variant="ghost" className="mt-1 w-full justify-start text-sm" onClick={() => { onAddNew(); setOpen(false); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {addNewLabel}
                </Button>
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    onChange(item.id === value ? undefined : item.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                   {ItemIcon && <ItemIcon className="mr-2 h-4 w-4 text-muted-foreground" />}
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}