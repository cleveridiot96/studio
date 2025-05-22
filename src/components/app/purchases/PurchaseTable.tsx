
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
import { Pencil, Trash2, Printer } from "lucide-react";
import type { Purchase } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PurchaseTableProps {
  data: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchaseId: string) => void;
}

const PurchaseTableComponent: React.FC<PurchaseTableProps> = ({ data, onEdit, onDelete }) => {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No purchases recorded yet.</p>;
  }

  const handlePrint = () => {
    console.log('Print Chitti (Purchases) clicked');
    window.print();
  };

  return (
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm">
        <Table className="min-w-full whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Vakkal / Lot No.</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Bags</TableHead>
              <TableHead className="text-right">Net Wt.(kg)</TableHead>
              <TableHead className="text-right">Rate (₹/kg)</TableHead>
              <TableHead className="text-right">Expenses (₹)</TableHead>
              <TableHead className="text-right">Transport (₹)</TableHead>
              <TableHead className="text-right">Net Rate (₹/kg)</TableHead>
              <TableHead className="text-right">Total Val (₹)</TableHead>
              <TableHead className="text-center w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((purchase) => (
              <TableRow key={purchase.id}>
                <TableCell>{format(new Date(purchase.date), "dd-MM-yy")}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild><span className="truncate max-w-[120px] inline-block">{purchase.lotNumber}</span></TooltipTrigger>
                    <TooltipContent><p>{purchase.lotNumber}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{purchase.locationName || purchase.locationId}</span></TooltipTrigger>
                    <TooltipContent><p>{purchase.locationName || purchase.locationId}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{purchase.supplierName || purchase.supplierId}</span></TooltipTrigger>
                    <TooltipContent><p>{purchase.supplierName || purchase.supplierId}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild><span className="truncate max-w-[120px] inline-block">{purchase.agentName || purchase.agentId || 'N/A'}</span></TooltipTrigger>
                    <TooltipContent><p>{purchase.agentName || purchase.agentId || 'N/A'}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">{purchase.quantity}</TableCell>
                <TableCell className="text-right">{purchase.netWeight.toLocaleString()}</TableCell>
                <TableCell className="text-right">{purchase.rate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-right">{(purchase.expenses || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-right">{(purchase.transportRate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-right font-medium">
                  {(purchase.effectiveRate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </TableCell>
                <TableCell className="text-right font-semibold">{purchase.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(purchase)} className="mr-1 hover:text-primary" title="Edit Purchase">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handlePrint} className="mr-1 hover:text-blue-600" title="Print Chitti">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(purchase.id)} className="hover:text-destructive" title="Delete Purchase">
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

export const PurchaseTable = React.memo(PurchaseTableComponent);

