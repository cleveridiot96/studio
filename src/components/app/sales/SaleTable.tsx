
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
import { format } from 'date-fns';
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
        <Table className="min-w-full whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Bill No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Vakkal / Lot(s)</TableHead>
              <TableHead className="text-right">Total Bags</TableHead>
              <TableHead className="text-right">Total Net Wt.(kg)</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead className="text-right">Billed Amt (₹)</TableHead>
              <TableHead className="text-right">Profit (₹)</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
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
                  className={cn(hasMultipleItems && "cursor-pointer", isExpanded && "bg-muted/50")}
                >
                  <TableCell>{format(new Date(sale.date), "dd-MM-yy")}</TableCell>
                  <TableCell>
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[100px] inline-block">{sale.billNumber || 'N/A'}</span></TooltipTrigger>
                      <TooltipContent><p>{sale.billNumber || 'N/A'}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{sale.customerName || sale.customerId}</span></TooltipTrigger>
                      <TooltipContent><p>{sale.customerName || sale.customerId}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {hasMultipleItems ? (
                        <Badge variant="outline">Multiple Items</Badge>
                      ) : (
                        <span>{sale.items[0]?.lotNumber || 'N/A'}</span>
                      )}
                      {hasMultipleItems && <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{sale.totalQuantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{sale.totalNetWeight.toLocaleString()}</TableCell>
                  <TableCell>
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[100px] inline-block">{sale.brokerName || sale.brokerId || 'N/A'}</span></TooltipTrigger>
                      <TooltipContent><p>{sale.brokerName || sale.brokerId || 'N/A'}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{(sale.billedAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                  <TableCell className={`text-right font-semibold ${(sale.totalCalculatedProfit || 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {(sale.totalCalculatedProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                <TableRow key={`${sale.id}-sub-header`} className="bg-muted/80 hover:bg-muted/80 text-xs">
                    <TableCell colSpan={3}></TableCell>
                    <TableHead className="p-2">Vakkal</TableHead>
                    <TableHead className="text-right p-2">Bags</TableHead>
                    <TableHead className="text-right p-2">Net Wt</TableHead>
                    <TableHead className="text-right p-2">Rate</TableHead>
                    <TableHead className="text-right p-2">Value</TableHead>
                    <TableCell colSpan={2}></TableCell>
                </TableRow>,
                ...sale.items.map((item, index) => (
                  <TableRow key={`${sale.id}-item-${index}`} className="bg-muted/50 hover:bg-muted/80 text-xs">
                      <TableCell colSpan={3}>{''}</TableCell>
                      <TableCell className="p-2">{item.lotNumber}</TableCell>
                      <TableCell className="text-right p-2">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right p-2">{item.netWeight.toLocaleString()}</TableCell>
                      <TableCell className="text-right p-2">{(item.rate || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                      <TableCell className="text-right p-2 font-medium">{(item.goodsValue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</TableCell>
                      <TableCell colSpan={2}>{''}</TableCell>
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
