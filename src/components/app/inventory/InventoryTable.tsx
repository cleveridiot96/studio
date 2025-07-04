
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
import { Archive, Boxes, Printer, TrendingUp, TrendingDown, MoreVertical, Edit } from "lucide-react"; // Added MoreVertical, Edit
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AggregatedInventoryItem } from "./InventoryClient"; // Assuming type is exported from client

interface InventoryTableProps {
  items: AggregatedInventoryItem[];
  onArchive: (item: AggregatedInventoryItem) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ items, onArchive }) => {
  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No inventory for this selection.</p>;
  }

  return (
    <ScrollArea className="h-[400px] rounded-md border print:h-auto print:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vakkal/Lot</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Current Bags</TableHead>
            <TableHead className="text-right">Current Wt (kg)</TableHead>
            <TableHead>Last Purch.</TableHead>
            <TableHead className="text-right">Landed Cost (₹/kg)</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center w-[80px] no-print">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={`${item.lotNumber}-${item.locationId}`}
              className={cn(
                item.isDeadStock && "bg-destructive text-destructive-foreground",
                !item.isDeadStock && item.currentBags <= 0 && "bg-red-50 dark:bg-red-900/30",
                !item.isDeadStock && item.currentBags > 0 && item.currentBags <= 5 && "bg-yellow-50 dark:bg-yellow-900/30"
              )}
            >
              <TableCell>{item.lotNumber}</TableCell>
              <TableCell>{item.locationName}</TableCell>
              <TableCell className="text-right font-medium">{item.currentBags.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.currentWeight.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
              <TableCell>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell className="text-right">{item.effectiveRate ? item.effectiveRate.toFixed(2) : 'N/A'}</TableCell>
              <TableCell className="text-center">
                {item.isDeadStock ? (<Badge variant="destructive" className="bg-destructive text-destructive-foreground">Dead Stock</Badge>) :
                item.currentBags <= 0 ? (<Badge variant="destructive">Zero Stock</Badge>) :
                item.currentBags <= 5 ? (<Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100">Low Stock</Badge>) :
                (item.turnoverRate || 0) >= 75 ? (<Badge className="bg-green-500 hover:bg-green-600 text-white"><TrendingUp className="h-3 w-3 mr-1" /> Fast</Badge>) :
                (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (<Badge className="bg-orange-500 hover:bg-orange-600 text-white"><TrendingDown className="h-3 w-3 mr-1" /> Slow</Badge>) :
                (<Badge variant="secondary">In Stock</Badge>)}
              </TableCell>
              <TableCell className="text-center no-print">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onArchive(item)}
                      disabled={item.currentBags > 0}
                      className={item.currentBags <= 0 ? "hover:!bg-blue-100 dark:hover:!bg-blue-800" : ""}
                    >
                      <Archive className="mr-2 h-4 w-4" /> Archive
                    </DropdownMenuItem>
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
