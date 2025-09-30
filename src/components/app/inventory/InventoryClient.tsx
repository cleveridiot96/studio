
"use client";

import * as React from "react";
import Link from 'next/link';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, MasterItem, Warehouse, LocationTransfer, PurchaseReturn, SaleReturn, Supplier, PurchaseItem, SaleItem, LocationTransferItem } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive, Boxes, Printer, RotateCcw, PlusCircle, ArrowRightLeft, ShoppingCart, Warehouse as WarehouseIcon, DollarSign } from "lucide-react";
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
import { InventoryTable } from "./InventoryTable"; 
import { cn } from "@/lib/utils";
import { PartyBrokerLeaderboard } from "./PartyBrokerLeaderboard";
import { purchaseMigrator, salesMigrator } from '@/lib/dataMigrators';


const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData'; 
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData'; 
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';
const ARCHIVED_LOTS_STORAGE_KEY = 'archivedInventoryLotKeys';
const KEY_SEPARATOR = '_$_';
const DEAD_STOCK_THRESHOLD_DAYS = 180;

export interface AggregatedInventoryItem {
  key: string; // Unique key: lotNumber_$_locationId
  lotNumber: string;
  locationId: string;
  locationName: string;
  supplierId?: string;
  supplierName?: string;
  sourceType: 'Purchase' | 'Transfer';
  sourceDetails?: string;
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
  purchaseRate: number;
  effectiveRate: number;
  cogs: number; // Cost of Goods for remaining stock
  daysInStock?: number;
  turnoverRate?: number;
  isDeadStock?: boolean; 
}

