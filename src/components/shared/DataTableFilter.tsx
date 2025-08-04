
"use client";

import * as React from "react";
import { Check, PlusCircle } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";

interface DataTableFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableFilter<TData, TValue>({ column, title }: DataTableFilterProps<TData, TValue>) {
  const facetedUniqueValues = column.getFacetedUniqueValues();
  const sortedUniqueValues = React.useMemo(
    () => Array.from(facetedUniqueValues.keys()).sort(),
    [facetedUniqueValues]
  );
  
  const filterValue = column.getFilterValue() as string[] | undefined;

  const handleSelect = (value: string) => {
    const newFilterValue = filterValue ? [...filterValue] : [];
    const index = newFilterValue.indexOf(value);
    if (index > -1) {
      newFilterValue.splice(index, 1);
    } else {
      newFilterValue.push(value);
    }
    column.setFilterValue(newFilterValue.length > 0 ? newFilterValue : undefined);
  };

  const handleClear = () => {
    column.setFilterValue(undefined);
  };
  
  return (
    <div className="p-2">
      <Command>
        <CommandInput placeholder={`Filter ${title}...`} className="h-9"/>
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="max-h-48">
              {sortedUniqueValues.map((value) => {
                const isSelected = filterValue?.includes(value) ?? false;
                return (
                  <CommandItem
                    key={value}
                    onSelect={() => handleSelect(value)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      id={`filter-${value}`}
                      checked={isSelected}
                      onCheckedChange={() => handleSelect(value)}
                      aria-label={`Select ${value}`}
                    />
                    <label htmlFor={`filter-${value}`} className="flex-grow cursor-pointer">{value}</label>
                  </CommandItem>
                );
              })}
            </ScrollArea>
          </CommandGroup>
          {filterValue && filterValue.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={handleClear}
                  className="justify-center text-center"
                >
                  Clear filters
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
