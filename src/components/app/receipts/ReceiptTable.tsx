
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
import { MoreVertical, Pencil, Trash2, Printer } from "lucide-react";
import type { Receipt } from "@/lib/types";
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm">
        <Table className="min-w-full whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Party Name</TableHead>
              <TableHead>Party Type</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="text-right">Discount (₹)</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference No.</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell>{format(new Date(receipt.date), "dd-MM-yy")}</TableCell>
                <TableCell>{receipt.partyName || receipt.partyId}</TableCell>
                <TableCell><Badge variant="secondary">{receipt.partyType}</Badge></TableCell>
                <TableCell className="text-right font-semibold">{receipt.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-right">{receipt.cashDiscount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell>
                <TableCell>{receipt.paymentMethod}</TableCell>
                <TableCell>{receipt.referenceNo || 'N/A'}</TableCell>
                <TableCell className="truncate max-w-xs">
                  {receipt.notes ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{receipt.notes}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{receipt.notes}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    'N/A'
                  )}
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
                      <DropdownMenuItem onClick={() => onEdit(receipt)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Page
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(receipt.id)}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
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
}

export const ReceiptTable = React.memo(ReceiptTableComponent);
