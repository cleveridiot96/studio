
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, Warehouse as MasterWarehouse } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, ShoppingBag, Package, BarChart3, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { ProfitSummary } from '@/components/dashboard/ProfitSummary';
import { useSettings } from '@/contexts/SettingsContext';
import { isDateInFinancialYear } from '@/lib/utils';

const PURCHASES_STORAGE_KEY = 'purchasesData';
const SALES_STORAGE_KEY = 'salesData';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';

const initialDashboardWarehouses: MasterWarehouse[] = [
  { id: "wh-mum", name: "Mumbai Central Warehouse", type: "Warehouse" },
  { id: "wh-pune", name: "Pune North Godown", type: "Warehouse" },
  { id: "wh-ngp", name: "Nagpur South Storage", type: "Warehouse" },
  { id: "wh-nsk", name: "Nashik West Depot", type: "Warehouse" },
  { id: "wh-chiplun", name: "Chiplun Warehouse", type: "Warehouse" },
  { id: "wh-sawantwadi", name: "Sawantwadi Warehouse", type: "Warehouse" },
  { id: "w1", name: "Mumbai Godown (Old)", type: "Warehouse" }, // Kept for compatibility with older dummy data if any
  { id: "w2", name: "Chiplun Storage (Old)", type: "Warehouse" }, // Kept for compatibility
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
  const { financialYear: currentFinancialYearString } = useSettings();
  
  const memoizedInitialPurchases = React.useMemo(() => [], []);
  const memoizedInitialSales = React.useMemo(() => [], []);
  const memoizedInitialWarehouses = React.useMemo(() => initialDashboardWarehouses, []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedInitialSales);
  const [warehouses] = useLocalStorageState<MasterWarehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedInitialWarehouses);

  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("currentFY");

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const getFinancialYearDateRange = (fyString: string): { start: Date; end: Date } | null => {
    const [startYearStr, endYearStrShort] = fyString.split('-');
    const startYear = parseInt(startYearStr, 10);
    
    if (isNaN(startYear)) return null;

    // Assuming endYearStrShort is like "25" for 2025. Need to reconstruct full end year.
    // A common way FY is represented e.g. "2024-25" means April 2024 to March 2025.
    // If endYearStrShort is like "2025", then it's already the full year.
    const endYear = (endYearStrShort && endYearStrShort.length === 2) ? (Math.floor(startYear / 100) * 100 + parseInt(endYearStrShort, 10)) : parseInt(endYearStrShort, 10);

    if (isNaN(endYear) || endYear !== startYear +1) {
        // If parsing fails or it's not a typical +1 year, adjust for cases like "2024-2025"
        const fullEndYear = parseInt(String(startYear +1), 10);
         return {
            start: new Date(startYear, 3, 1), // April 1st
            end: new Date(fullEndYear, 2, 31, 23, 59, 59, 999), // March 31st, end of day
        };
    }

    return {
      start: new Date(startYear, 3, 1), // April 1st
      end: new Date(endYear, 2, 31, 23, 59, 59, 999), // March 31st, end of day
    };
  };

  const periodOptions = React.useMemo(() => {
    if (!hydrated) return [];
    const options: { value: string; label: string }[] = [
      { value: "currentFY", label: `Current FY (${currentFinancialYearString})` },
      { value: "all", label: "All Time" },
    ];

    const fyDateRange = getFinancialYearDateRange(currentFinancialYearString);
    if (!fyDateRange) return options; // Cannot generate month options if FY range is invalid

    const allTransactionDatesInFY = [...purchases, ...sales]
      .map(t => parseISO(t.date))
      .filter(date => isWithinInterval(date, { start: fyDateRange.start, end: fyDateRange.end }));

    if (allTransactionDatesInFY.length === 0) return options;

    const minDateInFY = new Date(Math.min(...allTransactionDatesInFY.map(date => date.getTime())));
    const maxDateInFY = new Date(Math.max(...allTransactionDatesInFY.map(date => date.getTime())));
    
    // Ensure minDate and maxDate are within the FY bounds if transactions don't span the whole FY
    const effectiveMinDate = minDateInFY < fyDateRange.start ? fyDateRange.start : minDateInFY;
    const effectiveMaxDate = maxDateInFY > fyDateRange.end ? fyDateRange.end : maxDateInFY;


    if (effectiveMinDate > effectiveMaxDate) return options; // No valid interval for months

    try {
        const monthsInFY = eachMonthOfInterval({ start: effectiveMinDate, end: effectiveMaxDate });
        monthsInFY.reverse().forEach(monthStart => {
        const monthKey = format(monthStart, "yyyy-MM");
        options.push({ value: monthKey, label: format(monthStart, "MMMM yyyy") });
        });
    } catch (error) {
        console.error("Error generating month options for dashboard:", error);
        // Fallback to just FY and All Time if interval generation fails
    }
    return options;
  }, [purchases, sales, hydrated, currentFinancialYearString]);


  const filterByPeriod = <T extends { date: string }>(items: T[], period: string): T[] => {
    if (period === "all") return items;
    
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period === "currentFY") {
      const fyRange = getFinancialYearDateRange(currentFinancialYearString);
      if (fyRange) {
        startDate = fyRange.start;
        endDate = fyRange.end;
      }
    } else if (period.match(/^\d{4}-\d{2}$/)) { // yyyy-MM format
      const monthDate = parseISO(period + "-01");
      startDate = startOfMonth(monthDate);
      endDate = endOfMonth(monthDate);
    }

    if (!startDate || !endDate) return items;

    return items.filter(item => {
      const itemDate = parseISO(item.date);
      return isWithinInterval(itemDate, { start: startDate!, end: endDate! });
    });
  };
  
  const salesSummary = React.useMemo<SummaryData>(() => {
    if (!hydrated) return { totalAmount: 0, totalBags: 0, totalNetWeight: 0 };
    const filteredSales = filterByPeriod(sales, selectedPeriod);
    return filteredSales.reduce((acc, sale) => {
      acc.totalAmount += sale.totalAmount || 0;
      acc.totalBags += sale.quantity || 0;
      acc.totalNetWeight += sale.netWeight || 0;
      return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
  }, [sales, selectedPeriod, hydrated, currentFinancialYearString, filterByPeriod]);

  const purchaseSummary = React.useMemo<SummaryData>(() => {
    if (!hydrated) return { totalAmount: 0, totalBags: 0, totalNetWeight: 0 };
    const filteredPurchases = filterByPeriod(purchases, selectedPeriod);
    return filteredPurchases.reduce((acc, purchase) => {
      acc.totalAmount += purchase.totalAmount || 0;
      acc.totalBags += purchase.quantity || 0;
      acc.totalNetWeight += purchase.netWeight || 0;
      return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
  }, [purchases, selectedPeriod, hydrated, currentFinancialYearString, filterByPeriod]);

  const stockSummary = React.useMemo<StockSummary>(() => {
    if (!hydrated) return { totalBags: 0, totalNetWeight: 0, byLocation: {} };
    
    const inventoryMap = new Map<string, { lotNumber: string, locationId: string, currentBags: number, currentWeight: number }>();

    // Process purchases to add stock
    purchases.forEach(p => {
      const key = `${p.lotNumber}-${p.locationId}`;
      let entry = inventoryMap.get(key) || { lotNumber: p.lotNumber, locationId: p.locationId, currentBags: 0, currentWeight: 0 };
      entry.currentBags += p.quantity;
      entry.currentWeight += p.netWeight;
      inventoryMap.set(key, entry);
    });

    // Process sales to deduct stock
    sales.forEach(s => {
      // Find the original purchase location for this lot to update correctly
      const relatedPurchase = purchases.find(p => p.lotNumber === s.lotNumber); 
      if (relatedPurchase) {
        const key = `${s.lotNumber}-${relatedPurchase.locationId}`; 
        let entry = inventoryMap.get(key);
        if (entry) {
          entry.currentBags -= s.quantity;
          entry.currentWeight -= s.netWeight; // Assuming sale netWeight is accurate deduction
          inventoryMap.set(key, entry);
        }
      }
    });

    // Prepare summaries
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Summaries</h2>
        <div className="w-auto sm:w-[220px]">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="text-sm">
              <CalendarDays className="h-4 w-4 mr-2 opacity-70" />
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
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
        <ProfitSummary sales={sales} purchases={purchases} />
      </Link>
    </div>
  );
};

export default DashboardClient;
    
