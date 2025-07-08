
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { SaleReturn } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SaleReturnTableProps {
  data: SaleReturn[];
  onEdit: (saleReturn: SaleReturn) => void;
  onDelete: (saleReturnId: string) => void;
}

const SaleReturnTableComponent: React.FC<SaleReturnTableProps> = ({ data, onEdit, onDelete }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sale returns recorded yet.</p>;
  }

  return (
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm h-[60vh]">
        <Table className="min-w-full whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Original Bill No.</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Original Lot No.</TableHead>
              <TableHead className="text-right">Qty Returned</TableHead>
              <TableHead className="text-right">Wt. Returned (kg)</TableHead>
              <TableHead className="text-right">Return Value (₹)</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((sr) => (
              <TableRow key={sr.id}>
                <TableCell>{format(parseISO(sr.date), "dd/MM/yy")}</TableCell>
                <TableCell>
                  <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[120px] inline-block">{sr.originalBillNumber || sr.originalSaleId.slice(-5)}</span></TooltipTrigger>
                    <TooltipContent><p>Original Sale ID: {sr.originalSaleId}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{sr.originalCustomerName || sr.originalCustomerId}</span></TooltipTrigger>
                    <TooltipContent><p>{sr.originalCustomerName || sr.originalCustomerId}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>{sr.originalLotNumber}</TableCell>
                <TableCell className="text-right">{sr.quantityReturned.toLocaleString()}</TableCell>
                <TableCell className="text-right">{sr.netWeightReturned.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-right font-semibold">{sr.returnAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="truncate max-w-xs">
                  {sr.returnReason ? (
                    <Tooltip><TooltipTrigger asChild><span>{sr.returnReason}</span></TooltipTrigger>
                      <TooltipContent><p>{sr.returnReason}</p></TooltipContent>
                    </Tooltip>
                  ) : 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /><span className="sr-only">Actions</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(sr)} disabled> {/* Edit for returns can be complex */}
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(sr.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
};

export const SaleReturnTable = React.memo(SaleReturnTableComponent);
