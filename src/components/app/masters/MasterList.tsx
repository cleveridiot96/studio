
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
import { Pencil, Trash2, Users, Truck, UserCheck, UserCog, Handshake, Building, Lock, DollarSign } from "lucide-react";
import type { MasterItem, MasterItemType } from "@/lib/types";
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


const typeIconMap: Record<MasterItemType, React.ElementType> = {
  Customer: Users,
  Supplier: Truck,
  Agent: UserCheck,
  Transporter: UserCog,
  Broker: Handshake,
  Warehouse: Building,
  Expense: DollarSign,
};


interface MasterListProps {
  data: MasterItem[];
  itemType: MasterItemType | 'All';
  isAllItemsTab?: boolean;
  onEdit: (item: MasterItem) => void;
  onDelete: (item: MasterItem) => void;
  fixedItemIds?: string[];
}

const MasterListComponent: React.FC<MasterListProps> = ({ data, itemType, isAllItemsTab = false, onEdit, onDelete, fixedItemIds = [] }) => {
  if (!data || data.length === 0) {
    const typeLabel = itemType === 'All' ? 'parties/entities' : `${itemType.toLowerCase()}s`;
    return <p className="text-center text-muted-foreground py-8">No {typeLabel} recorded yet.</p>;
  }

  const uniqueMasters = React.useMemo(() => {
    if (!data) return [];
    return Array.from(new Map(data.map(item => [item.id, item])).values());
  }, [data]);


  const showCommissionColumn = isAllItemsTab || itemType === 'Agent' || itemType === 'Broker';
  const showBalanceColumn = isAllItemsTab || !['Warehouse', 'Expense'].includes(itemType);
  const showTypeColumn = isAllItemsTab;


  return (
    <TooltipProvider>
    <ScrollArea className="rounded-md border shadow-sm h-[70vh] print:h-auto print:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap p-2">Name</TableHead>
            {showTypeColumn && <TableHead className="whitespace-nowrap p-2">Type</TableHead>}
            {showCommissionColumn && <TableHead className="text-right whitespace-nowrap p-2">Commission (%)</TableHead>}
            {showBalanceColumn && <TableHead className="text-right whitespace-nowrap p-2">Opening Balance (₹)</TableHead>}
            <TableHead className="text-center w-[100px] sm:w-[120px] whitespace-nowrap p-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {uniqueMasters.map((item) => {
            const itemHasCommission = item.type === 'Agent' || item.type === 'Broker';
            const itemHasBalance = !['Warehouse', 'Expense'].includes(item.type);
            const TypeIcon = typeIconMap[item.type] || Users;
            const isFixed = fixedItemIds.includes(item.id);
            return (
              <TableRow key={item.id} className="uppercase">
                <TableCell className="font-medium whitespace-nowrap p-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        {isFixed && <Lock className="h-3 w-3 inline-block mr-1.5 text-muted-foreground" />}
                        {item.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ID: {item.id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                {showTypeColumn && (
                  <TableCell className="whitespace-nowrap p-2">
                    <Badge variant="secondary" className="text-xs uppercase">
                      <TypeIcon className="w-3 h-3 mr-1.5" />
                      {item.type}
                    </Badge>
                  </TableCell>
                )}
                {showCommissionColumn && (
                  <TableCell className="text-right whitespace-nowrap p-2">
                    {itemHasCommission && item.commission !== undefined
                      ? `${item.commission.toLocaleString()}%`
                      : ''}
                  </TableCell>
                )}
                {showBalanceColumn && (
                  <TableCell className="text-right whitespace-nowrap p-2">
                    {itemHasBalance && item.openingBalance && item.openingBalance > 0
                      ? `${item.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${item.openingBalanceType || ''}`.trim()
                      : ''}
                  </TableCell>
                )}
                <TableCell className="text-center p-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="mr-1 sm:mr-2 hover:text-primary h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="hover:text-destructive h-8 w-8" disabled={isFixed}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    {isFixed && <TooltipContent><p>This is a fixed item and cannot be deleted.</p></TooltipContent>}
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
       {uniqueMasters.length === 0 && data.length > 0 && (
        <div className="flex items-center justify-center h-full text-muted-foreground p-10">
          No unique items to display after filtering. Check for ID issues.
        </div>
      )}
      {uniqueMasters.length === 0 && data.length === 0 && (
        <div className="flex items-center justify-center h-full text-muted-foreground p-10">
          No items to display.
        </div>
      )}
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
    </TooltipProvider>
  );
};

export const MasterList = React.memo(MasterListComponent);
