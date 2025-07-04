
"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { PurchaseReturn } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PurchaseReturnTableProps {
  data: PurchaseReturn[];
  onEdit: (purchaseReturn: PurchaseReturn) => void;
  onDelete: (purchaseReturnId: string) => void;
}

const PurchaseReturnTableComponent: React.FC<PurchaseReturnTableProps> = ({ data, onEdit, onDelete }) => {
  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No purchase returns recorded yet.</p>;
  }

  return (
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm h-[60vh]">
        <Table className="min-w-full whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Original Lot No.</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Qty Returned</TableHead>
              <TableHead className="text-right">Wt. Returned (kg)</TableHead>
              <TableHead className="text-right">Return Value (₹)</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((pr) => (
              <TableRow key={pr.id}>
                <TableCell>{format(parseISO(pr.date), "dd-MM-yy")}</TableCell>
                <TableCell>
                  <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[120px] inline-block">{pr.originalLotNumber}</span></TooltipTrigger>
                    <TooltipContent><p>Original Purchase ID: {pr.originalPurchaseId}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{pr.originalSupplierName || pr.originalSupplierId}</span></TooltipTrigger>
                    <TooltipContent><p>{pr.originalSupplierName || pr.originalSupplierId}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">{pr.quantityReturned.toLocaleString()}</TableCell>
                <TableCell className="text-right">{pr.netWeightReturned.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-right font-semibold">{pr.returnAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="truncate max-w-xs">
                  {pr.returnReason ? (
                    <Tooltip><TooltipTrigger asChild><span>{pr.returnReason}</span></TooltipTrigger>
                      <TooltipContent><p>{pr.returnReason}</p></TooltipContent>
                    </Tooltip>
                  ) : 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /><span className="sr-only">Actions</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(pr)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDelete(pr.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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

export const PurchaseReturnTable = React.memo(PurchaseReturnTableComponent);
