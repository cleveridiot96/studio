
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AggregatedInventoryItem } from "./InventoryClient";

interface PartyBrokerLeaderboardProps {
  items: AggregatedInventoryItem[];
}

export const PartyBrokerLeaderboard: React.FC<PartyBrokerLeaderboardProps> = ({ items }) => {
  const stockListData = React.useMemo(() => {
    // Filter for items with a positive bag count and sort them in descending order
    return items
      .filter(item => item.currentBags > 0)
      .sort((a, b) => b.currentBags - a.currentBags);
  }, [items]);

  if (stockListData.length === 0) {
      return (
          <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[200px] flex items-center justify-center">
             <p className="text-muted-foreground">No active stock to list.</p>
          </Card>
      );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Stock List (Sorted by Bag Count)</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Vakkal/Lot</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Current Bags</TableHead>
                <TableHead className="text-right">Current Weight (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockListData.map((item, index) => (
                <TableRow key={`${item.lotNumber}-${item.locationId}`}>
                  <TableCell className="font-bold">{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.lotNumber}</TableCell>
                  <TableCell>{item.locationName}</TableCell>
                  <TableCell className="text-right font-bold">{item.currentBags.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{item.currentWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
