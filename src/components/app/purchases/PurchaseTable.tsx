
"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Download, ChevronDown } from "lucide-react";
import type { Purchase } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DataTableColumnHeader } from "@/components/shared/DataTableColumnHeader";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";


interface PurchaseTableProps {
  data: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchaseId: string) => void;
  onDownloadPdf?: (purchase: Purchase) => void;
}

const PurchaseTableComponent: React.FC<PurchaseTableProps> = ({ data, onEdit, onDelete, onDownloadPdf }) => {
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({...prev, [id]: !prev[id]}));
  };

  const columns: ColumnDef<Purchase>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        const hasMultipleItems = row.original.items.length > 1;
        return hasMultipleItems ? (
          <Button variant="ghost" size="icon" onClick={() => toggleRow(row.id)} className="h-6 w-6">
            <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows[row.id] && "rotate-180")} />
          </Button>
        ) : <div className="w-6 h-6"/>;
      },
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => format(parseISO(row.original.date), "dd/MM/yy"),
    },
    {
        accessorKey: 'items',
        header: 'Vakkal / Lot No.',
        cell: ({ row }) => row.original.items.map(i => i.lotNumber).join(', '),
    },
    {
        accessorKey: 'locationName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
    },
    {
        accessorKey: 'supplierName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Supplier" />,
    },
    {
        accessorKey: 'agentName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Agent" />,
    },
    {
        accessorKey: 'totalQuantity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Bags" className="justify-end"/>,
        cell: ({row}) => <div className="text-right">{Math.round(row.original.totalQuantity).toLocaleString('en-IN')}</div>
    },
    {
        accessorKey: 'totalNetWeight',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Net Wt.(kg)" className="justify-end"/>,
        cell: ({row}) => <div className="text-right">{row.original.totalNetWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
    },
    {
        accessorKey: 'totalAmount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total Cost (₹)" className="justify-end"/>,
        cell: ({row}) => <div className="text-right font-semibold">{Math.round(row.original.totalAmount).toLocaleString('en-IN')}</div>
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" /><span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />EDIT</DropdownMenuItem>
            {onDownloadPdf && <DropdownMenuItem onClick={() => onDownloadPdf(row.original)}><Download className="mr-2 h-4 w-4" />DOWNLOAD PDF</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(row.original.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />DELETE</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8 uppercase">NO PURCHASES RECORDED YET.</p>;
  }

  return (
      <DataTable
        columns={columns}
        data={data}
      />
  );
}

export const PurchaseTable = React.memo(PurchaseTableComponent);
