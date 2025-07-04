
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import type { Purchase, Sale, LocationTransfer, PurchaseReturn, SaleReturn } from "@/lib/types";
import { ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockActivityFeedProps {
  purchases: Purchase[];
  sales: Sale[];
  locationTransfers: LocationTransfer[];
  purchaseReturns: PurchaseReturn[];
  saleReturns: SaleReturn[];
}

interface ActivityItem {
    id: string;
    date: string;
    text: string;
    type: 'purchase' | 'sale' | 'transfer' | 'purchaseReturn' | 'saleReturn';
    Icon: React.ElementType;
    colorClass: string;
}

export const StockActivityFeed: React.FC<StockActivityFeedProps> = ({
  purchases,
  sales,
  locationTransfers,
  purchaseReturns,
  saleReturns,
}) => {
  const activityData = React.useMemo(() => {
    const allActivities: ActivityItem[] = [];

    purchases.forEach(p => {
        allActivities.push({
            id: `pur-${p.id}`,
            date: p.date,
            text: `Received ${p.quantity} bags (${p.lotNumber}) from ${p.supplierName}.`,
            type: 'purchase',
            Icon: ArrowDownCircle,
            colorClass: 'text-blue-600'
        });
    });

    sales.forEach(s => {
        allActivities.push({
            id: `sal-${s.id}`,
            date: s.date,
            text: `Sold ${s.quantity} bags from ${s.lotNumber} to ${s.customerName}.`,
            type: 'sale',
            Icon: ArrowUpCircle,
            colorClass: 'text-green-600'
        });
    });

    locationTransfers.forEach(lt => {
        const totalBags = lt.items.reduce((sum, item) => sum + item.bagsToTransfer, 0);
        allActivities.push({
            id: `lt-${lt.id}`,
            date: lt.date,
            text: `Transferred ${totalBags} bags from ${lt.fromWarehouseName} to ${lt.toWarehouseName}.`,
            type: 'transfer',
            Icon: ArrowRightLeft,
            colorClass: 'text-purple-600'
        });
    });

    purchaseReturns.forEach(pr => {
        allActivities.push({
            id: `pr-${pr.id}`,
            date: pr.date,
            text: `Returned ${pr.quantityReturned} bags of ${pr.originalLotNumber} to supplier.`,
            type: 'purchaseReturn',
            Icon: Undo2,
            colorClass: 'text-orange-600'
        });
    });
    
    saleReturns.forEach(sr => {
        allActivities.push({
            id: `sr-${sr.id}`,
            date: sr.date,
            text: `Return of ${sr.quantityReturned} bags of ${sr.originalLotNumber} from customer.`,
            type: 'saleReturn',
            Icon: Redo2,
            colorClass: 'text-yellow-600'
        });
    });

    return allActivities.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).slice(0, 50);
  }, [purchases, sales, locationTransfers, purchaseReturns, saleReturns]);

  if (activityData.length === 0) {
      return (
           <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[200px] flex items-center justify-center">
             <p className="text-muted-foreground">No stock activities to display.</p>
           </Card>
      );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Stock Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[250px] pr-4">
          <ul className="space-y-4">
            {activityData.map((entry) => (
              <li key={entry.id} className="flex items-start gap-4">
                 <div className={cn("mt-1 p-1.5 bg-muted rounded-full", entry.colorClass)}>
                    <entry.Icon className="h-4 w-4 text-white bg-current rounded-full p-0.5" />
                 </div>
                 <div className="flex-grow">
                    <p className="text-sm">{entry.text}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(entry.date), "dd MMMM, yyyy")}</p>
                 </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