export function InventoryClient() {
  const { financialYear, isAppHydrating } = useSettings();
  const { toast } = useToast();

  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray, purchaseMigrator);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray); 
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray, salesMigrator);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray); 
  const [warehouses] = useLocalStorageState<Warehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedEmptyArray);
  const [suppliers] = useLocalStorageState<Supplier[]>(SUPPLIERS_STORAGE_KEY, memoizedEmptyArray);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);
  const [archivedLotKeys, setArchivedLotKeys] = useLocalStorageState<string[]>(ARCHIVED_LOTS_STORAGE_KEY, []);

  const [itemToArchive, setItemToArchive] = React.useState<AggregatedInventoryItem | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const allAggregatedInventory = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];

    const inventoryMap = new Map<string, AggregatedInventoryItem>();

    const transactions = [
        ...purchases.map(p => ({ ...p, txType: 'purchase' as const })),
        ...purchaseReturns.map(pr => ({ ...pr, txType: 'purchaseReturn' as const })),
        ...locationTransfers.map(lt => ({ ...lt, txType: 'locationTransfer' as const })),
        ...sales.map(s => ({ ...s, txType: 'sale' as const })),
        ...saleReturns.map(sr => ({ ...sr, txType: 'saleReturn' as const }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const tx of transactions) {
        if (!isDateInFinancialYear(tx.date, financialYear)) continue;

        if (tx.txType === 'purchase') {
            (tx.items || []).forEach((item: PurchaseItem) => {
                const key = `${item.lotNumber}${KEY_SEPARATOR}${tx.locationId}`;
                const landedCost = item.landedCostPerKg || tx.effectiveRate;
                
                inventoryMap.set(key, {
                    key: key,
                    lotNumber: item.lotNumber,
                    locationId: tx.locationId,
                    locationName: tx.locationName || 'Unknown',
                    supplierId: tx.supplierId,
                    supplierName: tx.supplierName,
                    sourceType: 'Purchase',
                    totalPurchasedBags: item.quantity,
                    totalPurchasedWeight: item.netWeight,
                    totalSoldBags: 0,
                    totalSoldWeight: 0,
                    totalPurchaseReturnedBags: 0,
                    totalPurchaseReturnedWeight: 0,
                    totalSaleReturnedBags: 0,
                    totalSaleReturnedWeight: 0,
                    totalTransferredOutBags: 0,
                    totalTransferredOutWeight: 0,
                    totalTransferredInBags: 0,
                    totalTransferredInWeight: 0,
                    currentBags: item.quantity,
                    currentWeight: item.netWeight,
                    purchaseDate: tx.date,
                    purchaseRate: item.rate,
                    effectiveRate: landedCost,
                    cogs: item.netWeight * landedCost,
                });
            });
        } else if (tx.txType === 'purchaseReturn') {
            const originalPurchase = purchases.find(p => p.id === tx.originalPurchaseId);
            if (originalPurchase) {
                const key = `${tx.originalLotNumber}${KEY_SEPARATOR}${originalPurchase.locationId}`;
                const entry = inventoryMap.get(key);
                if (entry) {
                    entry.totalPurchaseReturnedBags += tx.quantityReturned;
                    entry.totalPurchaseReturnedWeight += tx.netWeightReturned;
                }
            }
        } else if (tx.txType === 'locationTransfer') {
            (tx.items || []).forEach((item: LocationTransferItem) => {
                const fromKey = `${item.originalLotNumber}${KEY_SEPARATOR}${tx.fromWarehouseId}`;
                const fromEntry = inventoryMap.get(fromKey);

                if (fromEntry) {
                    fromEntry.totalTransferredOutBags += item.bagsToTransfer;
                    fromEntry.totalTransferredOutWeight += item.netWeightToTransfer;

                    const toKey = `${item.newLotNumber}${KEY_SEPARATOR}${tx.toWarehouseId}`;
                    let toEntry = inventoryMap.get(toKey);
                    
                    const perKgExpense = tx.perKgExpense || 0;
                    const newEffectiveRate = (item.preTransferLandedCost || 0) + perKgExpense;

                    if (!toEntry) {
                        toEntry = {
                          key: toKey,
                          ...fromEntry, // Copy details from source
                          lotNumber: item.newLotNumber,
                          locationId: tx.toWarehouseId,
                          locationName: tx.toWarehouseName || 'Unknown',
                          sourceType: 'Transfer',
                          sourceDetails: `From ${tx.fromWarehouseName}`,
                          totalPurchasedBags: 0,
                          totalPurchasedWeight: 0,
                          totalSoldBags: 0,
                          totalSoldWeight: 0,
                          totalPurchaseReturnedBags: 0,
                          totalPurchaseReturnedWeight: 0,
                          totalSaleReturnedBags: 0,
                          totalSaleReturnedWeight: 0,
                          totalTransferredOutBags: 0,
                          totalTransferredOutWeight: 0,
                          totalTransferredInBags: 0,
                          totalTransferredInWeight: 0,
                          currentBags: 0,
                          currentWeight: 0,
                          purchaseDate: tx.date, // Set purchase date to transfer date
                          effectiveRate: newEffectiveRate,
                          cogs: 0,
                        };
                    }
                    
                    toEntry.totalTransferredInBags += item.bagsToTransfer;
                    toEntry.totalTransferredInWeight += item.netWeightToTransfer;
                    toEntry.effectiveRate = newEffectiveRate; // Update rate in case of multiple transfers to same lot
                    inventoryMap.set(toKey, toEntry);
                }
            });
        } else if (tx.txType === 'sale') {
            (tx.items || []).forEach((item: SaleItem) => {
                const saleLotKey = Array.from(inventoryMap.keys()).find(k => k.startsWith(item.lotNumber + KEY_SEPARATOR));
                if (saleLotKey) {
                    const entry = inventoryMap.get(saleLotKey);
                    if (entry) {
                        entry.totalSoldBags += item.quantity;
                        entry.totalSoldWeight += item.netWeight;
                    }
                }
            });
        }
    }
    
    const result: AggregatedInventoryItem[] = [];
    inventoryMap.forEach(item => {
      item.currentBags = item.totalPurchasedBags + item.totalTransferredInBags + item.totalSaleReturnedBags
                        - item.totalSoldBags - item.totalTransferredOutBags - item.totalPurchaseReturnedBags;
      item.currentWeight = item.totalPurchasedWeight + item.totalTransferredInWeight + item.totalSaleReturnedWeight
                        - item.totalSoldWeight - item.totalTransferredOutWeight - item.totalPurchaseReturnedWeight;
      
      item.cogs = item.currentWeight * item.effectiveRate;

      if (item.purchaseDate) {
        item.daysInStock = Math.floor((new Date().getTime() - new Date(item.purchaseDate).getTime()) / (1000 * 3600 * 24));
      }
      const totalInitialBagsForTurnover = item.totalPurchasedBags + item.totalTransferredInBags;
      item.turnoverRate = totalInitialBagsForTurnover > 0 ? ((item.totalSoldBags + item.totalTransferredOutBags) / totalInitialBagsForTurnover) * 100 : 0;
      item.isDeadStock = item.currentBags > 0 && item.daysInStock !== undefined && item.daysInStock > DEAD_STOCK_THRESHOLD_DAYS;
      
      if (item.totalPurchasedBags > 0 || item.totalTransferredInBags > 0 || item.currentBags > -0.001) {
        result.push(item);
      }
    });

    return result.sort((a,b) => a.lotNumber.localeCompare(b.lotNumber) || a.locationName.localeCompare(b.locationName));
  }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, hydrated, isAppHydrating, financialYear]);
  
  const activeInventory = React.useMemo(() => {
    return allAggregatedInventory.filter(item => !archivedLotKeys.includes(item.key));
  }, [allAggregatedInventory, archivedLotKeys]);

  const archivedInventory = React.useMemo(() => {
    return allAggregatedInventory.filter(item => archivedLotKeys.includes(item.key));
  }, [allAggregatedInventory, archivedLotKeys]);

  const warehouseSummary = React.useMemo(() => {
    const summary: Record<string, { id: string; name: string; bags: number; netWeight: number; totalValue: number }> = {};
    activeInventory.forEach(item => {
      if (item.currentBags > 0) {
        if (!summary[item.locationId]) {
          summary[item.locationId] = { id: item.locationId, name: item.locationName, bags: 0, netWeight: 0, totalValue: 0 };
        }
        summary[item.locationId].bags += item.currentBags;
        summary[item.locationId].netWeight += item.currentWeight;
        summary[item.locationId].totalValue += item.cogs;
      }
    });
    return Object.values(summary).sort((a,b) => a.name.localeCompare(b.name));
  }, [activeInventory]);

  const filteredActiveInventory = React.useMemo(() => {
    if (!selectedWarehouseId) return activeInventory;
    return activeInventory.filter(item => item.locationId === selectedWarehouseId);
  }, [activeInventory, selectedWarehouseId]);

  const filteredArchivedInventory = React.useMemo(() => {
    if (!selectedWarehouseId) return archivedInventory;
    return archivedInventory.filter(item => item.locationId === selectedWarehouseId);
  }, [archivedInventory, selectedWarehouseId]);

  const handleArchiveAttempt = (item: AggregatedInventoryItem) => {
    if (item.currentBags <= 0.001) { setItemToArchive(item); setShowArchiveConfirm(true); }
    else { toast({ title: "Cannot Archive", description: `Lot "${item.lotNumber}" has stock. Only zero-stock can be archived.`, variant: "destructive" }); }
  };
  const confirmArchiveItem = () => {
    if (itemToArchive) {
      setArchivedLotKeys(prev => [...prev, itemToArchive.key]);
      toast({ title: "Lot Archived", description: `Lot "${itemToArchive.lotNumber}" at ${itemToArchive.locationName} has been archived.` });
      setItemToArchive(null); setShowArchiveConfirm(false);
    }
  };
  const handleUnarchiveItem = (item: AggregatedInventoryItem) => {
    setArchivedLotKeys(prev => prev.filter(key => key !== item.key));
    toast({ title: "Lot Restored", description: `Lot "${item.lotNumber}" has been restored to the active inventory view.` });
  };

  const getActiveFilterName = () => {
    if (!selectedWarehouseId) return "All Warehouses";
    return warehouses.find(w => w.id === selectedWarehouseId)?.name || "Selected Warehouse";
  };

  if (isAppHydrating || !hydrated) return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading inventory...</p></div>;

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Inventory Dashboard (FY {financialYear})</h1>
        <div className="flex items-center gap-2">
           <Button asChild variant="outline"><Link href="/purchases"><PlusCircle className="mr-2 h-4 w-4" />New Purchase</Link></Button>
           <Button asChild variant="outline"><Link href="/location-transfer"><ArrowRightLeft className="mr-2 h-4 w-4" />Transfer Stock</Link></Button>
           <Button asChild><Link href="/sales"><ShoppingCart className="mr-2 h-4 w-4" />Sell Stock</Link></Button>
           <Button variant="outline" size="icon" onClick={() => window.print()}><Printer className="h-5 w-5" /><span className="sr-only">Print</span></Button>
        </div>
      </div>
      
      <div className="no-print">
        <h2 className="text-xl font-semibold text-foreground mb-3">Warehouse Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <button
                onClick={() => setSelectedWarehouseId(null)}
                className={cn(
                    "p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left flex flex-col justify-between h-full",
                    !selectedWarehouseId ? 'ring-2 ring-primary bg-primary/10' : 'bg-card'
                )}
            >
                <CardTitle className="text-lg flex items-center gap-2"><WarehouseIcon className="h-5 w-5 text-primary"/>All Warehouses</CardTitle>
                <div>
                  <p className="text-2xl font-bold">{Math.round(activeInventory.reduce((sum, item) => sum + item.currentBags, 0)).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">BAGS</span></p>
                  <p className="text-sm text-muted-foreground">{activeInventory.reduce((sum, item) => sum + item.currentWeight, 0).toLocaleString()} KG</p>
                  <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1 mt-1"><DollarSign className="h-3 w-3"/>{Math.round(activeInventory.reduce((sum, item) => sum + item.cogs, 0)).toLocaleString('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0})}</p>
                </div>
            </button>
            {warehouseSummary.map(wh => (
              <button
                key={wh.id}
                onClick={() => setSelectedWarehouseId(wh.id)}
                className={cn(
                    "p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left flex flex-col justify-between h-full",
                    selectedWarehouseId === wh.id ? 'ring-2 ring-primary bg-primary/10' : 'bg-card'
                )}
              >
                  <CardTitle className="text-lg">{wh.name}</CardTitle>
                  <div>
                    <p className="text-2xl font-bold">{Math.round(wh.bags).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">BAGS</span></p>
                    <p className="text-sm text-muted-foreground">{wh.netWeight.toLocaleString()} KG</p>
                    <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1 mt-1"><DollarSign className="h-3 w-3"/>{Math.round(wh.totalValue).toLocaleString('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0})}</p>
                  </div>
              </button>
            ))}
           {warehouseSummary.length === 0 && <p className="text-muted-foreground col-span-full">No active stock in any warehouse.</p>}
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full pt-6">
        <TabsList className="grid w-full grid-cols-2 h-auto no-print">
          <TabsTrigger value="active" className="py-2 sm:py-3 text-sm sm:text-base"><Boxes className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Vakkal-Wise Stock Table</TabsTrigger>
          <TabsTrigger value="archived" className="py-2 sm:py-3 text-sm sm:text-base"><Archive className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> Archived Vakkals</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          <Card className="shadow-lg"><CardHeader><CardTitle>Active Inventory: {getActiveFilterName()}</CardTitle></CardHeader><CardContent><InventoryTable items={filteredActiveInventory} onArchive={handleArchiveAttempt} /></CardContent></Card>
        </TabsContent>
         <TabsContent value="archived" className="mt-6">
          <Card className="shadow-lg"><CardHeader><CardTitle>Archived Stock: {getActiveFilterName()}</CardTitle><CardDescription>These lots have a zero balance and are hidden from the main view. They can be restored.</CardDescription></CardHeader><CardContent><InventoryTable items={filteredArchivedInventory} onArchive={handleArchiveAttempt} onUnarchive={handleUnarchiveItem} isArchivedView={true} /></CardContent></Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 no-print">
        <PartyBrokerLeaderboard items={allAggregatedInventory} />
      </div>

      {itemToArchive && (<AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Archive Vakkal/Lot?</AlertDialogTitle><AlertDialogDescription>This action will hide the lot "<strong>{itemToArchive.lotNumber}</strong>" from the main inventory view. You can view and restore it from the "Archived" tab.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setItemToArchive(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmArchiveItem} className="bg-blue-600 hover:bg-blue-700">Archive</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
    </div>
  );
}
