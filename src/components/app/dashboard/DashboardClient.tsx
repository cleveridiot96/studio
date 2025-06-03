
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, Warehouse as MasterWarehouse, LocationTransfer, PurchaseReturn, SaleReturn } from "@/lib/types"; // Added Returns
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, ShoppingBag, Package, CalendarDays, TrendingUp } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, startOfYear, endOfDay, subMonths } from 'date-fns';
import { ProfitSummary } from '@/components/dashboard/ProfitSummary';
import { useSettings } from '@/contexts/SettingsContext';
import { isDateInFinancialYear } from "@/lib/utils";

const PURCHASES_STORAGE_KEY = 'purchasesData';
const PURCHASE_RETURNS_STORAGE_KEY = 'purchaseReturnsData'; // New
const SALES_STORAGE_KEY = 'salesData';
const SALE_RETURNS_STORAGE_KEY = 'saleReturnsData'; // New
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const LOCATION_TRANSFERS_STORAGE_KEY = 'locationTransfersData';


// Initial data sets - changed to empty arrays for clean slate on format
const initialDashboardWarehouses: MasterWarehouse[] = [];

interface SummaryData { totalAmount: number; totalBags: number; totalNetWeight: number; }
interface StockSummary { totalBags: number; totalNetWeight: number; byLocation: Record<string, { name: string; bags: number; netWeight: number }>; }

const getFinancialYearDateRange = (fyString: string): { start: Date; end: Date } | null => {
    if (!fyString || typeof fyString !== 'string') return null; const [startYearStr] = fyString.split('-');
    const startYear = parseInt(startYearStr, 10); if (isNaN(startYear)) return null;
    return { start: new Date(startYear, 3, 1), end: endOfDay(new Date(startYear + 1, 2, 31)) };
};

