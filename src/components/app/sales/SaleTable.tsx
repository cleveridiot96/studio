
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
import { MoreVertical, Pencil, Trash2, Printer, Download } from "lucide-react";
import type { Sale } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SaleTableProps {
  data: Sale[];
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: string) => void;
  onDownloadPdf?: (sale: Sale) => void; // Added for specific PDF download
}

const SaleTableComponent: React.FC<SaleTableProps> = ({ data, onEdit, onDelete, onDownloadPdf }) => {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sales recorded yet.</p>;
  }

  const handleGenericPrint = () => {
    console.log('Generic Print (Sales Table) clicked');
    window.print();
  };

  return (
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm">
        <Table className="min-w-full whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Bill No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vakkal / Lot No.</TableHead>
              <TableHead className="text-right">Bags</TableHead>
              <TableHead className="text-right">Net Wt.(kg)</TableHead>
              <TableHead className="text-right">Rate (₹/kg)</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead className="text-right">Total (₹)</TableHead>
              <TableHead className="text-right">Profit (₹)</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{format(new Date(sale.date), "dd-MM-yy")}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild><span className="truncate max-w-[100px] inline-block">{sale.billNumber || 'N/A'}</span></TooltipTrigger>
                    <TooltipContent><p>{sale.billNumber || 'N/A'}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{sale.customerName || sale.customerId}</span></TooltipTrigger>
                    <TooltipContent><p>{sale.customerName || sale.customerId}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>{sale.lotNumber}</TableCell>
                <TableCell className="text-right">{sale.quantity}</TableCell>
                <TableCell className="text-right">{sale.netWeight.toLocaleString()}</TableCell>
                <TableCell className="text-right">{sale.rate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild><span className="truncate max-w-[100px] inline-block">{sale.brokerName || sale.brokerId || 'N/A'}</span></TooltipTrigger>
                    <TooltipContent><p>{sale.brokerName || sale.brokerId || 'N/A'}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right font-semibold">{(sale.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className={`text-right font-semibold ${sale.calculatedProfit !== undefined && sale.calculatedProfit < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {sale.calculatedProfit?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(sale)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleGenericPrint}>
                          <Printer className="mr-2 h-4 w-4" /> Print Page
                        </DropdownMenuItem>
                        {onDownloadPdf && (
                          <DropdownMenuItem onClick={() => onDownloadPdf(sale)}>
                            <Download className="mr-2 h-4 w-4" /> Download Chitti (PDF)
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(sale.id)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </TooltipProvider>
  );
}
export const SaleTable = React.memo(SaleTableComponent);
