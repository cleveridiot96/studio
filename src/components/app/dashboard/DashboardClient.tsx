
'use client';

import * as React from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, Warehouse as MasterWarehouse, Payment, Receipt } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { DollarSign, ShoppingBag, Package, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const PAYMENTS_STORAGE_KEY = 'paymentsData';
const RECEIPTS_STORAGE_KEY = 'receiptsData';


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
    transactions: { date: string, saleBill?: string, lotNumber: string, profit: number }[]; 
    monthly: Record<string, number>; // Key: YYYY-MM
}


const DashboardClient = () => {
  const [hydrated, setHydrated] = React.useState(false);
  
  const memoizedInitialPurchases = React.useMemo(() => [], []);
  const memoizedInitialSales = React.useMemo(() => [], []);
  const memoizedInitialWarehouses = React.useMemo(() => [], []);
  const memoizedInitialPayments = React.useMemo(() => [], []);
  const memoizedInitialReceipts = React.useMemo(() => [], []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedInitialSales);
  const [warehouses] = useLocalStorageState<MasterWarehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedInitialWarehouses);
  const [payments] = useLocalStorageState<Payment[]>(PAYMENTS_STORAGE_KEY, memoizedInitialPayments);
  const [receipts] = useLocalStorageState<Receipt[]>(RECEIPTS_STORAGE_KEY, memoizedInitialReceipts);


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

    let totalGrossProfit = 0;
    const profitTransactions: ProfitData['transactions'] = [];
    const monthlyProfit: ProfitData['monthly'] = {};

    sales.forEach(sale => {
      if (sale.calculatedProfit !== undefined) {
        totalGrossProfit += sale.calculatedProfit;
        profitTransactions.push({
            date: sale.date,
            saleBill: sale.billNumber,
            lotNumber: sale.lotNumber,
            profit: sale.calculatedProfit
        });

        const monthKey = format(parseISO(sale.date), "yyyy-MM");
        monthlyProfit[monthKey] = (monthlyProfit[monthKey] || 0) + sale.calculatedProfit;
      }
    });
    
    profitTransactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    return { grossProfit: totalGrossProfit, transactions: profitTransactions.slice(0,10), monthly: monthlyProfit }; // Limit to last 10 transactions for display
  }, [sales, hydrated]);


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
            <CardTitle className="text-base font-medium text-primary">Overall Gross Profit</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${profitData.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ₹{profitData.grossProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
            <p className="text-xs text-muted-foreground">
              (Total Sales - Total Purchase Costs - Sale Expenses)
            </p>
            <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Recent Profitable Transactions</h4>
                <Table>
                    <TableCaption>Showing up to 10 recent transactions.</TableCaption>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Sale Bill</TableHead><TableHead>Lot No.</TableHead><TableHead className='text-right'>Profit (₹)</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {profitData.transactions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No profit data from sales yet.</TableCell></TableRow>}
                        {profitData.transactions.map((tx, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{format(parseISO(tx.date), "dd-MM-yy")}</TableCell>
                                <TableCell>{tx.saleBill || 'N/A'}</TableCell>
                                <TableCell>{tx.lotNumber}</TableCell>
                                <TableCell className={`text-right ${tx.profit < 0 ? 'text-destructive': ''}`}>{tx.profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Month-wise Profit</h4>
                 <Table>
                    <TableCaption>Monthly gross profit summary.</TableCaption>
                    <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className='text-right'>Total Profit (₹)</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {Object.keys(profitData.monthly).length === 0 && <TableRow><TableCell colSpan={2} className="text-center h-24">No monthly profit data yet.</TableCell></TableRow>}
                        {Object.entries(profitData.monthly).sort(([a], [b]) => b.localeCompare(a)).map(([month, total]) => ( // Sort by month descending
                             <TableRow key={month}>
                                <TableCell>{format(parseISO(month+"-01"), "MMM yyyy")}</TableCell>
                                <TableCell className={`text-right ${total < 0 ? 'text-destructive': ''}`}>{total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardClient;

    