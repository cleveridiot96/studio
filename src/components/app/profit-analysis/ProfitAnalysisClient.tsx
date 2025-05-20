
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Sale, Purchase, TransactionalProfitInfo, MonthlyProfitInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, DollarSign, BarChart3, CalendarDays } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, startOfYear, endOfYear } from "date-fns";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";


const SALES_STORAGE_KEY = 'salesData';
const PURCHASES_STORAGE_KEY = 'purchasesData';

export function ProfitAnalysisClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const memoizedInitialSales = React.useMemo(() => [], []);
  const memoizedInitialPurchases = React.useMemo(() => [], []);

  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedInitialSales);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);
  
  const { financialYear: currentFinancialYearString } = useSettings();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    // Default to current financial year
    const [startYearStr] = currentFinancialYearString.split('-');
    const startYear = parseInt(startYearStr, 10);
    if (!isNaN(startYear)) {
      return {
        from: new Date(startYear, 3, 1), // April 1st
        to: new Date(startYear + 1, 2, 31) // March 31st
      };
    }
    return undefined; // Fallback if FY string is invalid
  });


  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const profitData = React.useMemo(() => {
    if (!hydrated) return { transactions: [], monthlySummary: [] as MonthlyProfitInfo[], overallProfit: 0 };

    const filteredSales = sales.filter(sale => {
      if (!dateRange?.from) return true; // "All Time" if no 'from' date
      const saleDate = parseISO(sale.date);
      const effectiveToDate = dateRange.to || dateRange.from; // Use 'from' if 'to' is not set
      return isWithinInterval(saleDate, { start: dateRange.from, end: endOfDay(effectiveToDate) });
    });

    const transactions: TransactionalProfitInfo[] = [];
    const monthlyAgg: Record<string, { totalProfit: number; totalSalesValue: number; totalCostOfGoods: number }> = {};

    filteredSales.forEach(sale => {
      const netProfit = sale.calculatedProfit !== undefined ? sale.calculatedProfit : 0;
      
      const purchaseForLot = purchases.find(p => p.lotNumber === sale.lotNumber);
      const purchaseRatePerKg = (purchaseForLot && typeof purchaseForLot.rate === 'number') ? purchaseForLot.rate : 0; 
      const costOfGoodsSold = (typeof sale.netWeight === 'number' ? sale.netWeight : 0) * purchaseRatePerKg;

      transactions.push({
        saleId: sale.id,
        date: sale.date,
        billNumber: sale.billNumber,
        customerName: sale.customerName,
        lotNumber: sale.lotNumber,
        saleQuantityBags: sale.quantity,
        saleNetWeightKg: sale.netWeight,
        saleRatePerKg: sale.rate,
        saleAmount: sale.totalAmount, 
        purchaseCostForSalePortion: costOfGoodsSold,
        transportCostOnSale: sale.transportCost,
        brokerageOnSale: sale.calculatedBrokerageCommission,
        netProfit: netProfit,
      });

      const monthKey = format(startOfMonth(parseISO(sale.date)), "yyyy-MM");
      if (!monthlyAgg[monthKey]) {
        monthlyAgg[monthKey] = { totalProfit: 0, totalSalesValue: 0, totalCostOfGoods: 0 };
      }
      monthlyAgg[monthKey].totalProfit += netProfit;
      monthlyAgg[monthKey].totalSalesValue += sale.totalAmount;
      monthlyAgg[monthKey].totalCostOfGoods += costOfGoodsSold;
    });

    const monthlySummary: MonthlyProfitInfo[] = Object.entries(monthlyAgg)
      .map(([key, value]) => ({
        monthYear: format(parseISO(key + "-01"), "MMMM yyyy"),
        ...value,
      }))
      .sort((a, b) => {
        const dateA = parseISO(a.monthYear.split(" ")[1] + "-" + (new Date(Date.parse(a.monthYear.split(" ")[0] +" 1, 2000")).getMonth()+1).toString().padStart(2, '0') + "-01");
        const dateB = parseISO(b.monthYear.split(" ")[1] + "-" + (new Date(Date.parse(b.monthYear.split(" ")[0] +" 1, 2000")).getMonth()+1).toString().padStart(2, '0') + "-01");
        return dateB.getTime() - dateA.getTime(); 
      });
    
    const overallProfit = transactions.reduce((sum, tx) => sum + tx.netProfit, 0);

    return { transactions: transactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()), monthlySummary, overallProfit };
  }, [sales, purchases, hydrated, dateRange]);

  const setDateFilter = (type: "thisMonth" | "lastMonth" | "currentFY" | "allTime") => {
    const today = new Date();
    if (type === "thisMonth") {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    } else if (type === "lastMonth") {
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      const lastMonthEnd = endOfMonth(subMonths(today, 1));
      setDateRange({ from: lastMonthStart, to: lastMonthEnd });
    } else if (type === "currentFY") {
        const [startYearStr] = currentFinancialYearString.split('-');
        const startYear = parseInt(startYearStr, 10);
        if (!isNaN(startYear)) {
            setDateRange({ from: new Date(startYear, 3, 1), to: endOfDay(new Date(startYear + 1, 2, 31)) });
        }
    } else if (type === "allTime") {
      setDateRange(undefined); // undefined signifies all time
    }
  };


  if (!hydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading profit analysis data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-2xl text-primary flex items-center">
            <DollarSign className="mr-3 h-7 w-7" /> Profit Analysis
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full md:w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setDateFilter("thisMonth")}><CalendarDays className="mr-2 h-4 w-4" /> This Month</Button>
            <Button variant="outline" size="sm" onClick={() => setDateFilter("lastMonth")}><CalendarDays className="mr-2 h-4 w-4" /> Last Month</Button>
            <Button variant="outline" size="sm" onClick={() => setDateFilter("currentFY")}><CalendarDays className="mr-2 h-4 w-4" /> Current FY</Button>
            <Button variant="outline" size="sm" onClick={() => setDateFilter("allTime")}><CalendarDays className="mr-2 h-4 w-4" /> All Time</Button>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Monthly Profit Summary</h3>
          {profitData.monthlySummary.length === 0 ? (
            <p className="text-muted-foreground">No monthly profit data for the selected period.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profitData.monthlySummary.map(month => (
                <Card key={month.monthYear} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{month.monthYear}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>Total Sales: <span className="font-semibold">₹{month.totalSalesValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>
                    <p>Total COGS: <span className="font-semibold">₹{month.totalCostOfGoods.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>
                    <p className={`font-bold ${month.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Net Profit: ₹{month.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
         <CardFooter className="mt-4 pt-4 border-t">
            <div className="w-full flex justify-end text-xl font-bold text-primary">
                <span>Overall Net Profit (Selected Period):</span>
                <span className={`ml-4 ${profitData.overallProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  ₹{profitData.overallProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
            </div>
        </CardFooter>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center">
            <BarChart3 className="mr-3 h-7 w-7" /> Transaction-wise Profit/Loss (Selected Period)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Date</TableHead>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Lot No.</TableHead>
                  <TableHead className="text-right">Sale Qty (Bags)</TableHead>
                  <TableHead className="text-right">Sale Wt (kg)</TableHead>
                  <TableHead className="text-right">Sale Rate (₹/kg)</TableHead>
                  <TableHead className="text-right">Sale Amt (₹)</TableHead>
                  <TableHead className="text-right">COGS (₹)</TableHead>
                  <TableHead className="text-right">Expenses (₹)</TableHead>
                  <TableHead className="text-right">Net Profit (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitData.transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center h-32 text-muted-foreground">No sales transactions to analyze for the selected period.</TableCell></TableRow>
                ) : (
                  profitData.transactions.map((tx) => (
                    <TableRow key={tx.saleId}>
                      <TableCell>{format(parseISO(tx.date), "dd-MM-yy")}</TableCell>
                      <TableCell>{tx.billNumber || 'N/A'}</TableCell>
                      <TableCell className="truncate max-w-[150px]">{tx.customerName || 'N/A'}</TableCell>
                      <TableCell>{tx.lotNumber}</TableCell>
                      <TableCell className="text-right">{tx.saleQuantityBags.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{tx.saleNetWeightKg.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{tx.saleRatePerKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{tx.saleAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{tx.purchaseCostForSalePortion.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{((tx.transportCostOnSale || 0) + (tx.brokerageOnSale || 0)).toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-semibold ${tx.netProfit < 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {tx.netProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

    