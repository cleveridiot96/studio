
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Purchase, Sale, Warehouse as MasterWarehouse } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, ShoppingBag, Package, CalendarDays } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, startOfYear, endOfDay, subMonths } from 'date-fns';
import { ProfitSummary } from '@/components/dashboard/ProfitSummary';
import { useSettings } from '@/contexts/SettingsContext';

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

const getFinancialYearDateRange = (fyString: string): { start: Date; end: Date } | null => {
    if (!fyString || typeof fyString !== 'string') return null;
    const [startYearStr] = fyString.split('-');
    const startYear = parseInt(startYearStr, 10);
    if (isNaN(startYear)) return null;
    
    return {
      start: new Date(startYear, 3, 1), // April 1st
      end: endOfDay(new Date(startYear + 1, 2, 31)), // March 31st, end of day
    };
};


const DashboardClient = () => {
  const [hydrated, setHydrated] = React.useState(false);
  const { financialYear: currentFinancialYearString } = useSettings();
  
  const memoizedInitialPurchases = React.useMemo(() => [], []);
  const memoizedInitialSales = React.useMemo(() => [], []);
  const memoizedInitialWarehouses = React.useMemo(() => initialDashboardWarehouses, []);

  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedInitialSales);
  const [warehouses] = useLocalStorageState<MasterWarehouse[]>(WAREHOUSES_STORAGE_KEY, memoizedInitialWarehouses);

  const [selectedPeriod, setSelectedPeriod] = React.useState<string>(() => format(new Date(), "yyyy-MM")); // Default to current month

  React.useEffect(() => {
    setHydrated(true);
  }, []);
  
  // Update default selected period if financial year changes and current selection is outside new FY
  React.useEffect(() => {
    if (hydrated && currentFinancialYearString) {
        const fyRange = getFinancialYearDateRange(currentFinancialYearString);
        if (fyRange && selectedPeriod !== "all" && selectedPeriod !== "currentFY") {
            try {
                const selectedMonthDate = parseISO(`${selectedPeriod}-01`);
                 if (!isWithinInterval(selectedMonthDate, { start: fyRange.start, end: fyRange.end })) {
                    setSelectedPeriod(format(new Date(), "yyyy-MM")); // Default to current month if outside
                 }
            } catch (e) {
                // If selectedPeriod is not a valid yyyy-MM, default it
                setSelectedPeriod(format(new Date(), "yyyy-MM"));
            }
        } else if (selectedPeriod === "all" || selectedPeriod === "currentFY") {
            // Keep as is
        } else {
             setSelectedPeriod(format(new Date(), "yyyy-MM")); // Fallback
        }
    }
  }, [currentFinancialYearString, hydrated, selectedPeriod]);


  const periodOptions = React.useMemo(() => {
    if (!hydrated) return [];
    const options: { value: string; label: string }[] = [
      { value: "currentFY", label: `Current FY (${currentFinancialYearString})` },
      { value: "all", label: "All Time" },
    ];

    const fyDateRange = getFinancialYearDateRange(currentFinancialYearString);
    if (fyDateRange) {
        try {
            const monthsInFY = eachMonthOfInterval({ start: fyDateRange.start, end: fyDateRange.end });
            monthsInFY.forEach(monthStart => {
                const monthKey = format(monthStart, "yyyy-MM");
                options.push({ value: monthKey, label: format(monthStart, "MMMM yyyy") });
            });
        } catch (error) {
            console.error("Error generating month options for dashboard based on FY:", error);
        }
    }
    return options.sort((a, b) => { // Sort options: Current FY, All Time, then months reverse chronologically
        if (a.value === "currentFY") return -1;
        if (b.value === "currentFY") return 1;
        if (a.value === "all") return -1;
        if (b.value === "all") return 1;
        return b.value.localeCompare(a.value); // Sort months yyyy-MM descending
    });
  }, [hydrated, currentFinancialYearString]);


  const filterByPeriod = <T extends { date: string }>(items: T[], period: string, fyString: string): T[] => {
    if (!items) return [];
    if (period === "all") return items;
    
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period === "currentFY") {
      const fyRange = getFinancialYearDateRange(fyString);
      if (fyRange) {
        startDate = fyRange.start;
        endDate = fyRange.end;
      }
    } else if (period.match(/^\d{4}-\d{2}$/)) { // yyyy-MM format for specific month
      try {
        const monthDate = parseISO(period + "-01");
        startDate = startOfMonth(monthDate);
        endDate = endOfDay(endOfMonth(monthDate));
      } catch (e) {
        console.warn("Invalid month format for filtering:", period);
        return items; // Return all if month format is invalid
      }
    }

    if (!startDate || !endDate) return items; // Fallback to all items if dates are invalid

    return items.filter(item => {
      try {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { start: startDate!, end: endDate! });
      } catch (e) {
        // console.warn("Invalid date in item for filtering:", item.date);
        return false;
      }
    });
  };
  
  const salesSummary = React.useMemo<SummaryData>(() => {
    if (!hydrated) return { totalAmount: 0, totalBags: 0, totalNetWeight: 0 };
    const filteredSales = filterByPeriod(sales, selectedPeriod, currentFinancialYearString);
    return filteredSales.reduce((acc, sale) => {
      acc.totalAmount += sale.totalAmount || 0;
      acc.totalBags += sale.quantity || 0;
      acc.totalNetWeight += sale.netWeight || 0;
      return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
  }, [sales, selectedPeriod, hydrated, currentFinancialYearString]);

  const purchaseSummary = React.useMemo<SummaryData>(() => {
    if (!hydrated) return { totalAmount: 0, totalBags: 0, totalNetWeight: 0 };
    const filteredPurchases = filterByPeriod(purchases, selectedPeriod, currentFinancialYearString);
    return filteredPurchases.reduce((acc, purchase) => {
      acc.totalAmount += purchase.totalAmount || 0;
      acc.totalBags += purchase.quantity || 0;
      acc.totalNetWeight += purchase.netWeight || 0;
      return acc;
    }, { totalAmount: 0, totalBags: 0, totalNetWeight: 0 });
  }, [purchases, selectedPeriod, hydrated, currentFinancialYearString]);

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

  const currentSelectionLabel = periodOptions.find(opt => opt.value === selectedPeriod)?.label || `Select Period`;

  return (
    <div className='space-y-6'>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Summaries</h2>
        <div className="w-auto sm:w-[220px]">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="text-sm">
              <CalendarDays className="h-4 w-4 mr-2 opacity-70" />
              <SelectValue placeholder="Select Period">
                 {currentSelectionLabel}
              </SelectValue>
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
    
