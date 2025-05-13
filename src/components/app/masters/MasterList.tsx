// @ts-nocheck
"use client";

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Users, Truck, UserCheck, UserCog, Handshake, PackageSearch } from "lucide-react";
import type { MasterItem, MasterItemType } from "@/lib/types";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


const typeIconMap: Record<MasterItemType, React.ElementType> = {
  Customer: Users,
  Supplier: Truck,
  Agent: UserCheck,
  Transporter: UserCog,
  Broker: Handshake,
  Warehouse: PackageSearch, // Assuming Warehouse is a type of location/storage
  Item: PackageSearch, // Default or specific icon for items
};

interface MasterListProps {
  data: MasterItem[];
  itemType: MasterItemType | 'All'; // itemType can be 'All' now
  isAllItemsTab?: boolean; // Explicitly pass if this is for the "All" tab
  onEdit: (item: MasterItem) => void;
  onDelete: (item: MasterItem) => void;
}

export const MasterList: React.FC<MasterListProps> = ({ data, itemType, isAllItemsTab = false, onEdit, onDelete }) => {
  if (data.length === 0) {
    const typeLabel = itemType === 'All' ? 'items' : `${itemType.toLowerCase()}s`;
    return <p className="text-center text-muted-foreground py-8">No {typeLabel} recorded yet.</p>;
  }

  const showCommissionColumn = isAllItemsTab || itemType === 'Agent' || itemType === 'Broker';
  const showTypeColumn = isAllItemsTab;

  return (
    <ScrollArea className="rounded-md border shadow-sm max-h-[500px] min-h-[300px]">
      <Table className="min-w-full whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px] sm:w-[150px]">ID</TableHead>
            <TableHead>Name</TableHead>
            {showTypeColumn && <TableHead>Type</TableHead>}
            {showCommissionColumn && <TableHead className="text-right">Commission (%)</TableHead>}
            <TableHead className="text-center w-[100px] sm:w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const itemHasCommission = item.type === 'Agent' || item.type === 'Broker';
            const TypeIcon = typeIconMap[item.type] || PackageSearch;
            return (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                {showTypeColumn && (
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      <TypeIcon className="w-3 h-3 mr-1.5" />
                      {item.type}
                    </Badge>
                  </TableCell>
                )}
                {showCommissionColumn && (
                  <TableCell className="text-right">
                    {itemHasCommission && item.commission !== undefined 
                      ? `${item.commission.toLocaleString()}%` 
                      : 'N/A'}
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="mr-1 sm:mr-2 hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
       {data.length === 0 && (
        <div className="flex items-center justify-center h-full text-muted-foreground p-10">
          No items to display.
        </div>
      )}
    </ScrollArea>
  );
};
