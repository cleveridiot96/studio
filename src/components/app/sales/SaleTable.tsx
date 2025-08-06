
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
import type { Sale } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { DataTableColumnHeader } from "@/components/shared/DataTableColumnHeader";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";


interface SaleTableProps {
  data: Sale[];
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: string) => void;
  onDownloadPdf?: (sale: Sale) => void;
}
const SaleTableComponent: React.FC<SaleTableProps> = ({ data, onEdit, onDelete, onDownloadPdf }) => {
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({...prev, [id]: !prev[id]}));
  };
  
  const columns = React.useMemo<ColumnDef<Sale>[]>(() => [
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
      accessorKey: 'billNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bill No." />,
      cell: ({ row }) => row.original.billNumber || 'N/A',
    },
    {
        accessorKey: 'customerName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    },
    {
        id: 'lots',
        header: 'Vakkal / Lot(s)',
        accessorFn: row => row.items.map(i => i.lotNumber).join(', '),
        cell: ({ row }) => row.original.items.map(i => i.lotNumber).join(', '),
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
        accessorKey: 'billedAmount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Billed Amt (₹)" className="justify-end"/>,
        cell: ({row}) => <div className="text-right font-semibold">{Math.round(row.original.billedAmount).toLocaleString('en-IN')}</div>
    },
    {
        accessorKey: 'balanceAmount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Balance (₹)" className="justify-end"/>,
        cell: ({row}) => <div className="text-right font-bold text-blue-600">{Math.round(row.original.balanceAmount || 0).toLocaleString('en-IN')}</div>
    },
     {
        accessorKey: 'totalCalculatedProfit',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Profit (₹)" className="justify-end"/>,
        cell: ({row}) => <div className={`text-right font-semibold ${Math.round(row.original.totalCalculatedProfit || 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>{Math.round(row.original.totalCalculatedProfit || 0).toLocaleString('en-IN')}</div>
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
            {onDownloadPdf && <DropdownMenuItem onClick={() => onDownloadPdf(row.original)}><Download className="mr-2 h-4 w-4" />DOWNLOAD CHITTI (PDF)</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(row.original.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />DELETE</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [expandedRows, onEdit, onDelete, onDownloadPdf]);

  const renderRowSubComponent = React.useCallback(
    ({ row }: { row: any }) => {
      const sale = row.original as Sale;
      if (!expandedRows[sale.id] || sale.items.length <= 1) return null;
      return (
        <tr className="bg-blue-50 dark:bg-blue-900/40">
          <td colSpan={columns.length} className="p-0">
             <div className="p-2">
                <Table size="sm">
                  <TableHeader>
                    <TableRow className="text-xs hover:bg-blue-100/50 dark:hover:bg-blue-800/50">
                      <TableHead>VAKKAL</TableHead>
                      <TableHead className="text-right">BAGS</TableHead>
                      <TableHead className="text-right">NET WT</TableHead>
                      <TableHead className="text-right">RATE</TableHead>
                      <TableHead className="text-right">GOODS VALUE</TableHead>
                      <TableHead className="text-right">PROFIT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map((item, index) => (
                      <TableRow key={index} className="text-xs hover:bg-blue-100/50 dark:hover:bg-blue-800/50">
                        <TableCell className="font-medium">{item.lotNumber}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.netWeight.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.rate.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.goodsValue.toFixed(2)}</TableCell>
                        <TableCell className={`text-right font-medium ${item.itemNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.itemNetProfit.toFixed(2)}
                        </TableCell>
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
    return <p className="text-center text-muted-foreground py-8 uppercase">NO SALES RECORDED YET.</p>;
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
export const SaleTable = React.memo(SaleTableComponent);
