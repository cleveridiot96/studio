
"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DataTableFilterProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  onFilterApplied: () => void;
}

export function DataTableFilter<TData, TValue>({ column, title, onFilterApplied }: DataTableFilterProps<TData, TValue>) {
  const facetedUniqueValues = column.getFacetedUniqueValues();
  const sortedUniqueValues = React.useMemo(
    () => Array.from(facetedUniqueValues.keys()).sort((a,b) => String(a).localeCompare(String(b))),
    [facetedUniqueValues]
  );
  
  const initialFilter: string[] = (column.getFilterValue() as string[] | undefined) || [];
  const [tempFilter, setTempFilter] = React.useState<string[]>(initialFilter);
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredValues = React.useMemo(() => {
      if(!searchTerm) return sortedUniqueValues;
      return sortedUniqueValues.filter(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sortedUniqueValues, searchTerm]);

  const handleSelect = (value: string) => {
    setTempFilter(prev => {
      const newFilter = new Set(prev);
      if (newFilter.has(value)) {
        newFilter.delete(value);
      } else {
        newFilter.add(value);
      }
      return Array.from(newFilter);
    });
  };

  const handleSelectAll = () => {
    setTempFilter(filteredValues);
  }

  const handleClear = () => {
    setTempFilter([]);
  }

  const handleApply = () => {
    column.setFilterValue(tempFilter.length > 0 ? tempFilter : undefined);
    onFilterApplied();
  }

  const handleCancel = () => {
    onFilterApplied();
  }

  return (
    <div className="p-2 space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
        <Input 
            placeholder={`Search ${title}...`} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
        />
      </div>
      <div className="flex justify-between items-center text-xs">
          <Button variant="link" onClick={handleSelectAll} className="p-0 h-auto">Select all</Button>
          <Button variant="link" onClick={handleClear} className="p-0 h-auto">Clear</Button>
      </div>
      <ScrollArea className="h-48 border rounded-md">
        <div className="p-1">
          {filteredValues.map((value) => {
            const isSelected = tempFilter.includes(value);
            return (
              <div
                key={value}
                onClick={() => handleSelect(value)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
              >
                <div className="w-4 h-4 border border-primary rounded-sm flex items-center justify-center">
                    {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span className="text-sm">{String(value)}</span>
              </div>
            );
          })}
          {filteredValues.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No matches found.</p>}
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleApply}>OK</Button>
      </div>
    </div>
  );
}
