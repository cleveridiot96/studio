
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem, Warehouse, LocationTransfer, PurchaseReturn, SaleReturn } from "@/lib/types"; // Added PurchaseReturn, SaleReturn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Archive, Boxes, Printer, TrendingUp, TrendingDown, MoreVertical, Edit } from "lucide-react";
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
import { isDateInFinancialYear, cn } from "@/lib/utils";
import { InventoryTable } from "./InventoryTable"; // Import the refactored table

const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData'; 
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData'; 
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';

const DEAD_STOCK_THRESHOLD_DAYS = 180;

export interface AggregatedInventoryItem { // Exporting the type
  lotNumber: string;
  locationId: string;
  locationName: string;
  totalPurchasedBags: number;
  totalPurchasedWeight: number;
  totalSoldBags: number;
  totalSoldWeight: number;
  totalPurchaseReturnedBags: number; 
  totalPurchaseReturnedWeight: number; 
  totalSaleReturnedBags: number; 
  totalSaleReturnedWeight: number; 
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
  isDeadStock?: boolean; 
}

export function InventoryClient() {
  const { financialYear, isAppHydrating } = useSettings();
  const { toast } = useToast();

  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray); 
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray); 
  const [warehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);

  const [itemToArchive, setItemToArchive] = React.useState<AggregatedInventoryItem | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);
  const [notifiedLowStock, setNotifiedLowStock] = React.useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const aggregatedInventory = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];

    const inventoryMap = new Map<string, AggregatedInventoryItem>();

    const fyPurchases = purchases.filter(p => isDateInFinancialYear(p.date, financialYear));
    fyPurchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`;
      let entry = inventoryMap.get(key);
      if (!entry) {
        entry = {
          lotNumber: p.lotNumber, locationId: p.locationId,
          locationName: warehouses.find(w => w.id === p.locationId)?.name || p.locationId,
          totalPurchasedBags: 0, totalPurchasedWeight: 0,
          totalSoldBags: 0, totalSoldWeight: 0,
          totalPurchaseReturnedBags: 0, totalPurchaseReturnedWeight: 0, 
          totalSaleReturnedBags: 0, totalSaleReturnedWeight: 0, 
          totalTransferredOutBags: 0, totalTransferredOutWeight: 0,
          totalTransferredInBags: 0, totalTransferredInWeight: 0,
          currentBags: 0, currentWeight: 0,
          purchaseDate: p.date, purchaseRate: p.rate,
        };
      }
      entry.totalPurchasedBags += p.quantity;
      entry.totalPurchasedWeight += p.netWeight;
      if (!entry.purchaseDate || new Date(p.date) < new Date(entry.purchaseDate)) {
        entry.purchaseDate = p.date; entry.purchaseRate = p.rate;
      }
      inventoryMap.set(key, entry);
    });

    const fyPurchaseReturns = purchaseReturns.filter(pr => isDateInFinancialYear(pr.date, financialYear));
    fyPurchaseReturns.forEach(pr => {
      const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
      if (originalPurchase) {
        const key = `${originalPurchase.lotNumber}-${originalPurchase.locationId}`;
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.totalPurchaseReturnedBags += pr.quantityReturned;
          entry.totalPurchaseReturnedWeight += pr.netWeightReturned;
        }
      }
    });

    const fySales = sales.filter(s => isDateInFinancialYear(s.date, financialYear));
    fySales.forEach(s => {
      const relatedPurchaseForSale = purchases.find(p => p.lotNumber === s.lotNumber);
      if (relatedPurchaseForSale) {
        const key = `${s.lotNumber}-${relatedPurchaseForSale.locationId}`;
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.totalSoldBags += s.quantity;
          entry.totalSoldWeight += s.netWeight;
        }
      }
    });

    const fySaleReturns = saleReturns.filter(sr => isDateInFinancialYear(sr.date, financialYear));
    fySaleReturns.forEach(sr => {
        const originalSale = sales.find(s => s.id === sr.originalSaleId);
        if (originalSale) {
            const relatedPurchaseForSale = purchases.find(p => p.lotNumber === originalSale.lotNumber);
            if (relatedPurchaseForSale) {
                 const key = `${originalSale.lotNumber}-${relatedPurchaseForSale.locationId}`;
                 let entry = inventoryMap.get(key);
                 if (entry) {
                    entry.totalSaleReturnedBags += sr.quantityReturned;
                    entry.totalSaleReturnedWeight += sr.netWeightReturned;
                 }
            }
        }
    });


    const fyLocationTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    fyLocationTransfers.forEach(transfer => {
      transfer.items.forEach(item => {
        const fromKey = `${item.lotNumber}-${transfer.fromWarehouseId}`;
        let fromEntry = inventoryMap.get(fromKey);
        if (fromEntry) {
          fromEntry.totalTransferredOutBags += item.bagsToTransfer;
          fromEntry.totalTransferredOutWeight += item.netWeightToTransfer;
        }
        const toKey = `${item.lotNumber}-${transfer.toWarehouseId}`;
        let toEntry = inventoryMap.get(toKey);
        if (!toEntry) {
          const originalPurchase = purchases.find(p => p.lotNumber === item.lotNumber);
          toEntry = {
            lotNumber: item.lotNumber, locationId: transfer.toWarehouseId,
            locationName: warehouses.find(w => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId,
            totalPurchasedBags: 0, totalPurchasedWeight: 0,
            totalSoldBags: 0, totalSoldWeight: 0,
            totalPurchaseReturnedBags: 0, totalPurchaseReturnedWeight: 0,
            totalSaleReturnedBags: 0, totalSaleReturnedWeight: 0,
            totalTransferredOutBags: 0, totalTransferredOutWeight: 0,
            totalTransferredInBags: 0, totalTransferredInWeight: 0,
            currentBags: 0, currentWeight: 0,
            purchaseDate: originalPurchase?.date, purchaseRate: originalPurchase?.rate,
          };
          inventoryMap.set(toKey, toEntry);
        }
        toEntry.totalTransferredInBags += item.bagsToTransfer;
        toEntry.totalTransferredInWeight += item.netWeightToTransfer;
      });
    });

    const result: AggregatedInventoryItem[] = [];
    inventoryMap.forEach(item => {
      item.currentBags = item.totalPurchasedBags + item.totalTransferredInBags + item.totalSaleReturnedBags
                        - item.totalSoldBags - item.totalTransferredOutBags - item.totalPurchaseReturnedBags;
      item.currentWeight = item.totalPurchasedWeight + item.totalTransferredInWeight + item.totalSaleReturnedWeight
                        - item.totalSoldWeight - item.totalTransferredOutWeight - item.totalPurchaseReturnedWeight;
      
      if (item.purchaseDate) {
        item.daysInStock = Math.floor((new Date().getTime() - new Date(item.purchaseDate).getTime()) / (1000 * 3600 * 24));
      }
      const totalInitialBagsForTurnover = item.totalPurchasedBags + item.totalTransferredInBags;
      item.turnoverRate = totalInitialBagsForTurnover > 0 ? ((item.totalSoldBags + item.totalTransferredOutBags) / totalInitialBagsForTurnover) * 100 : 0;
      item.isDeadStock = item.currentBags > 0 && item.daysInStock !== undefined && item.daysInStock > DEAD_STOCK_THRESHOLD_DAYS;

      if (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0 || item.totalSaleReturnedBags > 0) {
        result.push(item);
      }
    });
    return result.sort((a,b) => a.lotNumber.localeCompare(b.lotNumber) || a.locationName.localeCompare(b.locationName));
  }, [purchases, purchaseReturns, sales, saleReturns, warehouses, locationTransfers, hydrated, isAppHydrating, financialYear]);

  React.useEffect(() => {
    if (!hydrated || isAppHydrating) return;
    const newNotified = new Set(notifiedLowStock);
    aggregatedInventory.forEach(item => {
      const itemKey = `${item.lotNumber}-${item.locationId}`;
      if (item.currentBags <= 5 && item.currentBags > 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey) && !item.isDeadStock) {
        toast({ title: "Low Stock Alert", description: `Lot "${item.lotNumber}" at ${item.locationName} has ${item.currentBags} bags.`, variant: "default", duration: 7000 });
        newNotified.add(itemKey);
      } else if (item.currentBags <= 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey + "-zero") && !item.isDeadStock) {
         toast({ title: "Zero Stock", description: `Lot "${item.lotNumber}" at ${item.locationName} is out of stock.`, variant: "default", duration: 7000 });
        newNotified.add(itemKey + "-zero");
      }
    });
    if (newNotified.size !== notifiedLowStock.size) setNotifiedLowStock(newNotified);
  }, [aggregatedInventory, toast, notifiedLowStock, hydrated, isAppHydrating]);

  const inventoryByWarehouse = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return {};
    const grouped: Record<string, AggregatedInventoryItem[]> = {};
    aggregatedInventory.forEach(item => {
      if (!grouped[item.locationId]) grouped[item.locationId] = [];
      grouped[item.locationId].push(item);
    });
    return grouped;
  }, [aggregatedInventory, isAppHydrating, hydrated]);

  const handleArchiveAttempt = (item: AggregatedInventoryItem) => {
    if (item.currentBags <= 0) { setItemToArchive(item); setShowArchiveConfirm(true); }
    else { toast({ title: "Cannot Archive", description: `Lot "${item.lotNumber}" has ${item.currentBags} bags. Only zero-stock can be archived.`, variant: "destructive" }); }
  };
  const confirmArchiveItem = () => {
    if (itemToArchive) {
      toast({ title: "Lot Archived (Conceptual)", description: `Lot "${itemToArchive.lotNumber}" at ${itemToArchive.locationName} would be archived.` });
      setItemToArchive(null); setShowArchiveConfirm(false);
    }
  };
  const activeWarehouses = React.useMemo(() =>
    warehouses.filter(wh => aggregatedInventory.some(item => item.locationId === wh.id && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0 || item.totalSaleReturnedBags > 0)))
  , [warehouses, aggregatedInventory]);

  if (isAppHydrating || !hydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading inventory...</p></div>;

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Inventory (FY {financialYear})</h1>
        <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
      </div>
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-auto no-print">
          <TabsTrigger value="summary" className="py-2 sm:py-3 text-sm sm:text-base"><Boxes className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> All Stock</TabsTrigger>
          {activeWarehouses.map(wh => (<TabsTrigger key={wh.id} value={wh.id} className="py-2 sm:py-3 text-sm sm:text-base"><Boxes className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> {wh.name}</TabsTrigger>))}
        </TabsList>
        <TabsContent value="summary" className="mt-6">
          <Card className="shadow-lg"><CardHeader><CardTitle>Overall Stock Summary</CardTitle></CardHeader><CardContent><InventoryTable items={aggregatedInventory} onArchive={handleArchiveAttempt} /></CardContent></Card>
        </TabsContent>
        {activeWarehouses.map(wh => (<TabsContent key={wh.id} value={wh.id} className="mt-6"><Card className="shadow-lg"><CardHeader><CardTitle>Stock at {wh.name}</CardTitle></CardHeader><CardContent><InventoryTable items={inventoryByWarehouse[wh.id] || []} onArchive={handleArchiveAttempt} /></CardContent></Card></TabsContent>))}
      </Tabs>
      {itemToArchive && (<AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive Vakkal/Lot?</AlertDialogTitle><AlertDialogDescription>Lot "<strong>{itemToArchive.lotNumber}</strong>" at <strong>{itemToArchive.locationName}</strong> has zero bags. Archiving is conceptual in this demo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setItemToArchive(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmArchiveItem} className="bg-blue-600 hover:bg-blue-700">Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </div>
  );
}