const DashboardClient = () => {
  const [hydrated, setHydrated] = React.useState(false);
  const { financialYear: currentFinancialYearString, isAppHydrating } = useSettings();
  const memoizedEmptyArray = React.useMemo(() => [], []);
  const memoizedInitialWarehouses = React.useMemo(() => initialDashboardWarehouses, []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(PURCHASE_RETURNS_STORAGE_KEY, memoizedEmptyArray); // New
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(SALE_RETURNS_STORAGE_KEY, memoizedEmptyArray); // New
  const [warehouses] = useLocalStorageState<MasterWarehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedInitialWarehouses);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(LOCATION_TRANSFERS_STORAGE_KEY, memoizedEmptyArray);
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(() => format(new Date(), "yyyy-MM"));

  React.useEffect(() => setHydrated(true), []);
  React.useEffect(() => {
    if (hydrated && currentFinancialYearString) {
      const fyRange = getFinancialYearDateRange(currentFinancialYearString);
      if (selectedPeriod !== "all" && selectedPeriod !== "currentFY" && fyRange) {
        try {
          const selectedMonthDate = parseISO(`${selectedPeriod}-01`);
          if (!isWithinInterval(selectedMonthDate, { start: fyRange.start, end: fyRange.end })) setSelectedPeriod(format(new Date(), "yyyy-MM"));
        } catch (e) { setSelectedPeriod(format(new Date(), "yyyy-MM")); }
      } else if (selectedPeriod !== "all" && selectedPeriod !== "currentFY") setSelectedPeriod(format(new Date(), "yyyy-MM"));
    }
  }, [currentFinancialYearString, hydrated, selectedPeriod]);

  const periodOptions = React.useMemo(() => {
    if (!hydrated) return []; const options: { value: string; label: string }[] = [{ value: "currentFY", label: `Current FY (${currentFinancialYearString})` }, { value: "all", label: "All Time" }];
    const fyDateRange = getFinancialYearDateRange(currentFinancialYearString);
    if (fyDateRange) {
      try { const monthsInFY = eachMonthOfInterval({ start: fyDateRange.start, end: fyDateRange.end }); monthsInFY.forEach(m => options.push({ value: format(m, "yyyy-MM"), label: format(m, "MMMM yyyy") })); }
      catch (error) { console.error("Error dashboard month options:", error); }
    }
    return options.sort((a,b) => { if (a.value === "currentFY") return -1; if (b.value === "currentFY") return 1; if (a.value === "all") return -1; if (b.value === "all") return 1; return b.value.localeCompare(a.value); });
  }, [hydrated, currentFinancialYearString]);

  const filterByPeriod = <T extends { date: string }>(items: T[], period: string, fyString: string): T[] => {
    if (!items) return []; if (period === "all") return items; let startDate:Date|null=null, endDate:Date|null=null;
    if (period === "currentFY") { const fyRange = getFinancialYearDateRange(fyString); if (fyRange) { startDate = fyRange.start; endDate = fyRange.end; }}
    else if (period.match(/^\d{4}-\d{2}$/)) { try { const mD = parseISO(period+"-01"); startDate=startOfMonth(mD); endDate=endOfDay(endOfMonth(mD)); } catch(e){return items;} }
    if (!startDate || !endDate) return items;
    return items.filter(item => { try { const iD = parseISO(item.date); return isWithinInterval(iD, {start:startDate!,end:endDate!}); } catch(e){return false;} });
  };

  const salesSummary = React.useMemo<SummaryData>(() => {
    if(isAppHydrating||!hydrated) return {totalAmount:0,totalBags:0,totalNetWeight:0};
    const filteredSales = filterByPeriod(sales, selectedPeriod, currentFinancialYearString);
    const netSales = filteredSales.reduce((acc, sale) => {
        acc.totalAmount += sale.totalAmount || 0; acc.totalBags += sale.quantity || 0; acc.totalNetWeight += sale.netWeight || 0; return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
    // Adjust for sale returns
    const relevantSaleReturns = filterByPeriod(saleReturns, selectedPeriod, currentFinancialYearString);
    relevantSaleReturns.forEach(sr => { netSales.totalAmount -= sr.returnAmount; netSales.totalBags -= sr.quantityReturned; netSales.totalNetWeight -= sr.netWeightReturned; });
    return netSales;
  }, [sales, saleReturns, selectedPeriod, hydrated, currentFinancialYearString, isAppHydrating]);

  const purchaseSummary = React.useMemo<SummaryData>(() => {
    if(isAppHydrating||!hydrated) return {totalAmount:0,totalBags:0,totalNetWeight:0};
    const filteredPurchases = filterByPeriod(purchases, selectedPeriod, currentFinancialYearString);
    const netPurchases = filteredPurchases.reduce((acc, p) => {
        acc.totalAmount += p.totalAmount || 0; acc.totalBags += p.quantity || 0; acc.totalNetWeight += p.netWeight || 0; return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
    // Adjust for purchase returns
    const relevantPurchaseReturns = filterByPeriod(purchaseReturns, selectedPeriod, currentFinancialYearString);
    relevantPurchaseReturns.forEach(pr => { netPurchases.totalAmount -= pr.returnAmount; netPurchases.totalBags -= pr.quantityReturned; netPurchases.totalNetWeight -= pr.netWeightReturned; });
    return netPurchases;
  }, [purchases, purchaseReturns, selectedPeriod, hydrated, currentFinancialYearString, isAppHydrating]);

  const stockSummary = React.useMemo<StockSummary>(() => {
    if (isAppHydrating || !hydrated) return { totalBags: 0, totalNetWeight: 0, byLocation: {} };
    const inventoryMap = new Map<string, { lotNumber: string, locationId: string, currentBags: number, currentWeight: number }>();
    const fyPurchases = purchases.filter(p => isDateInFinancialYear(p.date, currentFinancialYearString));
    fyPurchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`; let entry = inventoryMap.get(key) || { lotNumber: p.lotNumber, locationId: p.locationId, currentBags: 0, currentWeight: 0 };
      entry.currentBags += p.quantity; entry.currentWeight += p.netWeight; inventoryMap.set(key, entry);
    });
    const fyPurchaseReturns = purchaseReturns.filter(pr => isDateInFinancialYear(pr.date, currentFinancialYearString));
    fyPurchaseReturns.forEach(pr => {
        const originalPurchase = purchases.find(p => p.id === pr.originalPurchaseId);
        if (originalPurchase) { const key = `${originalPurchase.lotNumber}-${originalPurchase.locationId}`; let entry = inventoryMap.get(key); if (entry) { entry.currentBags -= pr.quantityReturned; entry.currentWeight -= pr.netWeightReturned;}}
    });
    const fySales = sales.filter(s => isDateInFinancialYear(s.date, currentFinancialYearString));
    fySales.forEach(s => {
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber);
      if (relatedPurchase) { const key = `${s.lotNumber}-${relatedPurchase.locationId}`; let entry = inventoryMap.get(key); if (entry) { entry.currentBags -= s.quantity; entry.currentWeight -= s.netWeight;}}
    });
    const fySaleReturns = saleReturns.filter(sr => isDateInFinancialYear(sr.date, currentFinancialYearString));
    fySaleReturns.forEach(sr => {
        const originalSale = sales.find(s => s.id === sr.originalSaleId);
        if(originalSale) { const relatedPurchase = purchases.find(p => p.lotNumber === originalSale.lotNumber); if(relatedPurchase) { const key = `${originalSale.lotNumber}-${relatedPurchase.locationId}`; let entry = inventoryMap.get(key); if(entry) { entry.currentBags += sr.quantityReturned; entry.currentWeight += sr.netWeightReturned;}}}
    });
    const fyLocationTransfers = locationTransfers.filter(lt => isDateInFinancialYear(lt.date, currentFinancialYearString));
    fyLocationTransfers.forEach(transfer => {
      transfer.items.forEach(item => {
        const fromKey = `${item.lotNumber}-${transfer.fromWarehouseId}`; const fromEntry = inventoryMap.get(fromKey); if (fromEntry) { fromEntry.currentBags -= item.bagsToTransfer; fromEntry.currentWeight -= item.netWeightToTransfer; }
        const toKey = `${item.lotNumber}-${transfer.toWarehouseId}`; let toEntry = inventoryMap.get(toKey);
        if (!toEntry) { toEntry = { lotNumber: item.lotNumber, locationId: transfer.toWarehouseId, currentBags: 0, currentWeight: 0 }; inventoryMap.set(toKey, toEntry); }
        toEntry.currentBags += item.bagsToTransfer; toEntry.currentWeight += item.netWeightToTransfer;
      });
    });
    const byLocation: Record<string, { name: string; bags: number; netWeight: number }> = {}; let totalBags=0, totalNetWeight=0;
    inventoryMap.forEach(item => {
      if (item.currentBags > 0 || item.currentWeight > 0) {
        totalBags+=item.currentBags; totalNetWeight+=item.currentWeight; const locName = warehouses.find(w=>w.id===item.locationId)?.name||item.locationId;
        if(!byLocation[item.locationId]) byLocation[item.locationId]={name:locName,bags:0,netWeight:0};
        byLocation[item.locationId].bags+=item.currentBags; byLocation[item.locationId].netWeight+=item.currentWeight;
      }
    });
    return { totalBags, totalNetWeight, byLocation };
  }, [purchases, purchaseReturns, sales, saleReturns, locationTransfers, warehouses, hydrated, isAppHydrating, currentFinancialYearString]);

  if (isAppHydrating || !hydrated) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">{[1,2,3].map(i => <Card key={i}><CardHeader><CardTitle>Loading...</CardTitle></CardHeader><CardContent><p>Wait...</p></CardContent></Card>)}</div>;
  const currentSelectionDisplay = periodOptions.find(opt => opt.value === selectedPeriod)?.label || "Select Period";

  return (
    <div className='space-y-6'>
      <div className="flex justify-between items-center"><h2 className="text-2xl font-semibold text-foreground">Summaries</h2>
        <div className="w-auto sm:w-[220px]"><Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="text-sm"><CalendarDays className="h-4 w-4 mr-2 opacity-70"/><SelectValue placeholder="Select Period">{currentSelectionDisplay}</SelectValue></SelectTrigger>
            <SelectContent>{periodOptions.map(o=>(<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Link href="/sales" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg"><Card className="shadow-md border-green-500/50 bg-green-50 dark:bg-green-900/30 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-base font-medium text-green-700 dark:text-green-300">Net Sales</CardTitle><DollarSign className="h-5 w-5 text-green-600 dark:text-green-400"/></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600 dark:text-green-400">₹{salesSummary.totalAmount.toLocaleString()}</div><p className="text-xs text-muted-foreground">{salesSummary.totalBags.toLocaleString()} Bags, {salesSummary.totalNetWeight.toLocaleString()} kg</p></CardContent></Card></Link>
        <Link href="/purchases" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg"><Card className="shadow-md border-blue-500/50 bg-blue-50 dark:bg-blue-900/30 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-base font-medium text-blue-700 dark:text-blue-300">Net Purchases</CardTitle><ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400"/></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{purchaseSummary.totalAmount.toLocaleString()}</div><p className="text-xs text-muted-foreground">{purchaseSummary.totalBags.toLocaleString()} Bags, {purchaseSummary.totalNetWeight.toLocaleString()} kg</p></CardContent></Card></Link>
        <Link href="/inventory" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg"><Card className="shadow-md border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/30 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-base font-medium text-yellow-700 dark:text-yellow-300">Stock Summary</CardTitle><Package className="h-5 w-5 text-yellow-600 dark:text-yellow-400"/></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stockSummary.totalBags.toLocaleString()} Bags</div><p className="text-xs text-muted-foreground">Total: {stockSummary.totalNetWeight.toLocaleString()} kg</p>
              {Object.keys(stockSummary.byLocation).length > 0 && <hr className="my-2 border-yellow-500/30"/>}
              <div className="mt-2 space-y-1 text-xs max-h-24 overflow-y-auto">{Object.values(stockSummary.byLocation).map(loc=>(<div key={loc.name} className="flex justify-between"><span className="text-yellow-700 dark:text-yellow-300 truncate pr-2">{loc.name}:</span><span className='font-medium text-yellow-600 dark:text-yellow-400 whitespace-nowrap'>{loc.bags.toLocaleString()} Bags ({loc.netWeight.toLocaleString()} kg)</span></div>))}</div>
            </CardContent></Card></Link>
      </div>
      <Link href="/profit-analysis" className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
        <ProfitSummary sales={sales} purchases={purchases} />
      </Link>
    </div>
  );
};
export default DashboardClient;
