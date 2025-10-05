
"use client";

import * as React from "react";
import {
  Archive,
  MoreVertical,
  RotateCcw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { format, parseISO } from 'date-fns';

import { cn } from "@/lib/utils";
import type { AggregatedInventoryItem } from "./InventoryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/shared/DataTable";
import { DataTableColumnHeader } from "@/components/shared/DataTableColumnHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface InventoryTableProps {
  items: AggregatedInventoryItem[];
  onArchive: (item: AggregatedInventoryItem) => void;
  onUnarchive?: (item: AggregatedInventoryItem) => void;
  isArchivedView?: boolean;
  lowStockThreshold: number;
  rowSelection: Record<string, boolean>;
  setRowSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const InventoryTableComponent: React.FC<InventoryTableProps> = ({ 
    items, 
    onArchive, 
    onUnarchive, 
    isArchivedView = false, 
    lowStockThreshold,
    rowSelection,
    setRowSelection,
}) => {

  const columns = React.useMemo<ColumnDef<AggregatedInventoryItem>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
          disabled={isArchivedView ? false : row.original.currentBags > 0.001}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'lotNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Vakkal/Lot" />,
      cell: ({ row }) => row.original.lotNumber,
    },
    {
      accessorKey: 'supplierName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
      cell: ({ row }) => row.original.supplierName || 'N/A',
    },
     {
      accessorKey: 'locationName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
    },
    {
      accessorKey: 'currentBags',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Current Bags" className="justify-end"/>,
      cell: ({ row }) => <div className="text-right font-medium">{Math.round(row.original.currentBags).toLocaleString()}</div>
    },
    {
      accessorKey: 'currentWeight',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Current Wt (kg)" className="justify-end"/>,
      cell: ({ row }) => <div className="text-right">{row.original.currentWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    },
    {
      accessorKey: 'effectiveRate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rate (₹/kg)" className="justify-end"/>,
      cell: ({ row }) => <div className="text-right">{Math.round(row.original.effectiveRate).toLocaleString()}</div>
    },
    {
      accessorKey: 'cogs',
      header: ({ column }) => <DataTableColumnHeader column={column} title="COGS (₹)" className="justify-end"/>,
      cell: ({ row }) => <div className="text-right font-medium">{Math.round(row.original.cogs).toLocaleString()}</div>
    },
    {
      accessorKey: 'purchaseDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Updated" />,
      cell: ({ row }) => row.original.purchaseDate ? format(parseISO(row.original.purchaseDate), 'dd/MM/yy') : 'N/A',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-center">
            {isArchivedView ? (<Badge variant="outline" className="uppercase">ARCHIVED</Badge>) :
            item.isDeadStock ? (<Badge variant="destructive" className="bg-destructive text-destructive-foreground uppercase">DEAD STOCK</Badge>) :
            item.currentBags <= 0 ? (<Badge variant="destructive" className="uppercase animate-pulse-destructive">ZERO STOCK</Badge>) :
            item.currentBags <= lowStockThreshold ? (<Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100 uppercase">LOW STOCK</Badge>) :
            (item.turnoverRate || 0) >= 75 ? (<Badge className="bg-green-500 hover:bg-green-600 text-white uppercase"><TrendingUp className="h-3 w-3 mr-1" /> FAST</Badge>) :
            (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (<Badge className="bg-orange-500 hover:bg-orange-600 text-white uppercase"><TrendingDown className="h-3 w-3 mr-1" /> SLOW</Badge>) :
            (<Badge variant="secondary" className="uppercase">IN STOCK</Badge>)}
          </div>
        )
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /><span className="sr-only">Actions</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isArchivedView ? (
                <DropdownMenuItem onClick={() => onUnarchive?.(row.original)} className="hover:!bg-green-100 dark:hover:!bg-green-800">
                  <RotateCcw className="mr-2 h-4 w-4" /> RESTORE
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onArchive(row.original)} disabled={row.original.currentBags > 0.001} className={row.original.currentBags <= 0 ? "hover:!bg-blue-100 dark:hover:!bg-blue-800" : ""}>
                  <Archive className="mr-2 h-4 w-4" /> ARCHIVE
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [isArchivedView, lowStockThreshold, onArchive, onUnarchive]);

  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{isArchivedView ? 'NO ARCHIVED INVENTORY.' : 'NO INVENTORY FOR THIS SELECTION.'}</p>;
  }

  return (
      <DataTable
        columns={columns}
        data={items}
        getRowId={(row) => row.key}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
      />
  );
};
    
export const InventoryTable = React.memo(InventoryTableComponent);
