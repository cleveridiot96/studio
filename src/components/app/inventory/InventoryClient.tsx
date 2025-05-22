
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem, Warehouse, LocationTransfer } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Archive, Boxes, Printer, TrendingUp, TrendingDown } from "lucide-react";
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
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';


interface AggregatedInventoryItem {
  lotNumber: string;
  locationId: string;
  locationName: string;
  totalPurchasedBags: number;
  totalPurchasedWeight: number;
  totalSoldBags: number;
  totalSoldWeight: number;
  totalTransferredOutBags: number;
  totalTransferredOutWeight: number;
  totalTransferredInBags: number;
  totalTransferredInWeight: number;
  currentBags: number;
  currentWeight: number;
  purchaseDate?: string;
  purchaseRate?: number;
  daysInStock?: number;
  turnoverRate?: number;
}

export function InventoryClient() {
  const { financialYear, isAppHydrating } = useSettings();
  const { toast } = useToast();

  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [warehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);

  const [itemToArchive, setItemToArchive] = React.useState<AggregatedInventoryItem | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);
  const [notifiedLowStock, setNotifiedLowStock] = React.useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const aggregatedInventory = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];

    const inventoryMap = new Map<string, AggregatedInventoryItem>();

    // Process purchases relevant to the current financial year
    const fyPurchases = purchases.filter(p => isDateInFinancialYear(p.date, financialYear));
    fyPurchases.forEach(p => {
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
          totalTransferredOutBags: 0,
          totalTransferredOutWeight: 0,
          totalTransferredInBags: 0,
          totalTransferredInWeight: 0,
          currentBags: 0,
          currentWeight: 0,
          purchaseDate: p.date,
          purchaseRate: p.rate,
        };
      }
      entry.totalPurchasedBags += p.quantity;
      entry.totalPurchasedWeight += p.netWeight;
      // Update purchaseDate and rate if this purchase is more recent or the first one for the lot-location
      if (!entry.purchaseDate || new Date(p.date) > new Date(entry.purchaseDate)) {
        entry.purchaseDate = p.date;
        entry.purchaseRate = p.rate;
      }
      inventoryMap.set(key, entry);
    });

    // Process sales relevant to the current financial year
    const fySales = sales.filter(s => isDateInFinancialYear(s.date, financialYear));
    fySales.forEach(s => {
      // Find the original purchase to determine the location from which the sale occurred
      const relatedPurchaseForSale = purchases.find(p => p.lotNumber === s.lotNumber);
      if (relatedPurchaseForSale) {
        const key = `${s.lotNumber}-${relatedPurchaseForSale.locationId}`; // Key based on original purchase location
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.totalSoldBags += s.quantity;
          entry.totalSoldWeight += s.netWeight;
        } else {
          // This case implies a sale of a lot not purchased in current FY or data inconsistency.
          // For robustness, we could log this or create a placeholder inventory item if needed.
          // console.warn(`Sale recorded for lot ${s.lotNumber} from location ${relatedPurchaseForSale.locationId}, but no matching purchase entry in inventoryMap.`);
        }
      }
    });

    // Process location transfers relevant to the current financial year
    const fyLocationTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    fyLocationTransfers.forEach(transfer => {
      transfer.items.forEach(item => {
        // Item transferred OUT
        const fromKey = `${item.lotNumber}-${transfer.fromWarehouseId}`;
        let fromEntry = inventoryMap.get(fromKey);
        if (fromEntry) {
          fromEntry.totalTransferredOutBags += item.bagsToTransfer;
          fromEntry.totalTransferredOutWeight += item.netWeightToTransfer;
        } else {
          // Log if transferring from a location/lot that doesn't have a purchase record (might happen if purchases are from a previous FY)
          // console.warn(`Transferring out lot ${item.lotNumber} from ${transfer.fromWarehouseName}, but no purchase record found in inventory map.`);
        }

        // Item transferred IN
        const toKey = `${item.lotNumber}-${transfer.toWarehouseId}`;
        let toEntry = inventoryMap.get(toKey);
        if (!toEntry) {
          // If the lot doesn't exist in the destination warehouse, create a new entry for it.
          // Use original purchase details for costing, but mark purchased quantity/weight as 0 here.
          const originalPurchase = purchases.find(p => p.lotNumber === item.lotNumber);
          toEntry = {
            lotNumber: item.lotNumber,
            locationId: transfer.toWarehouseId,
            locationName: warehouses.find(w => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId,
            totalPurchasedBags: 0, // Not a new purchase at this location
            totalPurchasedWeight: 0, // Not a new purchase at this location
            totalSoldBags: 0,
            totalSoldWeight: 0,
            totalTransferredOutBags: 0,
            totalTransferredOutWeight: 0,
            totalTransferredInBags: 0,
            totalTransferredInWeight: 0,
            currentBags: 0,
            currentWeight: 0,
            purchaseDate: originalPurchase?.date, // Date of original purchase of this lot
            purchaseRate: originalPurchase?.rate, // Rate of original purchase
          };
          inventoryMap.set(toKey, toEntry);
        }
        toEntry.totalTransferredInBags += item.bagsToTransfer;
        toEntry.totalTransferredInWeight += item.netWeightToTransfer;
      });
    });


    const result: AggregatedInventoryItem[] = [];
    inventoryMap.forEach(item => {
      item.currentBags = item.totalPurchasedBags + item.totalTransferredInBags - item.totalSoldBags - item.totalTransferredOutBags;
      item.currentWeight = item.totalPurchasedWeight + item.totalTransferredInWeight - item.totalSoldWeight - item.totalTransferredOutWeight;

      // Calculate daysInStock and turnoverRate
      if (item.purchaseDate) {
        item.daysInStock = Math.floor((new Date().getTime() - new Date(item.purchaseDate).getTime()) / (1000 * 3600 * 24));
      }
      const totalInitialBagsForTurnover = item.totalPurchasedBags + item.totalTransferredInBags;
      item.turnoverRate = totalInitialBagsForTurnover > 0 ? ((item.totalSoldBags + item.totalTransferredOutBags) / totalInitialBagsForTurnover) * 100 : 0;

      // Add to result if there was any purchase or transfer in, to show zero stock items that were once active
      if (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) {
        result.push(item);
      }
    });
    return result.sort((a,b) => a.lotNumber.localeCompare(b.lotNumber) || a.locationName.localeCompare(b.locationName));
  }, [purchases, sales, warehouses, locationTransfers, hydrated, isAppHydrating, financialYear]);

  React.useEffect(() => {
    if (!hydrated || isAppHydrating) return;
    const newNotified = new Set(notifiedLowStock);
    aggregatedInventory.forEach(item => {
      const itemKey = `${item.lotNumber}-${item.locationId}`;
      if (item.currentBags <= 5 && item.currentBags > 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey)) {
        toast({
          title: "Low Stock Alert",
          description: `Lot "${item.lotNumber}" at ${item.locationName} has only ${item.currentBags} bags remaining.`,
          variant: "default",
          duration: 7000,
        });
        newNotified.add(itemKey);
      } else if (item.currentBags <= 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey + "-zero")) {
         toast({
          title: "Zero Stock: Archive Option",
          description: `Lot "${item.lotNumber}" at ${item.locationName} has zero bags. Consider archiving.`,
          variant: "default",
          duration: 7000,
        });
        newNotified.add(itemKey + "-zero");
      }
    });
    if (newNotified.size !== notifiedLowStock.size) { // Only update state if the set actually changed
        setNotifiedLowStock(newNotified);
    }
  }, [aggregatedInventory, toast, notifiedLowStock, hydrated, isAppHydrating]);


  const inventoryByWarehouse = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return {};
    const grouped: Record<string, AggregatedInventoryItem[]> = {};
    aggregatedInventory.forEach(item => {
      if (!grouped[item.locationId]) {
        grouped[item.locationId] = [];
      }
      grouped[item.locationId].push(item);
    });
    return grouped;
  }, [aggregatedInventory, isAppHydrating, hydrated]);

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
      // This is where you'd typically update a backend or a different local storage key for archived items.
      // For this client-side only version, we are just conceptually archiving it.
      toast({
        title: "Lot Archived (Conceptual)",
        description: `Lot "${itemToArchive.lotNumber}" at ${itemToArchive.locationName} would be moved to archives if backend was connected.`,
      });
      // To make it disappear from the list, you'd filter it out from `purchases` and re-save,
      // but this is complex for a client-only demo and can lead to data loss if not handled carefully.
      // For now, it remains in the list but is marked as zero stock.
      setItemToArchive(null);
      setShowArchiveConfirm(false);
    }
  };

  const activeWarehouses = React.useMemo(() =>
    warehouses.filter(wh => aggregatedInventory.some(item => item.locationId === wh.id && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0)))
  , [warehouses, aggregatedInventory]);


  if (isAppHydrating || !hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading inventory...</p></div>;
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Inventory (FY {financialYear})</h1>
        <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print</span>
        </Button>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-auto no-print">
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
            </CardHeader>
            <CardContent>
              <InventoryTable items={aggregatedInventory} onArchive={handleArchiveAttempt} />
            </CardContent>
          </Card>
        </TabsContent>

        {activeWarehouses.map(wh => (
          <TabsContent key={wh.id} value={wh.id} className="mt-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">Stock at {wh.name}</CardTitle>
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
                Archiving would visually remove it from active inventory lists in a full system. This action is conceptual in this demo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToArchive(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmArchiveItem} className="bg-blue-600 hover:bg-blue-700">
                Archive (Conceptual)
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
    <ScrollArea className="h-[400px] rounded-md border print:h-auto print:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vakkal/Lot No.</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Current Bags</TableHead>
            <TableHead className="text-right">Current Weight (kg)</TableHead>
            <TableHead>Last Purchase</TableHead>
            <TableHead className="text-right">Last Rate (₹/kg)</TableHead>
             <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center no-print">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.lotNumber}-${item.locationId}`} className={item.currentBags <= 0 ? "bg-red-50 dark:bg-red-900/30" : item.currentBags <= 5 ? "bg-yellow-50 dark:bg-yellow-900/30" : ""}>
              <TableCell>{item.lotNumber}</TableCell>
              <TableCell>{item.locationName}</TableCell>
              <TableCell className="text-right font-medium">{item.currentBags.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.currentWeight.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</TableCell>
              <TableCell>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell className="text-right">{item.purchaseRate ? item.purchaseRate.toFixed(2) : 'N/A'}</TableCell>
              <TableCell className="text-center">
                {item.currentBags <= 0 ? (
                  <Badge variant="destructive">Zero Stock</Badge>
                ) : item.currentBags <= 5 ? (
                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100">Low Stock</Badge>
                ) : (item.turnoverRate || 0) >= 75 ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-white"><TrendingUp className="h-3 w-3 mr-1"/> Fast Moving</Badge>
                ) : (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white"><TrendingDown className="h-3 w-3 mr-1"/> Slow/Aging</Badge>
                ) : (
                  <Badge variant="secondary">In Stock</Badge>
                )}
              </TableCell>
              <TableCell className="text-center no-print">
                {item.currentBags <= 0 && (
                  <Button variant="outline" size="sm" onClick={() => onArchive(item)} title="Archive this zero-stock lot">
                    <Archive className="h-4 w-4 mr-1" /> Archive
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};


    