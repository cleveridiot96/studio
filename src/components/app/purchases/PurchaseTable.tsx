
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
import type { Purchase } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PurchaseTableProps {
  data: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchaseId: string) => void;
  onDownloadPdf?: (purchase: Purchase) => void; // New prop
}

const PurchaseTableComponent: React.FC<PurchaseTableProps> = ({ data, onEdit, onDelete, onDownloadPdf }) => {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No purchases recorded yet.</p>;
  }

  const handlePrintChitti = (purchase: Purchase) => {
    console.log('Print Chitti (Purchase) clicked for ID:', purchase.id);
    // For actual individual chitti printing, you'd likely open a new route or modal
    // with the specific purchase details formatted for A5.
    // For now, it triggers the browser print for the whole page.
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
              <TableHead className="text-center w-[80px]">Actions</TableHead>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(purchase)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrintChitti(purchase)}>
                        <Printer className="mr-2 h-4 w-4" />
                        <span>Print Chitti</span>
                      </DropdownMenuItem>
                      {onDownloadPdf && (
                        <DropdownMenuItem onClick={() => onDownloadPdf(purchase)}>
                          <Download className="mr-2 h-4 w-4" />
                          <span>Download PDF</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(purchase.id)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
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

export const PurchaseTable = React.memo(PurchaseTableComponent);
