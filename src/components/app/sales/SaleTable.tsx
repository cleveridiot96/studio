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
import { Pencil, Trash2 } from "lucide-react";
import type { Sale } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface SaleTableProps {
  data: Sale[];
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: string) => void;
}

const SaleTableComponent: React.FC<SaleTableProps> = ({ data, onEdit, onDelete }) => {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No sales recorded yet.</p>;
  }

  return (
    <ScrollArea className="rounded-md border shadow-sm">
      <Table className="min-w-full whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Bill No.</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Lot No.</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Bags</TableHead>
            <TableHead className="text-right">Net Wt.(kg)</TableHead>
            <TableHead className="text-right">Rate (₹/kg)</TableHead>
            <TableHead>Broker</TableHead>
            <TableHead className="text-right">Total (₹)</TableHead>
            <TableHead className="text-center w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell>{format(new Date(sale.date), "dd-MM-yy")}</TableCell>
              <TableCell>{sale.billNumber}</TableCell>
              <TableCell>{sale.customerName || sale.customerId}</TableCell>
              <TableCell>{sale.lotNumber}</TableCell>
              <TableCell>{sale.itemName}</TableCell>
              <TableCell className="text-right">{sale.quantity}</TableCell>
              <TableCell className="text-right">{sale.netWeight.toLocaleString()}</TableCell>
              <TableCell className="text-right">{sale.rate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
              <TableCell>{sale.brokerName || sale.brokerId || 'N/A'}</TableCell>
              <TableCell className="text-right font-semibold">{(sale.billAmount || sale.totalAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="icon" onClick={() => onEdit(sale)} className="mr-2 hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(sale.id)} className="hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
export const SaleTable = React.memo(SaleTableComponent);