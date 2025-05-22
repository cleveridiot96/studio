
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, Warehouse, LocationTransfer } from "@/lib/types"; // Removed MasterItem as Warehouse is more specific
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Archive, Boxes, Printer, TrendingDown, TrendingUp, Building } from "lucide-react"; // AlertTriangle removed, Building added
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
}

export function InventoryClient() {
  const { financialYear, isAppHydrating } = useSettings(); 
  
  const memoizedEmptyTransactions = React.useMemo(() => [], []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyTransactions);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyTransactions);
  const [warehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyMasters);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyTransactions);

  const { toast } = useToast();

  const [itemToArchive, setItemToArchive] = React.useState<AggregatedInventoryItem | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);
  const [notifiedLowStock, setNotifiedLowStock] = React.useState<Set<string>>(new Set());

  const aggregatedInventory = React.useMemo(() => {
    if (isAppHydrating) return [];
    const inventoryMap = new Map<string, AggregatedInventoryItem>();

    const fyPurchases = purchases.filter(p => p && p.date && isDateInFinancialYear(p.date, financialYear));
    const fySales = sales.filter(s => s && s.date && isDateInFinancialYear(s.date, financialYear));
    const fyLocationTransfers = locationTransfers.filter(lt => lt && lt.date && isDateInFinancialYear(lt.date, financialYear));

    fyPurchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`;
      let entry = inventoryMap.get(key);
      if (!entry) {
        entry = {
          lotNumber: p.lotNumber,
          locationId: p.locationId,
          locationName: warehouses.find(w => w.id === p.locationId)?.name || p.locationId,
          totalPurchasedBags: 0, totalPurchasedWeight: 0,
          totalSoldBags: 0, totalSoldWeight: 0,
          totalTransferredOutBags: 0, totalTransferredOutWeight: 0,
          totalTransferredInBags: 0, totalTransferredInWeight: 0,
          currentBags: 0, currentWeight: 0,
          purchaseDate: p.date, purchaseRate: p.rate,
        };
      }
      entry.totalPurchasedBags += p.quantity;
      entry.totalPurchasedWeight += p.netWeight;
      if (!entry.purchaseDate || new Date(p.date) < new Date(entry.purchaseDate)) {
        entry.purchaseDate = p.date;
        entry.purchaseRate = p.rate;
      }
      inventoryMap.set(key, entry);
    });

    fySales.forEach(s => {
      const relatedPurchase = fyPurchases.find(p => p.lotNumber === s.lotNumber && p.locationId);
      if (relatedPurchase) {
        const key = `${s.lotNumber}-${relatedPurchase.locationId}`;
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.totalSoldBags += s.quantity;
          entry.totalSoldWeight += s.netWeight;
        } else {
          // This case should ideally not happen if sales always derive from a purchase in a location.
          // If it does, it means a sale was recorded for a lot/location combo that had no initial purchase in the map.
          // For robustness, one might create a negative stock entry, but for now, we assume sales link to existing purchase-derived entries.
        }
      }
    });

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
          const sourcePurchase = fyPurchases.find(p => p.lotNumber === item.lotNumber);
          toEntry = {
            lotNumber: item.lotNumber,
            locationId: transfer.toWarehouseId,
            locationName: warehouses.find(w => w.id === transfer.toWarehouseId)?.name || transfer.toWarehouseId,
            totalPurchasedBags: 0, totalPurchasedWeight: 0,
            totalSoldBags: 0, totalSoldWeight: 0,
            totalTransferredOutBags: 0, totalTransferredOutWeight: 0,
            totalTransferredInBags: 0, totalTransferredInWeight: 0,
            currentBags: 0, currentWeight: 0,
            purchaseDate: sourcePurchase?.date, purchaseRate: sourcePurchase?.rate, 
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
      
      // Only include items that have history or current stock
      if (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0 || item.currentBags > 0) {
         result.push(item);
      }
    });
    return result.sort((a,b) => a.lotNumber.localeCompare(b.lotNumber) || a.locationName.localeCompare(b.locationName));
  }, [purchases, sales, warehouses, locationTransfers, financialYear, isAppHydrating]);

  React.useEffect(() => {
    if(isAppHydrating) return;
    const newNotified = new Set(notifiedLowStock);
    aggregatedInventory.forEach(item => {
      const itemKey = `${item.lotNumber}-${item.locationId}`;
      if (item.currentBags > 0 && item.currentBags <= 5 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey)) {
        toast({
          title: "Low Stock Alert",
          description: `Lot "${item.lotNumber}" at ${item.locationName} has only ${item.currentBags} bags remaining.`,
          variant: "default", duration: 7000,
        });
        newNotified.add(itemKey);
      } else if (item.currentBags <= 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && !notifiedLowStock.has(itemKey + "-zero")) {
         toast({
          title: "Zero Stock: Archive Option",
          description: `Lot "${item.lotNumber}" at ${item.locationName} has zero bags. Consider archiving.`,
          variant: "default", duration: 7000,
        });
        newNotified.add(itemKey + "-zero");
      }
    });
    if (newNotified.size !== notifiedLowStock.size) {
        setNotifiedLowStock(newNotified);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregatedInventory, toast, isAppHydrating]); // Removed notifiedLowStock, setNotifiedLowStock, to prevent loops; manage within effect


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
      toast({
        title: "Lot Archived (Conceptual)",
        description: `Lot "${itemToArchive.lotNumber}" at ${itemToArchive.locationName} would be moved to archives. This feature is conceptual.`,
      });
      setItemToArchive(null);
      setShowArchiveConfirm(false);
    }
  };
  
  const activeWarehouses = warehouses.filter(wh => aggregatedInventory.some(item => item.locationId === wh.id && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0 || item.currentBags > 0)));

  if (isAppHydrating) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p className="text-lg text-muted-foreground">Loading inventory data...</p></div>;
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
               <Building className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> {wh.name}
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
              <TableCell className="text-center no-print">
                {item.currentBags <= 0 && (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0) && ( // Only show archive if it had stock previously
                  <Button variant="outline" size="sm" onClick={() => onArchive(item)} title="Archive this zero-stock lot">
                    <Archive className="h-4 w-4 mr-1" /> Archive
                  </Button>
                )}
                 {item.currentBags > 0 && item.currentBags <=5 && (
                    <Badge variant="default" className="bg-yellow-500 text-yellow-900 dark:text-yellow-300 dark:bg-yellow-700">Low Stock</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
