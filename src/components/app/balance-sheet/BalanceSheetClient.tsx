
"use client";

import React, { useMemo } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, LocationTransfer } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Landmark, Package, Rocket, TrendingDown, TrendingUp } from 'lucide-react';
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { salesMigrator, purchaseMigrator } from '@/lib/dataMigrators';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useOutstandingBalances } from '@/hooks/useOutstandingBalances';

// All the data keys
const keys = {
  purchases: 'purchasesData',
  purchaseReturns: 'purchaseReturnsData',
  sales: 'salesData',
  saleReturns: 'saleReturnsData',
  locationTransfers: 'locationTransfersData',
};

export const BalanceSheetClient = () => {
    const [hydrated, setHydrated] = React.useState(false);
    const { financialYear: currentFinancialYearString, isAppHydrating } = useSettings();
    const { receivableParties, payableParties, isBalancesLoading } = useOutstandingBalances();
    React.useEffect(() => { setHydrated(true) }, []);

    // Load all data from all time
    const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, [], purchaseMigrator);
    const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(keys.purchaseReturns, []);
    const [sales] = useLocalStorageState<Sale[]>(keys.sales, [], salesMigrator);
    const [saleReturns] = useLocalStorageState<SaleReturn[]>(keys.saleReturns, []);
    const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(keys.locationTransfers, []);
    
    // --- 1. Stock Valuation Logic ---
    const { totalStockValue, totalStockBags } = useMemo(() => {
        if (isAppHydrating || !hydrated) return { totalStockValue: 0, totalStockBags: 0 };
    
        const inventoryMap = new Map<string, { currentWeight: number; cogs: number; currentBags: number }>();
    
        const fyPurchases = purchases.filter(p => isDateInFinancialYear(p.date, currentFinancialYearString));
        fyPurchases.forEach(p => {
            p.items.forEach(item => {
                const key = `${item.lotNumber}-${p.locationId}`;
                const landedCost = item.landedCostPerKg || p.effectiveRate;
                const existing = inventoryMap.get(key) || { currentWeight: 0, cogs: 0, currentBags: 0 };
                existing.currentWeight += item.netWeight;
                existing.currentBags += item.quantity;
                existing.cogs += item.netWeight * landedCost;
                inventoryMap.set(key, existing);
            });
        });

        const fyPurchaseReturns = purchaseReturns.filter(pr => isDateInFinancialYear(pr.date, currentFinancialYearString));
        fyPurchaseReturns.forEach(pr => {
            const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
            if (originalPurchase) {
                const key = `${pr.originalLotNumber}-${originalPurchase.locationId}`;
                const entry = inventoryMap.get(key);
                if (entry && entry.currentWeight > 0) {
                    const costPerKg = entry.cogs / entry.currentWeight;
                    entry.currentWeight -= pr.netWeightReturned;
                    entry.currentBags -= pr.quantityReturned;
                    entry.cogs -= pr.netWeightReturned * costPerKg;
                }
            }
        });

        const fyLocationTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, currentFinancialYearString));
        fyLocationTransfers.forEach(transfer => {
            transfer.items.forEach(item => {
                const fromKey = `${item.originalLotNumber}-${transfer.fromWarehouseId}`;
                const fromItem = inventoryMap.get(fromKey);
                if (fromItem && fromItem.currentWeight > 0) {
                    const costPerKg = fromItem.cogs / fromItem.currentWeight;
                    const costOfTransferredGoods = item.netWeightToTransfer * costPerKg;
                    fromItem.currentWeight -= item.netWeightToTransfer;
                    fromItem.currentBags -= item.bagsToTransfer;
                    fromItem.cogs -= costOfTransferredGoods;
                    
                    const toKey = `${item.newLotNumber}-${transfer.toWarehouseId}`;
                    let toItem = inventoryMap.get(toKey);
                    if (!toItem) {
                        toItem = { currentWeight: 0, cogs: 0, currentBags: 0 };
                    }
                    
                    const perKgExpense = (transfer.perKgExpense || 0);
                    toItem.currentWeight += item.netWeightToTransfer;
                    toItem.currentBags += item.bagsToTransfer;
                    toItem.cogs += costOfTransferredGoods + (perKgExpense * item.netWeightToTransfer);
                    inventoryMap.set(toKey, toItem);
                }
            });
        });

        const fySales = sales.filter(s => isDateInFinancialYear(s.date, currentFinancialYearString));
        fySales.forEach(s => {
            s.items.forEach(item => {
                const saleLotKey = Array.from(inventoryMap.keys()).find(k => k.startsWith(item.lotNumber));
                const entry = saleLotKey ? inventoryMap.get(saleLotKey) : undefined;
                if (entry && entry.currentWeight > 0) {
                    const costPerKg = entry.cogs / entry.currentWeight;
                    entry.cogs -= item.netWeight * costPerKg;
                    entry.currentWeight -= item.netWeight;
                    entry.currentBags -= item.quantity;
                }
            });
        });

        const fySaleReturns = saleReturns.filter(sr => isDateInFinancialYear(sr.date, currentFinancialYearString));
        fySaleReturns.forEach(sr => {
            const saleReturnLotKey = Array.from(inventoryMap.keys()).find(k => k.startsWith(sr.originalLotNumber));
            const entry = saleReturnLotKey ? inventoryMap.get(saleReturnLotKey) : undefined;
            if (entry) {
                const originalSale = sales.find(s => s.id === sr.originalSaleId);
                const originalItem = originalSale?.items.find(i => i.lotNumber === sr.originalLotNumber);
                const costOfReturnedGoods = originalItem?.costOfGoodsSold || 0;
                entry.currentWeight += sr.netWeightReturned;
                entry.currentBags += sr.quantityReturned;
                entry.cogs += costOfReturnedGoods;
            }
        });

        let totalValue = 0;
        let totalBags = 0;
        inventoryMap.forEach(item => {
            if (item.currentWeight > 0.001) {
                totalValue += item.cogs;
                totalBags += item.currentBags;
            }
        });

        return { totalStockValue: totalValue, totalStockBags: totalBags };
    }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, hydrated, isAppHydrating, currentFinancialYearString]);


    // --- 2. Receivables & Payables Logic ---
    const { totalReceivable, totalPayable, receivablePartiesCount, payablePartiesCount } = useMemo(() => {
      const totalReceivable = receivableParties.reduce((sum, p) => sum + (p.balance || 0), 0);
      const totalPayable = payableParties.reduce((sum, p) => sum + Math.abs(p.balance || 0), 0);

      return {
        totalReceivable,
        totalPayable,
        receivablePartiesCount: receivableParties.length,
        payablePartiesCount: payableParties.length
      }
    }, [receivableParties, payableParties]);


    // --- 3. Profit Logic ---
    const { totalNetProfit, totalGrossProfit, totalKgSold } = useMemo(() => {
        if (!hydrated) return { totalNetProfit: 0, totalGrossProfit: 0, totalKgSold: 0 };
        const fySales = sales.filter(sale => sale && isDateInFinancialYear(sale.date, currentFinancialYearString));
        const totalNetProfit = fySales.reduce((sum, sale) => sum + (sale.totalCalculatedProfit || 0), 0);
        const totalGrossProfit = fySales.reduce((sum, sale) => sum + (sale.totalGrossProfit || 0), 0);
        const totalKgSold = fySales.reduce((sum, sale) => sum + (sale.totalNetWeight || 0), 0);
        return { totalNetProfit, totalGrossProfit, totalKgSold };
    }, [sales, hydrated, currentFinancialYearString]);


    if (isAppHydrating || !hydrated || isBalancesLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <p className="text-lg text-muted-foreground">Calculating financial summary...</p>
            </div>
        );
    }
    
    return (
      <div className="space-y-6">
          <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold text-foreground uppercase flex items-center">
                  <Landmark className="mr-3 h-8 w-8 text-primary" /> Financial Summary (FY {currentFinancialYearString})
              </h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/inventory">
                  <Card className="hover:bg-muted/50 transition-colors">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium uppercase">Stock Value</CardTitle>
                          <Package className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">₹{Math.round(totalStockValue).toLocaleString('en-IN')}</div>
                          <p className="text-xs text-muted-foreground">{Math.round(totalStockBags).toLocaleString()} bags in total</p>
                      </CardContent>
                  </Card>
              </Link>
              <Link href="/outstanding">
                  <Card className="hover:bg-muted/50 transition-colors">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium uppercase">Receivables</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">₹{Math.round(totalReceivable).toLocaleString('en-IN')}</div>
                          <p className="text-xs text-muted-foreground">From {receivablePartiesCount} parties</p>
                      </CardContent>
                  </Card>
              </Link>
              <Link href="/outstanding">
                  <Card className="hover:bg-muted/50 transition-colors">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium uppercase">Payables</CardTitle>
                          <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">₹{Math.round(totalPayable).toLocaleString('en-IN')}</div>
                          <p className="text-xs text-muted-foreground">To {payablePartiesCount} parties</p>
                      </CardContent>
                  </Card>
              </Link>
              <Link href="/profit-analysis">
                  <Card className="hover:bg-muted/50 transition-colors">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium uppercase">Net Profit</CardTitle>
                          <Rocket className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">₹{Math.round(totalNetProfit).toLocaleString('en-IN')}</div>
                          <p className="text-xs text-muted-foreground">{totalKgSold.toLocaleString()} kg sold this FY</p>
                      </CardContent>
                  </Card>
              </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Gross Profit</CardTitle>
                    <CardDescription>Profit before any operating expenses, interest, or taxes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{Math.round(totalGrossProfit).toLocaleString('en-IN')}</div>
                    <p className="text-xs text-muted-foreground">(Total Goods Value of Sales) - (Base Purchase Cost of Goods)</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Business Snapshot</CardTitle>
                    <CardDescription>Key financial indicators.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Assets (Stock + Receivables):</span>
                       <span className="font-semibold">₹{Math.round(totalStockValue + totalReceivable).toLocaleString('en-IN')}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Liabilities (Payables):</span>
                       <span className="font-semibold">₹{Math.round(totalPayable).toLocaleString('en-IN')}</span>
                   </div>
                   <div className="flex justify-between font-bold border-t pt-2 mt-2">
                       <span>Provisional Net Position:</span>
                       <span>₹{Math.round(totalStockValue + totalReceivable - totalPayable).toLocaleString('en-IN')}</span>
                   </div>
                </CardContent>
            </Card>
          </div>
      </div>
    );
}
