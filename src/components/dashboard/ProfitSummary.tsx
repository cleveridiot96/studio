
"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { Sale, Purchase, MonthlyProfitInfo } from "@/lib/types";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils"; // Import financial year utility
import { DollarSign } from "lucide-react";

interface ProfitSummaryProps {
  sales: Sale[];
  purchases: Purchase[];
}

const getPurchaseDetailsForSaleLot = (lotNumberFromSale: string | undefined | null, purchases: Purchase[]): { rate: number; supplierName?: string; agentName?: string } => {
  const searchLot = String(lotNumberFromSale || "").toLowerCase().trim();
  if (!searchLot) {
    return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
  }

  const matchedPurchase = purchases.find(p => {
    const purchaseLot = String(p.lotNumber || "").toLowerCase().trim();
    return purchaseLot === searchLot;
  });

  if (!matchedPurchase) {
    // console.warn(`ProfitSummary: No matching purchase found for lot: "${searchLot}"`);
    return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
  }
  return {
    rate: matchedPurchase.rate ?? 0,
    supplierName: matchedPurchase.supplierName || matchedPurchase.supplierId || 'N/A',
    agentName: matchedPurchase.agentName || matchedPurchase.agentId || 'N/A',
  };
};

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales: allSalesData, purchases }) => {
  const { financialYear: currentFinancialYearString } = useSettings();
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "all" or "yyyy-MM"
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const getFinancialYearDateRange = (fyString: string): { start: Date; end: Date } | null => {
    const [startYearStr, endYearStrShort] = fyString.split('-');
    const startYear = parseInt(startYearStr, 10);
    // End year needs to be calculated from start year for consistency, e.g., 2023-24 means end year is 2024
    const endYear = startYear + 1;

    if (isNaN(startYear)) return null;
    
    // FY is April of startYear to March of endYear
    return {
      start: new Date(startYear, 3, 1), // April 1st
      end: endOfMonth(new Date(endYear, 2, 1)), // March 31st (approx, endOfMonth handles days)
    };
};


  // Filter sales by the global financial year first
  const salesForCurrentFY = useMemo(() => {
    if (!hydrated || !allSalesData) return [];
    return allSalesData.filter(sale => isDateInFinancialYear(sale.date, currentFinancialYearString));
  }, [allSalesData, currentFinancialYearString, hydrated]);

  const allProfitTransactions = useMemo(() => {
    if (!hydrated || !salesForCurrentFY || !purchases) return [];

    return salesForCurrentFY.map((sale) => {
      const { rate: purchaseRateValue, supplierName, agentName } = getPurchaseDetailsForSaleLot(sale.lotNumber, purchases);
      
      const saleRateNum = typeof sale.rate === 'number' ? sale.rate : 0;
      const purchaseRateNum = typeof purchaseRateValue === 'number' ? purchaseRateValue : 0;
      const saleNetWeightNum = typeof sale.netWeight === 'number' ? sale.netWeight : 0;
      
      let currentProfit = (typeof sale.calculatedProfit === 'number' && !isNaN(sale.calculatedProfit))
                          ? sale.calculatedProfit
                          : (saleRateNum * saleNetWeightNum) - (purchaseRateNum * saleNetWeightNum) - (sale.transportCost || 0) - (sale.calculatedBrokerageCommission || 0);
      
      currentProfit = isNaN(currentProfit) ? 0 : currentProfit;

      return {
        ...sale,
        profit: currentProfit,
        purchaseRate: purchaseRateNum,
        supplierName,
        agentName,
      };
    });
  }, [salesForCurrentFY, purchases, hydrated]);

  const monthOptions = useMemo(() => {
    if (!hydrated) return [];
    const options: { value: string; label: string }[] = [
        { value: "all", label: `All Months (Current FY: ${currentFinancialYearString})` }
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
            console.error("Error generating month options for ProfitSummary:", error);
        }
    }
    return options;
  }, [hydrated, currentFinancialYearString]);


  const filteredProfitTransactions = useMemo(() => {
    if (selectedMonth === "all") return allProfitTransactions;
    return allProfitTransactions.filter(tx => {
      if (!tx.date) return false;
      try {
        return format(startOfMonth(parseISO(tx.date)), "yyyy-MM") === selectedMonth;
      } catch (e) {
        console.error("Error parsing date for filtering profit transactions:", tx.date, e);
        return false;
      }
    });
  }, [allProfitTransactions, selectedMonth]);
  
  const totalProfitForSelectedPeriod = filteredProfitTransactions.reduce((acc, item) => acc + (item.profit || 0), 0);

  const monthlyProfitsDataForSelectedPeriod = useMemo(() => {
    const monthlyAgg: Record<string, { monthKey: string; monthYear: string; totalProfit: number; totalSalesValue: number; totalCostOfGoods: number }> = {};
    
    const sourceTransactions = filteredProfitTransactions; // Already filtered by selectedMonth OR all of current FY

    sourceTransactions.forEach(item => {
      if (item.date) {
        try {
          const monthKey = format(startOfMonth(parseISO(item.date)), "yyyy-MM");
          if (!monthlyAgg[monthKey]) {
            monthlyAgg[monthKey] = { 
                monthKey: monthKey,
                monthYear: format(parseISO(monthKey + "-01"), "MMMM yyyy"),
                totalProfit: 0, 
                totalSalesValue: 0, 
                totalCostOfGoods: 0 
            };
          }
          monthlyAgg[monthKey].totalProfit += (item.profit || 0);
          monthlyAgg[monthKey].totalSalesValue += item.totalAmount;
          monthlyAgg[monthKey].totalCostOfGoods += item.purchaseRate * item.netWeight;

        } catch (e) {
          console.error("Error parsing date for monthly aggregation in ProfitSummary:", item.date, e);
        }
      }
    });
    
    const summaryArray = Object.values(monthlyAgg)
        .sort((a, b) => parseISO(b.monthKey + "-01").getTime() - parseISO(a.monthKey + "-01").getTime());

    if (selectedMonth !== "all" && summaryArray.length > 0) {
        return summaryArray.filter(s => s.monthKey === selectedMonth);
    }
    return summaryArray;

  }, [filteredProfitTransactions, selectedMonth]);

  if (!hydrated) {
    return <Card className="shadow-lg border-primary/30 mt-6"><CardHeader><CardTitle>Loading Profit Data...</CardTitle></CardHeader><CardContent><p>Please wait...</p></CardContent></Card>;
  }

  return (
    <Card className="shadow-lg border-primary/30 mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl text-primary flex items-center">
            <DollarSign className="mr-2 h-6 w-6"/> Profit & Loss (FY: {currentFinancialYearString})
          </CardTitle>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[220px] text-sm">
              <SelectValue placeholder="Filter by Month..." />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Transaction-wise Profit & Loss</h3>
          {filteredProfitTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sales data to analyze for profit in the selected period/FY.</p>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border">
              <Table size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Vakkal</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead className="text-right">Purch. Rate (₹/kg)</TableHead>
                    <TableHead className="text-right">Sale Rate (₹/kg)</TableHead>
                    <TableHead className="text-right">Qty (kg)</TableHead>
                    <TableHead className="text-right">Profit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfitTransactions.map((row, i) => (
                    <TableRow key={`${row.id}-${i}`}>
                      <TableCell>{row.date ? format(parseISO(row.date), "dd-MM-yy") : 'N/A'}</TableCell>
                      <TableCell>{row.billNumber || 'N/A'}</TableCell>
                      <TableCell>{row.lotNumber || "N/A"}</TableCell>
                      <TableCell className="truncate max-w-[100px]">{row.supplierName}</TableCell>
                      <TableCell className="truncate max-w-[80px]">{row.agentName || 'N/A'}</TableCell>
                      <TableCell className="truncate max-w-[100px]">{row.customerName || row.customerId}</TableCell>
                      <TableCell className="truncate max-w-[80px]">{row.brokerName || row.brokerId || 'N/A'}</TableCell>
                      <TableCell className="text-right">{(row.purchaseRate || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{(row.rate || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{(row.netWeight || 0).toLocaleString()} kg</TableCell>
                      <TableCell className={`text-right font-medium ${(row.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {(row.profit || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        {monthlyProfitsDataForSelectedPeriod.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Month-wise Profit Summary</h3>
            <ScrollArea className="h-[200px] rounded-md border">
              <Table size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total Profit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyProfitsDataForSelectedPeriod.map((monthData) => (
                    <TableRow key={monthData.monthKey}>
                      <TableCell>{monthData.monthYear}</TableCell>
                      <TableCell className={`text-right font-medium ${monthData.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {monthData.totalProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 mt-4">
        <div className="w-full flex justify-end text-lg font-bold text-primary">
          <span>Total Net Profit/Loss (Selected Period/FY):</span>
          <span className={`ml-4 ${(totalProfitForSelectedPeriod || 0) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {(totalProfitForSelectedPeriod || 0).toFixed(2)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};
