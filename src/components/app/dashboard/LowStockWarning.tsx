
"use client";

import React from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { isDateInFinancialYear } from '@/lib/utils';
import type { Purchase, Sale, LocationTransfer, PurchaseReturn, SaleReturn } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';

const KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  locationTransfers: 'locationTransfersData',
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
};

export const LowStockWarning = () => {
  const { lowStockThreshold, financialYear, isAppHydrating } = useSettings();
  
  const [purchases] = useLocalStorageState<Purchase[]>(KEYS.purchases, []);
  const [sales] = useLocalStorageState<Sale[]>(KEYS.sales, []);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(KEYS.locationTransfers, []);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(KEYS.purchaseReturns, []);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(KEYS.saleReturns, []);
  
  const [hydrated, setHydrated] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => { setHydrated(true) }, []);

  const lowStockWarehouses = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];
    
    const stockMap = new Map<string, { bags: number, name: string }>();

    const allPurchases = purchases.filter(p => isDateInFinancialYear(p.date, financialYear));
    allPurchases.forEach(p => {
        p.items.forEach(item => {
            const current = stockMap.get(p.locationId) || { bags: 0, name: p.locationName || p.locationId };
            current.bags += item.quantity;
            current.name = p.locationName || current.name;
            stockMap.set(p.locationId, current);
        });
    });
    
    const allSales = sales.filter(s => isDateInFinancialYear(s.date, financialYear));
    allSales.forEach(s => {
        s.items.forEach(item => {
            const purchaseOrigin = allPurchases.find(p => p.items.some(pi => pi.lotNumber === item.lotNumber));
            if(purchaseOrigin){
                 const current = stockMap.get(purchaseOrigin.locationId) || { bags: 0, name: purchaseOrigin.locationName || purchaseOrigin.locationId };
                 current.bags -= item.quantity;
                 stockMap.set(purchaseOrigin.locationId, current);
            }
        });
    });

    const allPurchaseReturns = purchaseReturns.filter(pr => isDateInFinancialYear(pr.date, financialYear));
    allPurchaseReturns.forEach(pr => {
        const purchaseOrigin = allPurchases.find(p => p.id === pr.originalPurchaseId);
        if(purchaseOrigin) {
            const current = stockMap.get(purchaseOrigin.locationId) || { bags: 0, name: purchaseOrigin.locationName || purchaseOrigin.locationId };
            current.bags -= pr.quantityReturned;
            stockMap.set(purchaseOrigin.locationId, current);
        }
    });
    
    const allSaleReturns = saleReturns.filter(sr => isDateInFinancialYear(sr.date, financialYear));
    allSaleReturns.forEach(sr => {
         const saleOrigin = allSales.find(s => s.id === sr.originalSaleId);
         if(saleOrigin){
             const purchaseOrigin = allPurchases.find(p => p.items.some(pi => pi.lotNumber === saleOrigin.items[0].lotNumber));
             if(purchaseOrigin){
                const current = stockMap.get(purchaseOrigin.locationId) || { bags: 0, name: purchaseOrigin.locationName || purchaseOrigin.locationId };
                current.bags += sr.quantityReturned;
                stockMap.set(purchaseOrigin.locationId, current);
            }
         }
    });

    const allTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    allTransfers.forEach(transfer => {
        transfer.items.forEach(item => {
            // Subtract from source
            const fromWarehouseId = transfer.fromWarehouseId;
            const fromWarehouseName = transfer.fromWarehouseName;
            const fromCurrent = stockMap.get(fromWarehouseId) || { bags: 0, name: fromWarehouseName || fromWarehouseId };
            fromCurrent.bags -= item.bagsToTransfer;
            stockMap.set(fromWarehouseId, fromCurrent);

            // Add to destination
            const toWarehouseId = transfer.toWarehouseId;
            const toWarehouseName = transfer.toWarehouseName;
            const toCurrent = stockMap.get(toWarehouseId) || { bags: 0, name: toWarehouseName || toWarehouseId };
            toCurrent.bags += item.bagsToTransfer;
            stockMap.set(toWarehouseId, toCurrent);
        });
    });

    const lowWarehouses = [];
    for (const [id, data] of stockMap.entries()) {
      if (data.bags < lowStockThreshold) {
        lowWarehouses.push({ id, name: data.name, bags: data.bags });
      }
    }
    return lowWarehouses;
  }, [purchases, sales, locationTransfers, purchaseReturns, saleReturns, lowStockThreshold, financialYear, isAppHydrating, hydrated]);

  React.useEffect(() => {
    if (lowStockWarehouses.length > 0) {
      setIsOpen(true);
    }
  }, [lowStockWarehouses]);


  if (lowStockWarehouses.length === 0) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            LOW STOCK WARNING
          </AlertDialogTitle>
          <AlertDialogDescription>
            The following warehouses have stock levels below the threshold of {lowStockThreshold} bags.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
            <ul className="list-disc pl-5 space-y-2 text-foreground font-medium">
                {lowStockWarehouses.map(wh => (
                    <li key={wh.id} className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground"/>
                        {wh.name}: {Math.round(wh.bags)} BAGS
                    </li>
                ))}
            </ul>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setIsOpen(false)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
