
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, Warehouse as MasterWarehouse, Payment, Receipt } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { DollarSign, ShoppingBag, Package, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ProfitSummary } from '@/components/dashboard/ProfitSummary';

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
// const PAYMENTS_STORAGE_KEY = 'paymentsData'; // Not directly used for dashboard summaries, but good to have if expanding
// const RECEIPTS_STORAGE_KEY = 'receiptsData'; // Not directly used for dashboard summaries

// Fallback initial warehouse data, mirroring masters/page.tsx for consistency
// This helps if dashboard is visited before masters page populates localStorage.
const initialDashboardWarehouses: MasterWarehouse[] = [
  { id: "wh-mum", name: "Mumbai Central Warehouse", type: "Warehouse" },
  { id: "wh-pune", name: "Pune North Godown", type: "Warehouse" },
  { id: "wh-ngp", name: "Nagpur South Storage", type: "Warehouse" },
  { id: "wh-nsk", name: "Nashik West Depot", type: "Warehouse" },
  { id: "wh-chiplun", name: "Chiplun Warehouse", type: "Warehouse" },
  { id: "wh-sawantwadi", name: "Sawantwadi Warehouse", type: "Warehouse" },
  // Adding IDs that might have been in older dummy data to ensure names resolve if old data persists
  { id: "w1", name: "Mumbai Godown (Old)", type: "Warehouse" },
  { id: "w2", name: "Chiplun Storage (Old)", type: "Warehouse" },
];

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

const DashboardClient = () => {
  const [hydrated, setHydrated] = React.useState(false);
  
  const memoizedInitialPurchases = React.useMemo(() => [], []);
  const memoizedInitialSales = React.useMemo(() => [], []);
  // Use the more comprehensive initialDashboardWarehouses for the memoized default
  const memoizedInitialWarehouses = React.useMemo(() => initialDashboardWarehouses, []);


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
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber); 
      if (relatedPurchase) {
        const key = `${s.lotNumber}-${relatedPurchase.locationId}`; 
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.currentBags -= s.quantity;
          entry.currentWeight -= s.netWeight;
          inventoryMap.set(key, entry);
        }
      }
    });

    const byLocation: Record<string, { name: string; bags: number; netWeight: number }> = {};
    let totalBags = 0;
    let totalNetWeight = 0;

    inventoryMap.forEach(item => {
      if (item.currentBags > 0) { 
        totalBags += item.currentBags;
        totalNetWeight += item.currentWeight;
        // Use the warehouses state for name resolution
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
  
  if (!hydrated) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card><CardHeader><CardTitle>Loading Summaries...</CardTitle></CardHeader><CardContent><p>Please wait...</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Loading Summaries...</CardTitle></CardHeader><CardContent><p>Please wait...</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Loading Summaries...</CardTitle></CardHeader><CardContent><p>Please wait...</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className='space-y-6'>
      <h2 className="text-2xl font-semibold text-foreground">Summaries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Link href="/sales" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
          <Card className="shadow-md border-green-500/50 bg-green-50 dark:bg-green-900/30 h-full">
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
        </Link>

        <Link href="/purchases" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
          <Card className="shadow-md border-blue-500/50 bg-blue-50 dark:bg-blue-900/30 h-full">
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
        </Link>

        <Link href="/inventory" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
          <Card className="shadow-md border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/30 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium text-yellow-700 dark:text-yellow-300">Stock Summary</CardTitle>
              <Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stockSummary.totalBags.toLocaleString()} Bags</div>
              <p className="text-xs text-muted-foreground">Total: {stockSummary.totalNetWeight.toLocaleString()} kg</p>
              {Object.keys(stockSummary.byLocation).length > 0 && <hr className="my-2 border-yellow-500/30" />}
              <div className="mt-2 space-y-1 text-xs">
                  {Object.values(stockSummary.byLocation).map(loc => (
                      <div key={loc.name} className="flex justify-between">
                          <span className="text-yellow-700 dark:text-yellow-300">{loc.name}:</span>
                          <span className='font-medium text-yellow-600 dark:text-yellow-400'>{loc.bags.toLocaleString()} Bags ({loc.netWeight.toLocaleString()} kg)</span>
                      </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <Link href="/profit-analysis" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
        {/* ProfitSummary component is expected to be self-contained and styled */}
        <ProfitSummary sales={sales} purchases={purchases} />
      </Link>
    </div>
  );
};

export default DashboardClient;
    
