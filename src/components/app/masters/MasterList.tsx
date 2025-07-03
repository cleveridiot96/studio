
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
import { Pencil, Trash2, Users, Truck, UserCheck, UserCog, Handshake, Building, Lock } from "lucide-react";
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
};


interface MasterListProps {
  data: MasterItem[];
  itemType: MasterItemType | 'All';
  isAllItemsTab?: boolean;
  onEdit: (item: MasterItem) => void;
  onDelete: (item: MasterItem) => void;
  fixedWarehouseIds?: string[];
}

export const MasterList: React.FC<MasterListProps> = ({ data, itemType, isAllItemsTab = false, onEdit, onDelete, fixedWarehouseIds = [] }) => {
  if (!data || data.length === 0) {
    const typeLabel = itemType === 'All' ? 'parties/entities' : `${itemType.toLowerCase()}s`;
    return <p className="text-center text-muted-foreground py-8">No {typeLabel} recorded yet.</p>;
  }

  const uniqueMasters = React.useMemo(() => {
    if (!data) return [];
    return Array.from(new Map(data.map(item => [item.id, item])).values());
  }, [data]);


  const showCommissionColumn = isAllItemsTab || itemType === 'Agent' || itemType === 'Broker';
  const showBalanceColumn = isAllItemsTab || itemType !== 'Warehouse';
  const showTypeColumn = isAllItemsTab;


  return (
    <TooltipProvider>
    <ScrollArea className="rounded-md border shadow-sm h-[50vh] print:h-auto print:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Name</TableHead>
            {showTypeColumn && <TableHead className="whitespace-nowrap">Type</TableHead>}
            {showCommissionColumn && <TableHead className="text-right whitespace-nowrap">Commission (%)</TableHead>}
            {showBalanceColumn && <TableHead className="text-right whitespace-nowrap">Opening Balance (₹)</TableHead>}
            <TableHead className="text-center w-[100px] sm:w-[120px] whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {uniqueMasters.map((item) => {
            const itemHasCommission = item.type === 'Agent' || item.type === 'Broker';
            const itemHasBalance = item.type !== 'Warehouse';
            const TypeIcon = typeIconMap[item.type] || Users;
            const isFixedWarehouse = item.type === 'Warehouse' && fixedWarehouseIds.includes(item.id);
            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        {isFixedWarehouse && <Lock className="h-3 w-3 inline-block mr-1.5 text-muted-foreground" />}
                        {item.name}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ID: {item.id}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                {showTypeColumn && (
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="secondary" className="text-xs capitalize">
                      <TypeIcon className="w-3 h-3 mr-1.5" />
                      {item.type}
                    </Badge>
                  </TableCell>
                )}
                {showCommissionColumn && (
                  <TableCell className="text-right whitespace-nowrap">
                    {itemHasCommission && item.commission !== undefined
                      ? `${item.commission.toLocaleString()}%`
                      : 'N/A'}
                  </TableCell>
                )}
                {showBalanceColumn && (
                  <TableCell className="text-right whitespace-nowrap">
                    {itemHasBalance && item.openingBalance && item.openingBalance > 0
                      ? `${item.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${item.openingBalanceType || ''}`.trim()
                      : 'N/A'}
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="mr-1 sm:mr-2 hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="hover:text-destructive" disabled={isFixedWarehouse}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    {isFixedWarehouse && <TooltipContent><p>Fixed warehouses cannot be deleted.</p></TooltipContent>}
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
