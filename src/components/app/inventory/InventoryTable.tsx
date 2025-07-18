
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, MoreVertical, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AggregatedInventoryItem } from "./InventoryClient";
import { format, parseISO } from 'date-fns';

interface InventoryTableProps {
  items: AggregatedInventoryItem[];
  onArchive: (item: AggregatedInventoryItem) => void;
  onUnarchive?: (item: AggregatedInventoryItem) => void;
  isArchivedView?: boolean;
}

const InventoryTableComponent: React.FC<InventoryTableProps> = ({ items, onArchive, onUnarchive, isArchivedView = false }) => {
  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{isArchivedView ? 'NO ARCHIVED INVENTORY.' : 'NO INVENTORY FOR THIS SELECTION.'}</p>;
  }

  return (
    <ScrollArea className="h-[400px] rounded-md border print:h-auto print:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>VAKKAL/LOT</TableHead>
            <TableHead>PARTY (SUPPLIER)</TableHead>
            <TableHead>LOCATION</TableHead>
            <TableHead className="text-right">CURRENT BAGS</TableHead>
            <TableHead className="text-right">CURRENT WT (KG)</TableHead>
            <TableHead className="text-right">RATE (₹/KG)</TableHead>
            <TableHead className="text-right">COGS (₹)</TableHead>
            <TableHead>SOURCE</TableHead>
            <TableHead>LAST UPDATED</TableHead>
            <TableHead className="text-center">STATUS</TableHead>
            <TableHead className="text-center w-[80px] no-print">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={`${item.lotNumber}-${item.locationId}`}
              className={cn(
                "uppercase",
                isArchivedView ? 'bg-muted/40' : '',
                !isArchivedView && item.isDeadStock && "bg-destructive text-destructive-foreground",
                !isArchivedView && !item.isDeadStock && item.currentBags <= 0 && "bg-red-50 dark:bg-red-900/30",
                !isArchivedView && !item.isDeadStock && item.currentBags > 0 && item.currentBags <= 5 && "bg-yellow-50 dark:bg-yellow-900/30"
              )}
            >
              <TableCell>{item.lotNumber}</TableCell>
              <TableCell>{item.supplierName || 'N/A'}</TableCell>
              <TableCell>{item.locationName}</TableCell>
              <TableCell className="text-right font-medium">{Math.round(item.currentBags).toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.currentWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-right">{Math.round(item.purchaseRate).toLocaleString()}</TableCell>
              <TableCell className="text-right font-medium">{Math.round(item.cogs).toLocaleString()}</TableCell>
              <TableCell>{item.sourceType === 'Transfer' ? item.sourceDetails : 'PURCHASE'}</TableCell>
              <TableCell>{item.purchaseDate ? format(parseISO(item.purchaseDate), 'dd/MM/yy') : 'N/A'}</TableCell>
              <TableCell className="text-center">
                {isArchivedView ? (<Badge variant="outline" className="uppercase">ARCHIVED</Badge>) :
                item.isDeadStock ? (<Badge variant="destructive" className="bg-destructive text-destructive-foreground uppercase">DEAD STOCK</Badge>) :
                item.currentBags <= 0 ? (<Badge variant="destructive" className="uppercase">ZERO STOCK</Badge>) :
                item.currentBags <= 5 ? (<Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100 uppercase">LOW STOCK</Badge>) :
                (item.turnoverRate || 0) >= 75 ? (<Badge className="bg-green-500 hover:bg-green-600 text-white uppercase"><TrendingUp className="h-3 w-3 mr-1" /> FAST</Badge>) :
                (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (<Badge className="bg-orange-500 hover:bg-orange-600 text-white uppercase"><TrendingDown className="h-3 w-3 mr-1" /> SLOW</Badge>) :
                (<Badge variant="secondary" className="uppercase">IN STOCK</Badge>)}
              </TableCell>
              <TableCell className="text-center no-print">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">ACTIONS</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isArchivedView ? (
                      <DropdownMenuItem onClick={() => onUnarchive?.(item)} className="hover:!bg-green-100 dark:hover:!bg-green-800">
                        <RotateCcw className="mr-2 h-4 w-4" /> RESTORE
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onArchive(item)}
                        disabled={item.currentBags > 0}
                        className={item.currentBags <= 0 ? "hover:!bg-blue-100 dark:hover:!bg-blue-800" : ""}
                      >
                        <Archive className="mr-2 h-4 w-4" /> ARCHIVE
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
    
export const InventoryTable = React.memo(InventoryTableComponent);
