
"use client";
import React from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { isDateInFinancialYear } from '@/lib/utils';
import type { Purchase, Sale, LocationTransfer, PurchaseReturn, SaleReturn } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Warehouse } from 'lucide-react';
import Link from 'next/link';

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
  React.useEffect(() => { setHydrated(true) }, []);

  const lowStockWarehouses = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];
    
    const stockMap = new Map<string, { bags: number, name: string }>();

    const processTransactions = (items: any[], type: 'in' | 'out', lotMap: Map<string, string>) => {
      items.forEach(item => {
        const locationId = type === 'in' ? item.locationId || item.toWarehouseId : item.locationId || item.fromWarehouseId;
        const locationName = type === 'in' ? item.locationName || item.toWarehouseName : item.locationName || item.fromWarehouseName;
        const bags = type === 'in' ? (item.quantity || item.bagsToTransfer) : -(item.quantity || item.bagsToTransfer);
        
        if (locationId) {
          const current = stockMap.get(locationId) || { bags: 0, name: locationName || locationId };
          current.bags += bags;
          current.name = locationName || current.name;
          stockMap.set(locationId, current);
        }
      });
    };
    
    const allPurchases = purchases.filter(p => isDateInFinancialYear(p.date, financialYear));
    allPurchases.forEach(p => processTransactions(p.items, 'in', new Map()));

    const allTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, financialYear));
    allTransfers.forEach(lt => {
      processTransactions(lt.items.map(i => ({...i, fromWarehouseId: lt.fromWarehouseId, fromWarehouseName: lt.fromWarehouseName})), 'out', new Map());
      processTransactions(lt.items.map(i => ({...i, toWarehouseId: lt.toWarehouseId, toWarehouseName: lt.toWarehouseName})), 'in', new Map());
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


    const lowWarehouses = [];
    for (const [id, data] of stockMap.entries()) {
      if (data.bags < lowStockThreshold) {
        lowWarehouses.push({ id, name: data.name, bags: data.bags });
      }
    }
    return lowWarehouses;
  }, [
    purchases, sales, locationTransfers, purchaseReturns, saleReturns, 
    lowStockThreshold, financialYear, isAppHydrating, hydrated
  ]);

  if (lowStockWarehouses.length === 0) {
    return null;
  }

  return (
    <Link href="/inventory" className="block my-4">
        <Card className="bg-destructive/10 border-destructive shadow-lg hover:shadow-xl transition-shadow cursor-pointer animate-pulse">
        <CardHeader>
            <CardTitle className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            LOW STOCK WARNING
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-destructive-foreground font-semibold">The following warehouses are below the {lowStockThreshold} bag threshold:</p>
            <ul className="list-disc pl-5 mt-2 text-destructive-foreground font-medium grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4">
            {lowStockWarehouses.map(wh => (
                <li key={wh.id} className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4"/>
                    {wh.name}: {Math.round(wh.bags)} BAGS
                </li>
            ))}
            </ul>
            <p className="text-sm text-destructive-foreground/80 mt-2">Click to view inventory and restock.</p>
        </CardContent>
        </Card>
    </Link>
  );
};
