
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
import { MoreVertical, Pencil, Trash2, Printer, Download, ChevronDown } from "lucide-react";
import type { Sale } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SaleTableProps {
  data: Sale[];
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: string) => void;
  onDownloadPdf?: (sale: Sale) => void;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}
const SaleTableComponent: React.FC<SaleTableProps> = ({ data, onEdit, onDelete, onDownloadPdf, currentPage, itemsPerPage, totalPages, goToPage, nextPage, prevPage }) => {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sales recorded yet.</p>;
  }

  return (
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm h-[60vh]">
        <Table className="min-w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="h-10 px-2">Date</TableHead>
              <TableHead className="h-10 px-2">Bill No.</TableHead>
              <TableHead className="h-10 px-2">Customer</TableHead>
              <TableHead className="h-10 px-2">Vakkal / Lot(s)</TableHead>
              <TableHead className="h-10 px-2 text-right">Bags</TableHead>
              <TableHead className="h-10 px-2 text-right">Net Wt.(kg)</TableHead>
              <TableHead className="h-10 px-2">Broker</TableHead>
              <TableHead className="h-10 px-2 text-right">Billed Amt (₹)</TableHead>
              <TableHead className="h-10 px-2 text-right">Profit (₹)</TableHead>
              <TableHead className="h-10 px-2 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.flatMap((sale) => {
              const hasMultipleItems = sale.items && sale.items.length > 1;
              const isExpanded = expandedRows.has(sale.id);
              
              const mainRow = (
                <TableRow 
                  key={sale.id}
                  onClick={() => hasMultipleItems && toggleRow(sale.id)}
                  className={cn(
                    "text-xs",
                    hasMultipleItems && "cursor-pointer bg-blue-50/50 dark:bg-blue-900/20",
                    isExpanded && "!bg-blue-100 dark:!bg-blue-900/50 font-semibold"
                  )}
                  data-state={isExpanded ? 'open' : 'closed'}
                >
                  <TableCell className="p-2">{format(parseISO(sale.date), "dd/MM/yy")}</TableCell>
                  <TableCell className="p-2">
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[100px] inline-block">{sale.billNumber || 'N/A'}</span></TooltipTrigger>
                      <TooltipContent><p>{sale.billNumber || 'N/A'}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="p-2">
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{sale.customerName || sale.customerId}</span></TooltipTrigger>
                      <TooltipContent><p>{sale.customerName || sale.customerId}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="p-2 align-top">
                    <div className="flex items-start gap-1">
                       <span className="whitespace-normal break-words">
                        {sale.items.map(i => i.lotNumber).join(', ')}
                      </span>
                      {hasMultipleItems && <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 mt-0.5 ${isExpanded ? "rotate-180" : ""}`} />}
                    </div>
                  </TableCell>
                  <TableCell className="p-2 text-right">{sale.totalQuantity.toLocaleString()}</TableCell>
                  <TableCell className="p-2 text-right">{sale.totalNetWeight.toLocaleString()}</TableCell>
                  <TableCell className="p-2">
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[100px] inline-block">{sale.brokerName || ''}</span></TooltipTrigger>
                      <TooltipContent><p>{sale.brokerName || ''}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="p-2 text-right font-semibold">{(sale.billedAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                  <TableCell className={`p-2 text-right font-semibold ${(sale.totalCalculatedProfit || 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {(sale.totalCalculatedProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </TableCell>
                  <TableCell className="p-2 text-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(sale)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
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
              );
              
              const expandedSubRows = isExpanded && hasMultipleItems ? [
                <TableRow key={`${sale.id}-sub-header`} className="bg-blue-100/50 dark:bg-blue-900/60 text-xs hover:bg-blue-100/60 dark:hover:bg-blue-900/70">
                    <TableCell className="p-1 w-10"></TableCell>
                    <TableCell className="p-1 font-semibold text-muted-foreground" colSpan={3}>Vakkal Breakdown</TableCell>
                    <TableCell className="p-1 font-semibold text-muted-foreground text-right">Bags</TableCell>
                    <TableCell className="p-1 font-semibold text-muted-foreground text-right">Net Wt</TableCell>
                    <TableCell className="p-1 font-semibold text-muted-foreground text-right">Rate</TableCell>
                    <TableCell className="p-1 font-semibold text-muted-foreground text-right">Goods Value</TableCell>
                    <TableCell className="p-1 font-semibold text-muted-foreground text-right">Profit</TableCell>
                    <TableCell className="p-1 w-10"></TableCell>
                </TableRow>,
                ...sale.items.map((item, index) => (
                  <TableRow key={`${sale.id}-item-${index}`} className="bg-blue-50 dark:bg-blue-900/40 text-xs hover:bg-blue-100/50 dark:hover:bg-blue-800/50">
                      <TableCell className="p-1"></TableCell>
                      <TableCell className="p-1 font-medium" colSpan={3}>{item.lotNumber}</TableCell>
                      <TableCell className="text-right p-1">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right p-1">{item.netWeight.toLocaleString()}</TableCell>
                      <TableCell className="text-right p-1">{(item.rate || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="text-right p-1 font-medium">{(item.goodsValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className={`text-right p-1 font-medium ${(item.itemProfit || 0) >= 0 ? 'text-green-600' : 'text-red-700'}`}>{(item.itemProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="p-1"></TableCell>
                  </TableRow>
                ))
              ] : [];
              
              return [mainRow, ...expandedSubRows];
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages}>Next</Button>
        </div>
      )}
    </TooltipProvider>
  );
}
export const SaleTable = React.memo(SaleTableComponent);
