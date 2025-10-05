
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
import type { Purchase } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";


interface PurchaseTableProps {
  data: Purchase[];
  onEdit: (purchase: Purchase) => void;
  onDelete: (purchaseId: string) => void;
  onDownloadPdf?: (purchase: Purchase) => void;
}

const PurchaseTableComponent: React.FC<PurchaseTableProps> = ({ data, onEdit, onDelete, onDownloadPdf }) => {
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({...prev, [id]: !prev[id]}));
  };

  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8 uppercase">NO PURCHASES RECORDED YET.</p>;
  }

  return (
      <ScrollArea className="h-[65vh] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vakkal / Lot No.</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Bags</TableHead>
              <TableHead className="text-right">Net Wt.(kg)</TableHead>
              <TableHead className="text-right">Total Cost (₹)</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(purchase => (
              <React.Fragment key={purchase.id}>
                <TableRow className="uppercase">
                  <TableCell>
                    {purchase.items.length > 1 && (
                       <Button variant="ghost" size="icon" onClick={() => toggleRow(purchase.id)} className="h-6 w-6">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRows[purchase.id] && "rotate-180")} />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>{format(parseISO(purchase.date), "dd/MM/yy")}</TableCell>
                  <TableCell>{purchase.items.map(i => i.lotNumber).join(', ')}</TableCell>
                  <TableCell>{purchase.locationName}</TableCell>
                  <TableCell>{purchase.supplierName}</TableCell>
                  <TableCell>{purchase.agentName || 'N/A'}</TableCell>
                  <TableCell className="text-right">{Math.round(purchase.totalQuantity).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right">{purchase.totalNetWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-semibold">{Math.round(purchase.totalAmount).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" /><span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(purchase)}><Pencil className="mr-2 h-4 w-4" />EDIT</DropdownMenuItem>
                        {onDownloadPdf && <DropdownMenuItem onClick={() => onDownloadPdf(purchase)}><Download className="mr-2 h-4 w-4" />DOWNLOAD PDF</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(purchase.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />DELETE</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {expandedRows[purchase.id] && purchase.items.length > 1 && (
                  <TableRow className="bg-muted/50 hover:bg-muted/60">
                    <TableCell colSpan={10} className="p-0">
                       <div className="p-2">
                          <Table size="sm">
                            <TableHeader>
                              <TableRow className="text-xs hover:bg-transparent">
                                <TableHead>VAKKAL</TableHead>
                                <TableHead className="text-right">BAGS</TableHead>
                                <TableHead className="text-right">NET WT</TableHead>
                                <TableHead className="text-right">RATE</TableHead>
                                <TableHead className="text-right">GOODS VALUE</TableHead>
                                <TableHead className="text-right">LANDED COST/KG</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchase.items.map((item, index) => (
                                <TableRow key={index} className="text-xs hover:bg-transparent">
                                  <TableCell className="font-medium">{item.lotNumber}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">{item.netWeight.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{item.rate.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{Math.round(item.goodsValue).toLocaleString('en-IN')}</TableCell>
                                  <TableCell className="text-right font-medium">{item.landedCostPerKg.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
  );
}

export const PurchaseTable = React.memo(PurchaseTableComponent);
