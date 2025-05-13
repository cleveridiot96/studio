"use client";

import React from 'react';
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
import type { MasterItem, MasterItemType } from "@/lib/types";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface MasterListProps {
  data: MasterItem[];
  itemType: MasterItemType;
  onEdit: (item: MasterItem) => void;
  onDelete: (item: MasterItem) => void;
}

export const MasterList: React.FC<MasterListProps> = ({ data, itemType, onEdit, onDelete }) => {
  if (data.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No {itemType.toLowerCase()}s recorded yet.</p>;
  }

  const hasCommission = itemType === 'Agent' || itemType === 'Broker';

  return (
    <ScrollArea className="rounded-md border shadow-sm max-h-[500px]">
      <Table className="min-w-full whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            {hasCommission && <TableHead className="text-right">Commission (%)</TableHead>}
            <TableHead className="text-center w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              {hasCommission && (
                <TableCell className="text-right">
                  {item.commission !== undefined ? `${item.commission.toLocaleString()}%` : 'N/A'}
                </TableCell>
              )}
              <TableCell className="text-center">
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="mr-2 hover:text-primary">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="hover:text-destructive">
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
};