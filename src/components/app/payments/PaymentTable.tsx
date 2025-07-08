
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
import type { Payment } from "@/lib/types";
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PaymentTableProps {
  data: Payment[];
  onEdit: (payment: Payment) => void;
  onDelete: (paymentId: string) => void;
}

const PaymentTableComponent: React.FC<PaymentTableProps> = ({ data, onEdit, onDelete }) => {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No payments recorded yet.</p>;
  }

  return (
    <TooltipProvider>
      <ScrollArea className="rounded-md border shadow-sm h-[60vh]">
        <Table className="min-w-full whitespace-nowrap">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Party Name</TableHead>
              <TableHead>Party Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{format(parseISO(payment.date), "dd/MM/yy")}</TableCell>
                <TableCell>{payment.partyName || payment.partyId}</TableCell>
                <TableCell><Badge variant="secondary">{payment.partyType}</Badge></TableCell>
                <TableCell>{payment.paymentMethod}</TableCell>
                <TableCell>{payment.source || 'N/A'}</TableCell>
                <TableCell className="truncate max-w-xs">
                  {payment.notes ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{payment.notes}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{payment.notes}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">{payment.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(payment)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(payment.id)}
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

export const PaymentTable = React.memo(PaymentTableComponent);
