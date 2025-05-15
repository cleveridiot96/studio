
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
import type { Receipt } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ReceiptTableProps {
  data: Receipt[];
  onEdit: (receipt: Receipt) => void;
  onDelete: (receiptId: string) => void;
}

const ReceiptTableComponent: React.FC<ReceiptTableProps> = ({ data, onEdit, onDelete }) => {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No receipts recorded yet.</p>;
  }

  return (
    <ScrollArea className="rounded-md border shadow-sm">
      <Table className="min-w-full whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Party Name</TableHead>
            <TableHead>Party Type</TableHead>
            <TableHead className="text-right">Amount (₹)</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference No.</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-center w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((receipt) => (
            <TableRow key={receipt.id}>
              <TableCell>{format(new Date(receipt.date), "dd-MM-yy")}</TableCell>
              <TableCell>{receipt.partyName || receipt.partyId}</TableCell>
              <TableCell><Badge variant="secondary">{receipt.partyType}</Badge></TableCell>
              <TableCell className="text-right font-semibold">{receipt.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
              <TableCell>{receipt.paymentMethod}</TableCell>
              <TableCell>{receipt.referenceNo || 'N/A'}</TableCell>
              <TableCell className="truncate max-w-xs">{receipt.notes || 'N/A'}</TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="icon" onClick={() => onEdit(receipt)} className="mr-2 hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(receipt.id)} className="hover:text-destructive">
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

export const ReceiptTable = React.memo(ReceiptTableComponent);

    