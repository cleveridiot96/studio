
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Sale, CostBreakdown } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, DollarSign, BarChart3, CalendarDays, Rocket, Trophy, Calculator, ArrowDown, Zap, Plus, Minus, Info } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, endOfDay, subDays } from "date-fns";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { salesMigrator } from '@/lib/dataMigrators';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { cn } from "@/lib/utils";


const SALES_STORAGE_KEY = 'salesData';

export interface TransactionalProfitInfo {
  saleId: string;
  date: string;
  billNumber?: string;
  customerName?: string;
  lotNumber: string;
  saleNetWeightKg: number;
  // Rates
  basePurchaseRate: number;
  landedCostPerKg: number;
  saleRatePerKg: number;
  // Values
  goodsValue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  netProfit: number;
  // Breakdown
  costBreakdown: CostBreakdown;
  saleExpenses: {
    total: number;
    [key: string]: number;
  }
}

interface MonthlySummaryInfo {
    monthKey: string;
    monthYear: string;
    transactionCount: number;
    netProfit: number;
}


interface ProfitKPIs {
  totalNetProfit: number;
  totalSalesValue: number;
  avgProfitPerSale: number;
  highestProfitSale: { id: string; profit: number, billNumber?: string };
}

const BreakdownRow: React.FC<{ label: string; value: number; isSub?: boolean; isTotal?: boolean; color?: 'green' | 'red' | 'blue' | 'orange' }> = ({ label, value, isSub = false, isTotal = false, color }) => (
  <TableRow className={cn(isTotal && 'font-bold bg-muted/50 text-base', color === 'green' && 'text-green-600', color === 'red' && 'text-red-600', color === 'blue' && 'text-blue-600', color === 'orange' && 'text-orange-600')}>
    <TableCell className={cn('py-1', isSub ? 'pl-8' : 'pl-4')}>
      {isSub ? <span className="text-muted-foreground mr-1">↳</span> : <Plus className="h-3 w-3 inline-block mr-2" />}
      {label}
    </TableCell>
    <TableCell className="text-right py-1 font-mono">₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
  </TableRow>
);
const DeductionRow: React.FC<{ label: string; value: number; isSub?: boolean; isTotal?: boolean; color?: 'green' | 'red' }> = ({ label, value, isSub = false, isTotal = false, color }) => (
    <TableRow className={cn(isTotal && 'font-bold bg-muted/50 text-base', color === 'green' && 'text-green-600', color === 'red' && 'text-red-600')}>
      <TableCell className={cn('py-1', isSub ? 'pl-8' : 'pl-4')}>
        {isSub ? <span className="text-muted-foreground mr-1">↳</span> : <Minus className="h-3 w-3 inline-block mr-2" />}
        {label}
      </TableCell>
      <TableCell className="text-right py-1 font-mono">(-) ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
    </TableRow>
  );


