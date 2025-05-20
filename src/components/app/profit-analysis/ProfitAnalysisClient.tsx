
"use client";

import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { Sale, Purchase, TransactionalProfitInfo, MonthlyProfitInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, DollarSign, BarChart3, Package } from "lucide-react";
import { format, parseISO, startOfMonth } from "date-fns";

const SALES_STORAGE_KEY = 'salesData';
const PURCHASES_STORAGE_KEY = 'purchasesData';

export function ProfitAnalysisClient() {
  const [hydrated, setHydrated] = React.useState(false);
  const memoizedInitialSales = React.useMemo(() => [], []);
  const memoizedInitialPurchases = React.useMemo(() => [], []);

  const [sales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedInitialSales);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedInitialPurchases);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const profitData = React.useMemo(() => {
    if (!hydrated) return { transactions: [], monthlySummary: [] as MonthlyProfitInfo[], overallProfit: 0 };

    const transactions: TransactionalProfitInfo[] = [];
    const monthlyAgg: Record<string, { totalProfit: number; totalSalesValue: number; totalCostOfGoods: number }> = {};

    sales.forEach(sale => {
      // Use the pre-calculated profit if available from the sale object
      // This profit was calculated at the time of sale creation
      const netProfit = sale.calculatedProfit !== undefined ? sale.calculatedProfit : 0;
      
      // For display purposes, we might still want to show COGS.
      // Find the related purchase to get cost basis (simplification: using first purchase of lot)
      const purchaseForLot = purchases.find(p => p.lotNumber === sale.lotNumber);
      // Ensure purchaseForLot exists and rate is a number before calculation
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
        monthYear: format(parseISO(key + "-01"), "MMMM yyyy"), // Ensure date parsing is robust
        ...value,
      }))
      .sort((a, b) => {
        // Robust sorting for monthYear strings like "May 2024"
        const dateA = parseISO(a.monthYear.split(" ")[1] + "-" + (new Date(Date.parse(a.monthYear.split(" ")[0] +" 1, 2000")).getMonth()+1).toString().padStart(2, '0') + "-01");
        const dateB = parseISO(b.monthYear.split(" ")[1] + "-" + (new Date(Date.parse(b.monthYear.split(" ")[0] +" 1, 2000")).getMonth()+1).toString().padStart(2, '0') + "-01");
        return dateB.getTime() - dateA.getTime(); // Sort descending (most recent first)
      });
    
    const overallProfit = transactions.reduce((sum, tx) => sum + tx.netProfit, 0);

    return { transactions: transactions.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()), monthlySummary, overallProfit };
  }, [sales, purchases, hydrated]);

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
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center">
            <DollarSign className="mr-3 h-7 w-7" /> Monthly Profit Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitData.monthlySummary.length === 0 ? (
            <p className="text-muted-foreground">No monthly profit data available yet.</p>
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
                <span>Overall Net Profit:</span>
                <span className={`ml-4 ${profitData.overallProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  ₹{profitData.overallProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
            </div>
        </CardFooter>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary flex items-center">
            <BarChart3 className="mr-3 h-7 w-7" /> Transaction-wise Profit/Loss
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
                  <TableRow><TableCell colSpan={11} className="text-center h-32 text-muted-foreground">No sales transactions to analyze.</TableCell></TableRow>
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
