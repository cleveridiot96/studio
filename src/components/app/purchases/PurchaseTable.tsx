
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

  const columns: ColumnDef<Purchase>[] = React.useMemo(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        const hasMultipleItems = row.original.items.length > 1;
        return hasMultipleItems ? (
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleRow(row.original.id); }} className="h-6 w-6">
            <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows[row.original.id] && "rotate-180")} />
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
        id: 'items',
        header: 'Vakkal / Lot No.',
        accessorFn: row => row.items.map(i => i.lotNumber).join(', '),
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
  ], [expandedRows, onEdit, onDelete, onDownloadPdf]);

  const renderRowSubComponent = React.useCallback(
    ({ row }: { row: any }) => {
      const purchase = row.original as Purchase;
      if (!expandedRows[purchase.id] || purchase.items.length <= 1) return null;
      return (
        <tr className="bg-purple-50 dark:bg-purple-900/40">
          <td colSpan={columns.length} className="p-0">
             <div className="p-2">
                <Table size="sm">
                  <TableHeader>
                    <TableRow className="text-xs hover:bg-purple-100/50 dark:hover:bg-purple-800/50">
                      <TableHead>VAKKAL</TableHead>
                      <TableHead className="text-right">BAGS</TableHead>
                      <TableHead className="text-right">NET WT</TableHead>
                      <TableHead className="text-right">RATE</TableHead>
                      <TableHead className="text-right">GOODS VALUE</TableHead>
                      <TableHead className="text-right">LANDED COST/KG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.items.map((item, index) => (
                      <TableRow key={index} className="text-xs hover:bg-purple-100/50 dark:hover:bg-purple-800/50">
                        <TableCell className="font-medium">{item.lotNumber}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.netWeight.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.rate.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.goodsValue.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{item.landedCostPerKg.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
          </td>
        </tr>
      );
    },
    [expandedRows, columns.length]
  );

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8 uppercase">NO PURCHASES RECORDED YET.</p>;
  }

  return (
      <DataTable
        columns={columns}
        data={data}
        renderRowSubComponent={renderRowSubComponent}
        getRowId={(row) => row.id}
      />
  );
}

export const PurchaseTable = React.memo(PurchaseTableComponent);