export function ProfitAnalysisClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, [], salesMigrator);
  const { financialYear: currentFinancialYearString } = useSettings();
  const [saleIdForCalc, setSaleIdForCalc] = React.useState<string | undefined>();
  
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

      const saleExpensesBreakdown: { total: number; [key: string]: number; } = { total: 0 };
      (sale.expenses || []).forEach(exp => {
        saleExpensesBreakdown[exp.account] = (saleExpensesBreakdown[exp.account] || 0) + exp.amount;
        saleExpensesBreakdown.total += exp.amount;
      });
        
      sale.items.forEach(item => {
        flattenedTransactions.push({
          saleId: sale.id,
          date: sale.date,
          billNumber: sale.billNumber,
          customerName: sale.customerName,
          lotNumber: item.lotNumber,
          saleNetWeightKg: item.netWeight,
          basePurchaseRate: item.purchaseRate,
          landedCostPerKg: item.netWeight > 0 ? item.costOfGoodsSold / item.netWeight : 0,
          saleRatePerKg: item.rate,
          goodsValue: item.goodsValue,
          costOfGoodsSold: item.costOfGoodsSold,
          grossProfit: item.itemGrossProfit,
          netProfit: item.itemNetProfit,
          costBreakdown: item.costBreakdown,
          saleExpenses: saleExpensesBreakdown
        });
      });
    });
    return flattenedTransactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [sales, hydrated, currentFinancialYearString]);

  const monthlySummaryForFY = React.useMemo(() => {
    const monthlyAgg: Record<string, { transactionCount: number; netProfit: number; }> = {};
    allProfitTransactionsInFY.forEach(tx => {
        const monthKey = format(startOfMonth(parseISO(tx.date)), "yyyy-MM");
        if (!monthlyAgg[monthKey]) {
            monthlyAgg[monthKey] = { transactionCount: 0, netProfit: 0 };
        }
        monthlyAgg[monthKey].transactionCount++;
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

  const setDateFilter = (type: "today" | "yesterday" | "dayBeforeYesterday" | "currentFY") => {
    const today = new Date();
    let from, to;
    switch (type) {
      case "today": from = startOfDay(today); to = endOfDay(today); break;
      case "yesterday": from = startOfDay(subDays(today, 1)); to = endOfDay(subDays(today, 1)); break;
      case "dayBeforeYesterday": from = startOfDay(subDays(today, 2)); to = endOfDay(subDays(today, 2)); break;
      case "currentFY":
        const [startYearStr] = currentFinancialYearString.split('-');
        if (!isNaN(parseInt(startYearStr, 10))) {
          const startYear = parseInt(startYearStr, 10);
          from = new Date(startYear, 3, 1);
          to = endOfDay(new Date(startYear + 1, 2, 31));
        }
        break;
    }
    setDateRange({ from, to });
  };


  const handleMonthClick = (monthKey: string) => {
    const monthDate = parseISO(`${monthKey}-01`);
    setDateRange({ from: startOfMonth(monthDate), to: endOfMonth(monthDate) });
  };
  
  const saleOptionsForCalc = React.useMemo(() => {
    const uniqueSalesMap = new Map<string, { label: string; value: string }>();
    allProfitTransactionsInFY.forEach(tx => {
        if (!uniqueSalesMap.has(tx.saleId)) {
            uniqueSalesMap.set(tx.saleId, {
                value: tx.saleId,
                label: `BILL #${tx.billNumber || tx.saleId.slice(-5)} - ${tx.customerName}`
            });
        }
    });
    return Array.from(uniqueSalesMap.values());
  }, [allProfitTransactionsInFY]);

  const itemsForSelectedSaleCalc = React.useMemo(() => {
    if (!saleIdForCalc) return [];
    return allProfitTransactionsInFY.filter(tx => tx.saleId === saleIdForCalc);
  }, [saleIdForCalc, allProfitTransactionsInFY]);

  if (!hydrated) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><p>Loading profit analysis...</p></div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-2xl text-primary flex items-center uppercase"><Rocket className="mr-3 h-7 w-7"/>PROFIT ANALYSIS DASHBOARD</CardTitle>
              <div className="flex flex-wrap gap-2">
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange}/>
                <Button variant="outline" size="sm" onClick={() => setDateFilter("today")}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => setDateFilter("yesterday")}>Yesterday</Button>
                <Button variant="outline" size="sm" onClick={() => setDateFilter("dayBeforeYesterday")}>{format(subDays(new Date(), 2), 'EEEE')}</Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium uppercase">NET PROFIT (SELECTED PERIOD)</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className={`text-2xl font-bold ${Math.round(kpiData.totalNetProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.round(kpiData.totalNetProfit || 0).toLocaleString('en-IN')}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium uppercase">TOTAL SALES VALUE</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">₹{Math.round(kpiData.totalSalesValue || 0).toLocaleString('en-IN')}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium uppercase">AVG. PROFIT / SALE</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold">₹{Math.round(kpiData.avgProfitPerSale || 0).toLocaleString('en-IN')}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium uppercase">TOP SALE</CardTitle><Trophy className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-xl font-bold truncate uppercase">{kpiData.highestProfitSale.billNumber || kpiData.highestProfitSale.id}</div><p className="text-xs text-muted-foreground uppercase">PROFIT: ₹{Math.round(kpiData.highestProfitSale.profit || 0).toLocaleString('en-IN')}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="transactional" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transactional" className="text-base uppercase"><BarChart3 className="mr-2 h-5 w-5"/>TRANSACTIONAL DETAILS</TabsTrigger>
                <TabsTrigger value="monthly" className="text-base uppercase"><CalendarDays className="mr-2 h-5 w-5"/>MONTHLY SUMMARY</TabsTrigger>
                <TabsTrigger value="calculator" className="text-base uppercase"><Calculator className="mr-2 h-5 w-5"/>PROFIT CALCULATOR</TabsTrigger>
            </TabsList>
            <TabsContent value="transactional" className="mt-4">
                <Card>
                    <CardHeader><CardTitle className="text-lg uppercase">TRANSACTIONAL PROFIT DETAILS (SELECTED PERIOD)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                         {filteredTransactionsForPeriod.length === 0 ? (
                            <p className="text-muted-foreground text-center py-10 uppercase">NO TRANSACTIONS FOR THIS PERIOD.</p>
                         ) : (
                            <ScrollArea className="h-[60vh] rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-2 text-xs uppercase">DATE</TableHead>
                                            <TableHead className="px-2 py-2 text-xs uppercase">CUSTOMER</TableHead>
                                            <TableHead className="px-2 py-2 text-xs uppercase">VAKKAL</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs uppercase">QTY (KG)</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs uppercase">SALE RATE</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs uppercase">LANDED COST</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs uppercase">GROSS P/L</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs uppercase">NET P/L</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactionsForPeriod.map((tx, index) => (
                                            <TableRow key={`${tx.saleId}-${tx.lotNumber}-${index}`} className="uppercase">
                                                <TableCell className="px-2 py-1 text-xs">{format(parseISO(tx.date), "dd/MM/yy")}</TableCell>
                                                <TableCell className="truncate max-w-[120px] px-2 py-1 text-xs">{tx.customerName}</TableCell>
                                                <TableCell className="px-2 py-1 text-xs">{tx.lotNumber}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{tx.saleNetWeightKg.toLocaleString()}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{Math.round(tx.saleRatePerKg).toLocaleString()}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{Math.round(tx.landedCostPerKg).toLocaleString()}</TableCell>
                                                <TableCell className={`text-right font-medium px-2 py-1 text-xs ${tx.grossProfit >= 0 ? 'text-cyan-600' : 'text-orange-600'}`}>{Math.round(tx.grossProfit).toLocaleString()}</TableCell>
                                                <TableCell className={`text-right font-bold px-2 py-1 text-xs ${tx.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(tx.netProfit).toLocaleString()}</TableCell>
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
                    <CardHeader><CardTitle className="text-lg uppercase">MONTHLY SUMMARY (FY {currentFinancialYearString})</CardTitle></CardHeader>
                    <CardContent className="p-0">
                         {monthlySummaryForFY.length === 0 ? (
                            <p className="text-muted-foreground text-center py-10 uppercase">NO MONTHLY DATA TO SUMMARIZE.</p>
                         ) : (
                            <ScrollArea className="h-[60vh] rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-2 py-2 text-xs uppercase">MONTH</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs uppercase">TRANSACTIONS</TableHead>
                                            <TableHead className="text-right px-2 py-2 text-xs uppercase">NET PROFIT</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {monthlySummaryForFY.map(m => (
                                            <TableRow key={m.monthKey} onClick={() => handleMonthClick(m.monthKey)} className="cursor-pointer hover:bg-muted uppercase">
                                                <TableCell className="font-medium px-2 py-1 text-xs">{m.monthYear}</TableCell>
                                                <TableCell className="text-right px-2 py-1 text-xs">{m.transactionCount}</TableCell>
                                                <TableCell className={`text-right font-semibold px-2 py-1 text-xs ${Math.round(m.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.round(m.netProfit || 0).toLocaleString('en-IN')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                         )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="calculator" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg uppercase">PROFIT & COST CALCULATOR</CardTitle>
                        <div className="pt-2">
                            <MasterDataCombobox
                                value={saleIdForCalc}
                                onChange={setSaleIdForCalc}
                                options={saleOptionsForCalc}
                                placeholder="Select a Sale to Analyze..."
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!saleIdForCalc ? (
                             <div className="text-center py-10 text-muted-foreground uppercase">Please select a sale to see its detailed cost breakdown.</div>
                        ) : (
                            <div className="space-y-6">
                                {itemsForSelectedSaleCalc.map((item, index) => {
                                    const { costBreakdown, saleExpenses } = item;
                                    const effectiveSaleRate = item.saleNetWeightKg > 0 ? (item.goodsValue - saleExpenses.total) / item.saleNetWeightKg : 0;
                                    return (
                                        <Card key={index} className="bg-muted/30 p-4">
                                            <CardHeader className="p-0 pb-3">
                                                <CardTitle className="text-primary">ITEM: {item.lotNumber} ({item.saleNetWeightKg.toLocaleString()} KG)</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2 p-3 border rounded-lg bg-background">
                                                    <h3 className="font-semibold text-lg text-primary flex items-center"><ArrowDown className="mr-2 h-5 w-5"/>LANDED COST/KG</h3>
                                                    <Table><TableBody>
                                                        <BreakdownRow label="Base Purchase Rate" value={costBreakdown?.baseRate || item.basePurchaseRate} />
                                                        {costBreakdown?.purchaseExpenses > 0 ? <BreakdownRow label="Purchase Expenses" value={costBreakdown.purchaseExpenses} isSub /> : null}
                                                        {costBreakdown?.transferExpenses > 0 ? <BreakdownRow label="Transfer Expenses" value={costBreakdown.transferExpenses} isSub /> : null}
                                                        <TableRow className="bg-primary/10 font-bold text-primary text-base">
                                                            <TableCell className="py-2 pl-4">✅ FINAL LANDED COST</TableCell>
                                                            <TableCell className="py-2 text-right font-mono">₹{item.landedCostPerKg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                        </TableRow>
                                                    </TableBody></Table>
                                                </div>
                                                <div className="space-y-2 p-3 border rounded-lg bg-background">
                                                    <h3 className="font-semibold text-lg text-primary flex items-center"><Zap className="mr-2 h-5 w-5"/>SALE & PROFIT/KG</h3>
                                                    <Table><TableBody>
                                                        <BreakdownRow label="Sale Rate" value={item.saleRatePerKg} color="green" />
                                                        {Object.entries(saleExpenses).map(([key, value]) => {
                                                          if(key === 'total' || value <= 0) return null;
                                                          return <DeductionRow key={key} label={key} value={value / item.saleNetWeightKg} isSub />
                                                        })}
                                                        <TableRow className="bg-green-500/10 font-bold text-green-700 text-base">
                                                            <TableCell className="py-2 pl-4">✅ EFFECTIVE SALE RATE</TableCell>
                                                            <TableCell className="py-2 text-right font-mono">₹{effectiveSaleRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                                        </TableRow>
                                                    </TableBody></Table>
                                                </div>
                                            </CardContent>
                                            <div className="p-4 bg-background rounded-lg mt-4">
                                                <h3 className="font-semibold text-center text-lg mb-2 uppercase">Final Calculation For This Item</h3>
                                                <div className="flex justify-between items-center text-base">
                                                    <div className="text-center"><p className="text-sm text-muted-foreground">EFFECTIVE SALE RATE</p><p className="font-bold text-lg text-green-600">₹{effectiveSaleRate.toFixed(2)}</p></div>
                                                    <Minus className="h-6 w-6 text-muted-foreground" />
                                                     <div className="text-center">
                                                        <p className="text-sm text-muted-foreground">LANDED COST</p>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <p className="font-bold text-lg text-red-600 underline decoration-dashed cursor-help">₹{item.landedCostPerKg.toFixed(2)}</p>
                                                          </TooltipTrigger>
                                                          <TooltipContent>Base Rate: {item.costBreakdown?.baseRate.toFixed(2)} + Purchase Exp: {item.costBreakdown?.purchaseExpenses.toFixed(2)} + Transfer Exp: {item.costBreakdown?.transferExpenses.toFixed(2)}</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    <div className="font-extrabold text-2xl text-muted-foreground mx-2">=</div>
                                                     <div className="text-center p-2 rounded-md bg-muted shadow-inner">
                                                        <p className="text-sm text-muted-foreground">NET PROFIT/KG</p>
                                                        <p className={cn("font-bold text-2xl", (effectiveSaleRate - item.landedCostPerKg) >= 0 ? 'text-primary' : 'text-destructive')}>₹{(effectiveSaleRate - item.landedCostPerKg).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                                 <div className="text-center text-xl font-bold mt-4 pt-2 border-t">
                                                    TOTAL NET PROFIT FOR {item.saleNetWeightKg} KG: <span className={cn("ml-2", item.netProfit >=0 ? 'text-primary' : 'text-destructive')}>₹{Math.round(item.netProfit).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                                                 </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
