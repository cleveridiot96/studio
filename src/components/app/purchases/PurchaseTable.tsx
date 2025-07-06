
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
import type { Purchase } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PurchaseTableProps {
  data: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchaseId: string) => void;
  onDownloadPdf?: (purchase: Purchase) => void;
}

const PurchaseTableComponent: React.FC<PurchaseTableProps> = ({ data, onEdit, onDelete, onDownloadPdf }) => {
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
    return <p className="text-center text-muted-foreground py-8">No purchases recorded yet.</p>;
  }

  return (
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm h-[60vh]">
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
              <TableHead className="text-right">Landed Rate (₹/kg)</TableHead>
              <TableHead className="text-right">Brokerage (₹)</TableHead>
              <TableHead className="text-right">Total Cost (₹)</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.flatMap((purchase) => {
              const hasMultipleItems = purchase.items && purchase.items.length > 1;
              const isExpanded = expandedRows.has(purchase.id);
              
              const mainRow = (
                <TableRow 
                  key={purchase.id}
                  onClick={() => hasMultipleItems && toggleRow(purchase.id)}
                  className={cn(hasMultipleItems && "cursor-pointer", isExpanded && "bg-muted/50")}
                >
                  <TableCell>{format(new Date(purchase.date), "dd-MM-yy")}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {hasMultipleItems ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1 cursor-help">
                              <span>{purchase.items[0]?.lotNumber}</span>
                              <Badge variant="secondary" className="px-1.5 py-0">+{purchase.items.length - 1}</Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <ul className="list-disc pl-4 text-sm">
                              {purchase.items.map((item, index) => (
                                <li key={index}>{item.lotNumber} ({item.quantity} bags)</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span>{purchase.items[0]?.lotNumber || 'N/A'}</span>
                      )}
                      {hasMultipleItems && <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{purchase.locationName || purchase.locationId}</span></TooltipTrigger>
                      <TooltipContent><p>{purchase.locationName || purchase.locationId}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[150px] inline-block">{purchase.supplierName || purchase.supplierId}</span></TooltipTrigger>
                      <TooltipContent><p>{purchase.supplierName || purchase.supplierId}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip><TooltipTrigger asChild><span className="truncate max-w-[120px] inline-block">{purchase.agentName || 'N/A'}</span></TooltipTrigger>
                      <TooltipContent><p>{purchase.agentName || 'N/A'}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">{purchase.totalQuantity}</TableCell>
                  <TableCell className="text-right">{purchase.totalNetWeight.toLocaleString()}</TableCell>
                   <TableCell className="text-right font-medium">
                    {(purchase.effectiveRate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </TableCell>
                  <TableCell className="text-right">{purchase.brokerageCharges?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {(purchase.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                        <DropdownMenuItem onClick={() => onEdit(purchase)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
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
              );

              const expandedSubRows = isExpanded && hasMultipleItems ? [
                <TableRow key={`${purchase.id}-sub-header`} className="bg-muted/80 hover:bg-muted/80 text-xs">
                    <TableCell colSpan={1}>{''}</TableCell>
                    <TableHead className="p-2">Vakkal</TableHead>
                    <TableCell colSpan={3}>{''}</TableCell>
                    <TableHead className="text-right p-2">Bags</TableHead>
                    <TableHead className="text-right p-2">Net Wt</TableHead>
                    <TableHead className="text-right p-2">Rate</TableHead>
                    <TableHead className="text-right p-2">Value</TableHead>
                    <TableCell colSpan={2}>{''}</TableCell>
                </TableRow>,
                ...purchase.items.map((item, index) => (
                  <TableRow key={`${purchase.id}-item-${index}`} className="bg-muted/50 hover:bg-muted/80 text-xs">
                      <TableCell colSpan={1}>{''}</TableCell>
                      <TableCell className="p-2">{item.lotNumber}</TableCell>
                      <TableCell colSpan={3}>{''}</TableCell>
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
    </TooltipProvider>
  );
}

export const PurchaseTable = React.memo(PurchaseTableComponent);
