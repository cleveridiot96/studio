
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Sale, TransactionalProfitInfo, MonthlyProfitInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, DollarSign, BarChart3, CalendarDays, Rocket, Hash, Trophy } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, endOfDay } from "date-fns";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { salesMigrator } from '@/lib/dataMigrators';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SALES_STORAGE_KEY = 'salesData';

interface ProfitKPIs {
  totalNetProfit: number;
  totalSalesValue: number;
  avgProfitPerSale: number;
  highestProfitSale: { id: string; profit: number, billNumber?: string };
}

export function ProfitAnalysisClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, [], salesMigrator);
  const { financialYear: currentFinancialYearString } = useSettings();
  
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfDay(endOfMonth(today)) };
  });

  React.useEffect(() => { setHydrated(true); }, []);

  const allProfitTransactionsInFY = React.useMemo(() => {
    if (!hydrated) return [];
    const fySales = sales.filter(sale => sale && isDateInFinancialYear(sale.date, currentFinancialYearString));
    
    const flattenedTransactions: TransactionalProfitInfo[] = [];
    fySales.forEach(sale => {
      if (!sale.items || !Array.isArray(sale.items) || sale.items.length === 0) return;

      const saleLevelExpenses = (sale.transportCost || 0) + (sale.packingCost || 0) + (sale.labourCost || 0) + (sale.calculatedBrokerageCommission || 0) + (sale.calculatedExtraBrokerage || 0);
      
      const totalGoodsValue = sale.items.reduce((sum, item) => sum + (item.goodsValue || 0), 0);
        
      if (totalGoodsValue === 0) return;

      sale.items.forEach(item => {
        const itemProportion = (item.goodsValue || 0) / totalGoodsValue;
        const apportionedExpenses = saleLevelExpenses * itemProportion;
        const costOfGoodsSold = item.costOfGoodsSold || 0;
        const netProfit = (item.goodsValue || 0) - costOfGoodsSold - apportionedExpenses;
        
        const netPurchaseRate = costOfGoodsSold > 0 && item.netWeight > 0 ? costOfGoodsSold / item.netWeight : 0;
        const netRealization = (item.goodsValue || 0) - apportionedExpenses;
        const netSaleRate = netRealization > 0 && item.netWeight > 0 ? netRealization / item.netWeight : 0;
        
        flattenedTransactions.push({
          saleId: sale.id,
          date: sale.date,
          billNumber: sale.billNumber,
          customerName: sale.customerName,
          lotNumber: item.lotNumber,
          saleNetWeightKg: item.netWeight,
          saleAmount: sale.billedAmount || 0,
          goodsValueForProfitCalc: item.goodsValue || 0,
          purchaseCostForSalePortion: costOfGoodsSold,
          totalExpenses: apportionedExpenses,
          netProfit: netProfit,
        });
      });
    });
    return flattenedTransactions;
  }, [sales, hydrated, currentFinancialYearString]);

  const monthlySummaryForFY = React.useMemo(() => {
    const monthlyAgg: Record<string, { transactionCount: number; grossProfit: number; netProfit: number; }> = {};
    allProfitTransactionsInFY.forEach(tx => {
        const monthKey = format(startOfMonth(parseISO(tx.date)), "yyyy-MM");
        if (!monthlyAgg[monthKey]) {
            monthlyAgg[monthKey] = { transactionCount: 0, grossProfit: 0, netProfit: 0 };
        }
        monthlyAgg[monthKey].transactionCount++;
        monthlyAgg[monthKey].grossProfit += (tx.goodsValueForProfitCalc - tx.purchaseCostForSalePortion);
        monthlyAgg[monthKey].netProfit += tx.netProfit;
    });

    return Object.entries(monthlyAgg).map(([key, value]) => ({ monthKey: key, monthYear: format(parseISO(key + "-01"), "MMMM yyyy"), ...value }))
      .sort((a, b) => parseISO(b.monthKey).getTime() - parseISO(a.monthKey).getTime());
  }, [allProfitTransactionsInFY]);

  const filteredTransactionsForPeriod = React.useMemo(() => {
    if (!dateRange?.from) return allProfitTransactionsInFY;
    const effectiveToDate = dateRange.to || dateRange.from;
    return allProfitTransactionsInFY.filter(tx => isWithinInterval(parseISO(tx.date), { start: dateRange.from!, end: endOfDay(effectiveToDate) }));
  }, [allProfitTransactionsInFY, dateRange]);

  const kpiData = React.useMemo<ProfitKPIs>(() => {
    const totalNetProfit = filteredTransactionsForPeriod.reduce((sum, tx) => sum + (tx.netProfit || 0), 0);
    const uniqueSales = new Set(filteredTransactionsForPeriod.map(tx => tx.saleId));
    let highestProfitSale = { id: 'N/A', profit: 0, billNumber: 'N/A' };
    
    if (filteredTransactionsForPeriod.length > 0) {
      const profitBySale: Record<string, { profit: number; billNumber?: string }> = {};
      filteredTransactionsForPeriod.forEach(tx => {
          if (!profitBySale[tx.saleId]) {
              profitBySale[tx.saleId] = { profit: 0, billNumber: tx.billNumber };
          }
          profitBySale[tx.saleId].profit += tx.netProfit || 0;
      });
      const topSale = Object.entries(profitBySale).sort((a,b) => b[1].profit - a[1].profit)[0];
      if (topSale) {
        highestProfitSale = { id: topSale[0], profit: topSale[1].profit, billNumber: topSale[1].billNumber };
      }
    }

    const relevantSales = sales.filter(s => s && s.items && isDateInFinancialYear(s.date, currentFinancialYearString) && dateRange?.from && isWithinInterval(parseISO(s.date), { start: dateRange.from, end: endOfDay(dateRange.to || dateRange.from)}))
    
    return {
        totalNetProfit,
        totalSalesValue: relevantSales.reduce((sum, s) => sum + (s.billedAmount || 0), 0),
        avgProfitPerSale: uniqueSales.size > 0 ? totalNetProfit / uniqueSales.size : 0,
        highestProfitSale,
    };
  }, [filteredTransactionsForPeriod, sales, currentFinancialYearString, dateRange]);

  const setDateFilter = (type: "thisMonth" | "lastMonth" | "currentFY") => {
    const today = new Date();
    if (type === "thisMonth") setDateRange({ from: startOfMonth(today), to: endOfDay(endOfMonth(today)) });
    else if (type === "lastMonth") {
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      setDateRange({ from: lastMonthStart, to: endOfDay(endOfMonth(lastMonthStart)) });
    } else if (type === "currentFY") {
      const [startYearStr] = currentFinancialYearString.split('-');
      if (!isNaN(parseInt(startYearStr, 10))) {
        const startYear = parseInt(startYearStr, 10);
        setDateRange({ from: new Date(startYear, 3, 1), to: endOfDay(new Date(startYear + 1, 2, 31)) });
      }
    }
  };

  const handleMonthClick = (monthKey: string) => {
    const monthDate = parseISO(`${monthKey}-01`);
    setDateRange({ from: startOfMonth(monthDate), to: endOfMonth(monthDate) });
  };

  if (!hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading profit analysis...</p></div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-2xl text-primary flex items-center"><Rocket className="mr-3 h-7 w-7"/>Profit Analysis Dashboard</CardTitle>
              <div className="flex flex-wrap gap-2">
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange}/>
                <Button variant="outline" size="sm" onClick={() => setDateFilter("thisMonth")}><CalendarDays className="mr-2 h-4 w-4"/>This Month</Button>
                <Button variant="outline" size="sm" onClick={() => setDateFilter("lastMonth")}><CalendarDays className="mr-2 h-4 w-4"/>Last Month</Button>
                <Button variant="outline" size="sm" onClick={() => setDateFilter("currentFY")}><CalendarDays className="mr-2 h-4 w-4"/>Current FY</Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Net Profit (Selected Period)</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className={`text-2xl font-bold ${(kpiData.totalNetProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{(kpiData.totalNetProfit || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Sales Value</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">₹{(kpiData.totalSalesValue || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Profit / Sale</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">₹{(kpiData.avgProfitPerSale || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Top Sale</CardTitle><Trophy className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-xl font-bold truncate uppercase">{kpiData.highestProfitSale.billNumber || kpiData.highestProfitSale.id}</div><p className="text-xs text-muted-foreground">Profit: ₹{(kpiData.highestProfitSale.profit || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="transactional" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactional" className="text-base"><BarChart3 className="mr-2 h-5 w-5"/>Transactional Details</TabsTrigger>
                <TabsTrigger value="monthly" className="text-base"><CalendarDays className="mr-2 h-5 w-5"/>Monthly Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="transactional" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Transactional Profit Details (Selected Period)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                         {filteredTransactionsForPeriod.length === 0 ? (
                            <p className="text-muted-foreground text-center py-10">No transactions for this period.</p>
                         ) : (
                            <ScrollArea className="h-[60vh] rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-2 text-xs">Date</TableHead>
                                            <TableHead className="px-2 py-2 text-xs">Vakkal</TableHead>
                                            <TableHead className="px-2 py-2 text-xs">Customer</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs">Value (₹)</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs">Cost (₹)</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs">Expenses (₹)</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs">Net Profit (₹)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactionsForPeriod.map((tx, index) => (
                                            <TableRow key={`${tx.saleId}-${tx.lotNumber}-${index}`} className="uppercase">
                                                <TableCell className="px-2 py-1 text-xs">{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                                <TableCell className="px-2 py-1 text-xs">{tx.lotNumber}</TableCell>
                                                <TableCell className="truncate max-w-[120px] px-2 py-1 text-xs">{tx.customerName}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{(tx.goodsValueForProfitCalc || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{(tx.purchaseCostForSalePortion || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{(tx.totalExpenses || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</TableCell>
                                                <TableCell className={`text-right font-bold px-2 py-1 text-xs ${(tx.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(tx.netProfit || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                         )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Monthly Summary (FY {currentFinancialYearString})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                         {monthlySummaryForFY.length === 0 ? (
                            <p className="text-muted-foreground text-center py-10">No monthly data to summarize.</p>
                         ) : (
                            <ScrollArea className="h-[60vh] rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-2 text-xs">Month</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs">Transactions</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs">Net Profit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {monthlySummaryForFY.map(m => (
                                            <TableRow key={m.monthKey} onClick={() => handleMonthClick(m.monthKey)} className="cursor-pointer hover:bg-muted uppercase">
                                                <TableCell className="font-medium px-2 py-1 text-xs">{m.monthYear}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{m.transactionCount}</TableCell>
                                                <TableCell className={`text-right font-semibold px-2 py-1 text-xs ${(m.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{(m.netProfit || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                         )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
