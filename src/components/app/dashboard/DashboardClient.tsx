'use client';

import * as React from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, Warehouse as MasterWarehouse } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { DollarSign, ShoppingBag, Package, BarChart3 } from 'lucide-react';

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';

interface SummaryData {
  totalAmount: number;
  totalBags: number;
  totalNetWeight: number;
}

interface StockSummary {
  totalBags: number;
  totalNetWeight: number;
  byLocation: Record<string, { name: string; bags: number; netWeight: number }>;
}

interface ProfitData {
    grossProfit: number;
    transactions: any[]; 
    monthly: Record<string, number>;
}


const DashboardClient = () => {
  const [hydrated, setHydrated] = React.useState(false);
  
  const memoizedInitialPurchases = React.useMemo(() => [], []);
  const memoizedInitialSales = React.useMemo(() => [], []);
  const memoizedInitialWarehouses = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedInitialSales);
  const [warehouses] = useLocalStorageState<MasterWarehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedInitialWarehouses);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const salesSummary = React.useMemo<SummaryData>(() => {
    if (!hydrated) return { totalAmount: 0, totalBags: 0, totalNetWeight: 0 };
    return sales.reduce((acc, sale) => {
      acc.totalAmount += sale.totalAmount || 0;
      acc.totalBags += sale.quantity || 0;
      acc.totalNetWeight += sale.netWeight || 0;
      return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
  }, [sales, hydrated]);

  const purchaseSummary = React.useMemo<SummaryData>(() => {
    if (!hydrated) return { totalAmount: 0, totalBags: 0, totalNetWeight: 0 };
    return purchases.reduce((acc, purchase) => {
      acc.totalAmount += purchase.totalAmount || 0;
      acc.totalBags += purchase.quantity || 0;
      acc.totalNetWeight += purchase.netWeight || 0;
      return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
  }, [purchases, hydrated]);

  const stockSummary = React.useMemo<StockSummary>(() => {
    if (!hydrated) return { totalBags: 0, totalNetWeight: 0, byLocation: {} };
    
    const inventoryMap = new Map<string, { lotNumber: string, locationId: string, currentBags: number, currentWeight: number }>();

    purchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`;
      let entry = inventoryMap.get(key) || { lotNumber: p.lotNumber, locationId: p.locationId, currentBags: 0, currentWeight: 0 };
      entry.currentBags += p.quantity;
      entry.currentWeight += p.netWeight;
      inventoryMap.set(key, entry);
    });

    sales.forEach(s => {
      // Find any purchase associated with this lot to determine its original location.
      // This is a simplification; a more robust system might store location directly on sale items if they can move.
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber); 
      if (relatedPurchase) {
        const key = `${s.lotNumber}-${relatedPurchase.locationId}`;
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.currentBags -= s.quantity;
          entry.currentWeight -= s.netWeight;
        }
      }
    });

    const byLocation: Record<string, { name: string; bags: number; netWeight: number }> = {};
    let totalBags = 0;
    let totalNetWeight = 0;

    inventoryMap.forEach(item => {
      if (item.currentBags > 0) { // Only count items with positive stock
        totalBags += item.currentBags;
        totalNetWeight += item.currentWeight;
        const locationName = warehouses.find(w => w.id === item.locationId)?.name || item.locationId;
        if (!byLocation[item.locationId]) {
          byLocation[item.locationId] = { name: locationName, bags: 0, netWeight: 0 };
        }
        byLocation[item.locationId].bags += item.currentBags;
        byLocation[item.locationId].netWeight += item.currentWeight;
      }
    });
    return { totalBags, totalNetWeight, byLocation };
  }, [purchases, sales, warehouses, hydrated]);

  const profitData = React.useMemo<ProfitData>(() => {
    if (!hydrated) return { grossProfit: 0, transactions: [], monthly: {} };
    const grossProfit = salesSummary.totalAmount - purchaseSummary.totalAmount;
    return { grossProfit, transactions: [], monthly: {} }; 
  }, [salesSummary, purchaseSummary, hydrated]);


  if (!hydrated) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card><CardHeader><CardTitle>Loading Summaries...</CardTitle></CardHeader><CardContent><p>Please wait...</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className='space-y-6'>
      <h2 className="text-2xl font-semibold text-foreground">Summaries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-lg border-green-500/50 bg-green-50 dark:bg-green-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-green-700 dark:text-green-300">Sales Summary</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{salesSummary.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {salesSummary.totalBags.toLocaleString()} Bags, {salesSummary.totalNetWeight.toLocaleString()} kg
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-blue-500/50 bg-blue-50 dark:bg-blue-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-blue-700 dark:text-blue-300">Purchase Summary</CardTitle>
            <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{purchaseSummary.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {purchaseSummary.totalBags.toLocaleString()} Bags, {purchaseSummary.totalNetWeight.toLocaleString()} kg
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-yellow-700 dark:text-yellow-300">Stock Summary</CardTitle>
            <Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stockSummary.totalBags.toLocaleString()} Bags</div>
            <p className="text-xs text-muted-foreground">Total: {stockSummary.totalNetWeight.toLocaleString()} kg</p>
            <div className="mt-2 space-y-1 text-xs">
                {Object.values(stockSummary.byLocation).map(loc => (
                    <div key={loc.name} className="flex justify-between">
                        <span>{loc.name}:</span>
                        <span className='font-medium'>{loc.bags.toLocaleString()} Bags ({loc.netWeight.toLocaleString()} kg)</span>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold text-foreground">Profit Analysis</h2>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium text-primary">Gross Profit</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${profitData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{profitData.grossProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              (High-level: Total Sales - Total Purchases)
            </p>
            <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Transaction-wise Profit (Placeholder)</h4>
                <Table>
                    <TableCaption>Detailed profit per transaction coming soon.</TableCaption>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Sale Bill</TableHead><TableHead>Lot No.</TableHead><TableHead className='text-right'>Profit (₹)</TableHead></TableRow></TableHeader>
                    <TableBody><TableRow><TableCell colSpan={4} className="text-center h-24">No transaction-wise profit data yet.</TableCell></TableRow></TableBody>
                </Table>
            </div>
            <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Month-wise Profit (Placeholder)</h4>
                 <Table>
                    <TableCaption>Monthly profit summary coming soon.</TableCaption>
                    <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className='text-right'>Total Profit (₹)</TableHead></TableRow></TableHeader>
                    <TableBody><TableRow><TableCell colSpan={2} className="text-center h-24">No monthly profit data yet.</TableCell></TableRow></TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardClient;
