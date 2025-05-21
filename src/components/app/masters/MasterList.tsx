
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
import { Pencil, Trash2, Users, Truck, UserCheck, UserCog, Handshake, Building } from "lucide-react";
import type { MasterItem, MasterItemType } from "@/lib/types";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


const typeIconMap: Record<MasterItemType, React.ElementType> = {
  Customer: Users,
  Supplier: Truck,
  Agent: UserCheck,
  Transporter: UserCog,
  Broker: Handshake,
  Warehouse: Building,
};


interface MasterListProps {
  data: MasterItem[];
  itemType: MasterItemType | 'All';
  isAllItemsTab?: boolean;
  onEdit: (item: MasterItem) => void;
  onDelete: (item: MasterItem) => void;
}

export const MasterList: React.FC<MasterListProps> = ({ data, itemType, isAllItemsTab = false, onEdit, onDelete }) => {
  if (!data || data.length === 0) {
    const typeLabel = itemType === 'All' ? 'parties/entities' : `${itemType.toLowerCase()}s`;
    return <p className="text-center text-muted-foreground py-8">No {typeLabel} recorded yet.</p>;
  }

  // Corrected de-duplication logic
  const uniqueMasters = React.useMemo(() => {
    if (!data) return [];
    return Array.from(new Map(data.map(item => [item.id, item])).values());
  }, [data]);


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
          {uniqueMasters.map((item) => {
            const itemHasCommission = item.type === 'Agent' || item.type === 'Broker';
            const TypeIcon = typeIconMap[item.type] || Users; // Fallback to Users icon if type not in map
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
       {uniqueMasters.length === 0 && data.length > 0 && ( // Show this if uniqueMasters is empty but original data wasn't
        <div className="flex items-center justify-center h-full text-muted-foreground p-10">
          No unique items to display after filtering. Check for ID issues.
        </div>
      )}
      {uniqueMasters.length === 0 && data.length === 0 && ( // Original condition for no data at all
        <div className="flex items-center justify-center h-full text-muted-foreground p-10">
          No items to display.
        </div>
      )}
    </ScrollArea>
  );
};

