
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AggregatedInventoryItem } from "./InventoryClient";

interface PartyBrokerLeaderboardProps {
  items: AggregatedInventoryItem[];
}

interface LeaderboardEntry {
  name: string;
  type: string;
  vakkals: number;
  bags: number;
  kg: number;
  value: number;
}

export const PartyBrokerLeaderboard: React.FC<PartyBrokerLeaderboardProps> = ({ items }) => {
  const leaderboardData = React.useMemo(() => {
    const partyMap = new Map<string, LeaderboardEntry>();

    items.forEach(item => {
      const partyId = item.supplierId;
      const partyName = item.supplierName || 'Unknown';

      if (!partyId) return;

      if (!partyMap.has(partyId)) {
        partyMap.set(partyId, {
          name: partyName,
          type: "Supplier",
          vakkals: 0,
          bags: 0,
          kg: 0,
          value: 0,
        });
      }

      const entry = partyMap.get(partyId)!;
      entry.bags += item.totalPurchasedBags + item.totalTransferredInBags;
      entry.kg += item.totalPurchasedWeight + item.totalTransferredInWeight;
      entry.value += (item.totalPurchasedWeight + item.totalTransferredInWeight) * item.purchaseRate;
    });
    
    const vakkalCounts = items.reduce((acc, item) => {
        if (item.supplierId) {
            if (!acc[item.supplierId]) {
                acc[item.supplierId] = new Set();
            }
            acc[item.supplierId].add(item.lotNumber);
        }
        return acc;
    }, {} as Record<string, Set<string>>);

    partyMap.forEach((entry, partyId) => {
        entry.vakkals = vakkalCounts[partyId]?.size || 0;
    });

    return Array.from(partyMap.values())
      .filter(entry => entry.bags > 0)
      .sort((a, b) => b.bags - a.value);
  }, [items]);

  if (leaderboardData.length === 0) {
      return (
          <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[200px] flex items-center justify-center">
             <p className="text-muted-foreground">No supplier data to build leaderboard.</p>
          </Card>
      );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Bag Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Vakkals</TableHead>
                <TableHead className="text-right">Bags</TableHead>
                <TableHead className="text-right">KG</TableHead>
                <TableHead className="text-right">Value (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((entry, index) => (
                <TableRow key={entry.name}>
                  <TableCell className="font-bold">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell className="text-center">{entry.vakkals}</TableCell>
                  <TableCell className="text-right">{entry.bags.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{entry.kg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-right">₹{entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
