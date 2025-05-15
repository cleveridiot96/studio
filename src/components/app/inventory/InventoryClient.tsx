
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem, Warehouse } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Archive, Boxes } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';

interface AggregatedInventoryItem {
  lotNumber: string;
  locationId: string;
  locationName: string;
  totalPurchasedBags: number;
  totalPurchasedWeight: number;
  totalSoldBags: number;
  totalSoldWeight: number;
  currentBags: number;
  currentWeight: number;
  purchaseDate?: string; // To show latest purchase date for the lot
  purchaseRate?: number; // To show latest purchase rate
}

export function InventoryClient() {
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, []);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, []);
  const [warehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, []);
  const { toast } = useToast();

  const [itemToArchive, setItemToArchive] = React.useState<AggregatedInventoryItem | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);

  const aggregatedInventory = React.useMemo(() => {
    const inventoryMap = new Map<string, AggregatedInventoryItem>();

    purchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`;
      let entry = inventoryMap.get(key);
      if (!entry) {
        entry = {
          lotNumber: p.lotNumber,
          locationId: p.locationId,
          locationName: warehouses.find(w => w.id === p.locationId)?.name || p.locationId,
          totalPurchasedBags: 0,
          totalPurchasedWeight: 0,
          totalSoldBags: 0,
          totalSoldWeight: 0,
          currentBags: 0,
          currentWeight: 0,
          purchaseDate: p.date,
          purchaseRate: p.rate,
        };
      }
      entry.totalPurchasedBags += p.quantity;
      entry.totalPurchasedWeight += p.netWeight;
      // Update with latest purchase date/rate if this purchase is newer
      if (new Date(p.date) > new Date(entry.purchaseDate || 0)) {
        entry.purchaseDate = p.date;
        entry.purchaseRate = p.rate;
      }
      inventoryMap.set(key, entry);
    });

    sales.forEach(s => {
      // Sales don't have locationId, so we need to find the purchase lot to determine its original location.
      // This assumes a sale from a lotNumber deducts from that lotNumber across all locations,
      // or that lotNumbers are unique per location in purchases.
      // For simplicity, we'll find the first purchase matching the lot number to get a location.
      // A more robust system might require sales to specify purchaseId or locationId.
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber);
      if (relatedPurchase) {
        const key = `${s.lotNumber}-${relatedPurchase.locationId}`;
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.totalSoldBags += s.quantity;
          entry.totalSoldWeight += s.netWeight;
        }
      }
    });

    const result: AggregatedInventoryItem[] = [];
    inventoryMap.forEach(item => {
      item.currentBags = item.totalPurchasedBags - item.totalSoldBags;
      item.currentWeight = item.totalPurchasedWeight - item.totalSoldWeight;
      if (item.currentBags <= 5 && item.currentBags > 0 && item.totalPurchasedBags > 0) { // Near zero or low stock, but not yet sold out
        toast({
          title: "Low Stock Alert",
          description: `Lot "${item.lotNumber}" at ${item.locationName} has only ${item.currentBags} bags remaining.`,
          variant: "default",
          duration: 7000,
        });
      }
      if (item.currentBags <= 0 && item.totalPurchasedBags > 0) { // Zero or negative stock (sold out)
         // Only add to list if it was ever purchased; don't show if it was only sold (data error)
        result.push(item);
      } else if (item.currentBags > 0) {
        result.push(item);
      }
    });
    return result.sort((a,b) => a.lotNumber.localeCompare(b.lotNumber) || a.locationName.localeCompare(b.locationName));
  }, [purchases, sales, warehouses, toast]);

  const inventoryByWarehouse = React.useMemo(() => {
    const grouped: Record<string, AggregatedInventoryItem[]> = {};
    aggregatedInventory.forEach(item => {
      if (!grouped[item.locationId]) {
        grouped[item.locationId] = [];
      }
      grouped[item.locationId].push(item);
    });
    return grouped;
  }, [aggregatedInventory]);

  const handleArchiveAttempt = (item: AggregatedInventoryItem) => {
    if (item.currentBags <= 0) {
      setItemToArchive(item);
      setShowArchiveConfirm(true);
    } else {
      toast({
        title: "Cannot Archive",
        description: `Lot "${item.lotNumber}" still has ${item.currentBags} bags in stock. Only zero-stock lots can be archived.`,
        variant: "destructive"
      });
    }
  };

  const confirmArchiveItem = () => {
    if (itemToArchive) {
      // Actual archival logic would involve moving this item from active inventory
      // to an 'archived_inventory' list in localStorage or marking it as archived.
      // For this demo, we'll just show a toast.
      toast({
        title: "Lot Archived (Conceptual)",
        description: `Lot "${itemToArchive.lotNumber}" at ${itemToArchive.locationName} would be moved to archives.`,
      });
      setItemToArchive(null);
      setShowArchiveConfirm(false);
      // To actually remove it from view, you would filter `aggregatedInventory`
      // or trigger a re-fetch/re-calculation of data that excludes archived items.
    }
  };
  
  const activeWarehouses = warehouses.filter(wh => aggregatedInventory.some(item => item.locationId === wh.id && item.currentBags > 0));


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-lg text-muted-foreground">Track your stock in real-time across locations.</p>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-auto">
          <TabsTrigger value="summary" className="py-2 sm:py-3 text-sm sm:text-base">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> All Stock Summary
          </TabsTrigger>
          {activeWarehouses.map(wh => (
            <TabsTrigger key={wh.id} value={wh.id} className="py-2 sm:py-3 text-sm sm:text-base">
               <Boxes className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> {wh.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Overall Stock Summary</CardTitle>
              <CardDescription>Aggregated view of all your vakkals across all locations.</CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryTable items={aggregatedInventory} onArchive={handleArchiveAttempt} />
            </CardContent>
          </Card>
        </TabsContent>

        {warehouses.map(wh => (
          <TabsContent key={wh.id} value={wh.id} className="mt-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">Stock at {wh.name}</CardTitle>
                <CardDescription>Current vakkals available at {wh.name}.</CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryTable items={inventoryByWarehouse[wh.id] || []} onArchive={handleArchiveAttempt} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      {itemToArchive && (
        <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Vakkal/Lot Number?</AlertDialogTitle>
              <AlertDialogDescription>
                Lot "<strong>{itemToArchive.lotNumber}</strong>" at <strong>{itemToArchive.locationName}</strong> has zero bags.
                Archiving will remove it from active inventory lists. This action is conceptual in this demo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToArchive(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmArchiveItem} className="bg-blue-600 hover:bg-blue-700">
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

interface InventoryTableProps {
  items: AggregatedInventoryItem[];
  onArchive: (item: AggregatedInventoryItem) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items, onArchive }) => {
  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No inventory items to display for this selection.</p>;
  }
  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vakkal/Lot No.</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Current Bags</TableHead>
            <TableHead className="text-right">Current Weight (kg)</TableHead>
            <TableHead>Last Purchase</TableHead>
            <TableHead className="text-right">Last Rate (₹/kg)</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.lotNumber}-${item.locationId}`} className={item.currentBags <= 0 ? "bg-red-50 dark:bg-red-900/30" : item.currentBags <= 5 ? "bg-yellow-50 dark:bg-yellow-900/30" : ""}>
              <TableCell>{item.lotNumber}</TableCell>
              <TableCell>{item.locationName}</TableCell>
              <TableCell className="text-right font-medium">{item.currentBags.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.currentWeight.toLocaleString()}</TableCell>
              <TableCell>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell className="text-right">{item.purchaseRate ? item.purchaseRate.toFixed(2) : 'N/A'}</TableCell>
              <TableCell className="text-center">
                {item.currentBags <= 0 && (
                  <Button variant="outline" size="sm" onClick={() => onArchive(item)} title="Archive this zero-stock lot">
                    <Archive className="h-4 w-4 mr-1" /> Archive
                  </Button>
                )}
                 {item.currentBags > 0 && item.currentBags <=5 && (
                    <Badge variant="default" className="bg-yellow-500 text-yellow-900">Low Stock</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
