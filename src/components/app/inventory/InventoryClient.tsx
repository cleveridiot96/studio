
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem, Warehouse, LocationTransfer, PurchaseReturn, SaleReturn } from "@/lib/types"; // Added PurchaseReturn, SaleReturn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Archive, Boxes, Printer, TrendingUp, TrendingDown } from "lucide-react";
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
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData'; // New Key
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData'; // New Key
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
  totalPurchaseReturnedBags: number; // New
  totalPurchaseReturnedWeight: number; // New
  totalSaleReturnedBags: number; // New
  totalSaleReturnedWeight: number; // New
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
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray); // New State
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray); // New State
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
          totalPurchaseReturnedBags: 0, totalPurchaseReturnedWeight: 0, // Init
          totalSaleReturnedBags: 0, totalSaleReturnedWeight: 0, // Init
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
      if (item.currentBags <= 5 && item.currentBags > 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey)) {
        toast({ title: "Low Stock Alert", description: `Lot "${item.lotNumber}" at ${item.locationName} has ${item.currentBags} bags.`, variant: "default", duration: 7000 });
        newNotified.add(itemKey);
      } else if (item.currentBags <= 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey + "-zero")) {
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

interface InventoryTableProps { items: AggregatedInventoryItem[]; onArchive: (item: AggregatedInventoryItem) => void; }
const InventoryTable: React.FC<InventoryTableProps> = ({ items, onArchive }) => {
  if (!items || items.length === 0) return <p className="text-center text-muted-foreground py-8">No inventory for this selection.</p>;
  return (
    <ScrollArea className="h-[400px] rounded-md border print:h-auto print:overflow-visible">
      <Table><TableHeader><TableRow><TableHead>Vakkal/Lot</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Current Bags</TableHead><TableHead className="text-right">Current Wt (kg)</TableHead><TableHead>Last Purch.</TableHead><TableHead className="text-right">Last Rate (₹/kg)</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center no-print">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {items.map((item) => (<TableRow key={`${item.lotNumber}-${item.locationId}`} className={item.currentBags <= 0 ? "bg-red-50 dark:bg-red-900/30" : item.currentBags <= 5 ? "bg-yellow-50 dark:bg-yellow-900/30" : ""}>
            <TableCell>{item.lotNumber}</TableCell><TableCell>{item.locationName}</TableCell>
            <TableCell className="text-right font-medium">{item.currentBags.toLocaleString()}</TableCell>
            <TableCell className="text-right">{item.currentWeight.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0})}</TableCell>
            <TableCell>{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</TableCell>
            <TableCell className="text-right">{item.purchaseRate ? item.purchaseRate.toFixed(2) : 'N/A'}</TableCell>
            <TableCell className="text-center">{item.currentBags <= 0 ? (<Badge variant="destructive">Zero Stock</Badge>) : item.currentBags <= 5 ? (<Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100">Low Stock</Badge>) : (item.turnoverRate || 0) >= 75 ? (<Badge className="bg-green-500 hover:bg-green-600 text-white"><TrendingUp className="h-3 w-3 mr-1"/> Fast</Badge>) : (item.daysInStock || 0) > 90 && (item.turnoverRate || 0) < 25 ? (<Badge className="bg-orange-500 hover:bg-orange-600 text-white"><TrendingDown className="h-3 w-3 mr-1"/> Slow</Badge>) : (<Badge variant="secondary">In Stock</Badge>)}</TableCell>
            <TableCell className="text-center no-print">{item.currentBags <= 0 && (<Button variant="outline" size="sm" onClick={() => onArchive(item)} title="Archive lot"><Archive className="h-4 w-4 mr-1" /> Archive</Button>)}</TableCell>
          </TableRow>))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
