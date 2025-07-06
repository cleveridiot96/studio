
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
              <TableHead className="text-right">Rate (₹/kg)</TableHead>
              <TableHead className="text-right">Brokerage (₹)</TableHead>
              <TableHead className="text-right">Payable Value (₹)</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((purchase) => {
              const hasMultipleItems = purchase.items && purchase.items.length > 1;
              const isExpanded = expandedRows.has(purchase.id);
              const vakkalDisplay = hasMultipleItems 
                ? `${purchase.items[0].lotNumber} (+${purchase.items.length - 1})`
                : (purchase.items && purchase.items[0]?.lotNumber) || 'N/A';
              
              return (
              <React.Fragment key={purchase.id}>
                <TableRow 
                  onClick={() => hasMultipleItems && toggleRow(purchase.id)}
                  className={cn(hasMultipleItems && "cursor-pointer", isExpanded && "bg-muted/50")}
                >
                  <TableCell>{format(new Date(purchase.date), "dd-MM-yy")}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate max-w-[120px] inline-block">{vakkalDisplay}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <ul>{purchase.items && purchase.items.map(item => <li key={item.lotNumber}>{item.lotNumber} ({item.quantity} bags)</li>)}</ul>
                        </TooltipContent>
                      </Tooltip>
                      {hasMultipleItems && <ChevronDown className={`h-4 w-4 ml-1 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />}
                    </div>
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
                      <TooltipTrigger asChild><span className="truncate max-w-[120px] inline-block">{purchase.agentName || 'N/A'}</span></TooltipTrigger>
                      <TooltipContent><p>{purchase.agentName || 'N/A'}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">{purchase.totalQuantity}</TableCell>
                  <TableCell className="text-right">{purchase.totalNetWeight.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(purchase.items[0]?.rate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                  <TableCell className="text-right">{purchase.brokerageCharges?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{((purchase.totalAmount || 0) - (purchase.brokerageCharges || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Full Landed Cost (incl. all expenses): ₹{(purchase.totalAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <p>Effective Rate: ₹{(purchase.effectiveRate || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}/kg</p>
                      </TooltipContent>
                    </Tooltip>
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
                {isExpanded && hasMultipleItems && purchase.items.slice(1).map((item, index) => (
                    <TableRow key={`${purchase.id}-${item.lotNumber}`} className="bg-muted/50 hover:bg-muted/80 text-xs">
                        <TableCell /> {/* Date */}
                        <TableCell className="pl-8">↳ {item.lotNumber}</TableCell> {/* Vakkal */}
                        <TableCell /> {/* Location */}
                        <TableCell /> {/* Supplier */}
                        <TableCell /> {/* Agent */}
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell> {/* Bags */}
                        <TableCell className="text-right">{item.netWeight.toLocaleString()}</TableCell> {/* Weight */}
                        <TableCell className="text-right">{item.rate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell> {/* Rate */}
                        <TableCell colSpan={3} /> {/* Brokerage, Payable, Actions */}
                    </TableRow>
                ))}
              </React.Fragment>
            )})}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </TooltipProvider>
  );
}

export const PurchaseTable = React.memo(PurchaseTableComponent);
