
"use client";

import React, { useMemo, useState } from "react";
import type { Sale, Purchase, MonthlyProfitInfo } from "@/lib/types";
import { format, parseISO, startOfMonth, isWithinInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/contexts/SettingsContext"; // Import useSettings
import { isDateInFinancialYear } from "@/lib/utils"; // Import financial year utility

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
    console.warn(`ProfitSummary: No matching purchase found for lot: "${searchLot}"`);
    return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
  }
  return {
    rate: matchedPurchase.rate ?? 0,
    supplierName: matchedPurchase.supplierName || matchedPurchase.supplierId || 'N/A',
    agentName: matchedPurchase.agentName || matchedPurchase.agentId || 'N/A',
  };
};

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales: allSalesData, purchases }) => {
  const { financialYear } = useSettings(); // Get current financial year
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "all" or "yyyy-MM"

  // Filter sales based on the global financial year first
  const salesForCurrentFY = useMemo(() => {
    if (!allSalesData) return [];
    return allSalesData.filter(sale => isDateInFinancialYear(sale.date, financialYear));
  }, [allSalesData, financialYear]);

  const allProfitTransactionsForFY = useMemo((): (Sale & { profit: number; purchaseRate: number; supplierName?: string; agentName?: string; })[] => {
    if (!salesForCurrentFY || !purchases) return [];

    return salesForCurrentFY.map((sale) => {
      const { rate: purchaseRateValue, supplierName, agentName } = getPurchaseDetailsForSaleLot(sale.lotNumber, purchases);
      
      const saleRateNum = typeof sale.rate === 'number' ? sale.rate : 0;
      const purchaseRateNum = typeof purchaseRateValue === 'number' ? purchaseRateValue : 0;
      const saleNetWeightNum = typeof sale.netWeight === 'number' ? sale.netWeight : 0;
      
      let currentProfit = (typeof sale.calculatedProfit === 'number' && !isNaN(sale.calculatedProfit))
                          ? sale.calculatedProfit
                          : (saleRateNum - purchaseRateNum) * saleNetWeightNum - (sale.transportCost || 0) - (sale.calculatedBrokerageCommission || 0);
      
      currentProfit = isNaN(currentProfit) ? 0 : currentProfit;

      return {
        ...sale,
        profit: currentProfit,
        purchaseRate: purchaseRateNum,
        supplierName,
        agentName,
      };
    });
  }, [salesForCurrentFY, purchases]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    allProfitTransactionsForFY.forEach(tx => {
      if (tx.date) {
        try {
          months.add(format(startOfMonth(parseISO(tx.date)), "yyyy-MM"));
        } catch (e) {
          console.error("Error parsing date for month option in ProfitSummary:", tx.date, e);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)).map(monthKey => ({
      value: monthKey,
      label: format(parseISO(monthKey + "-01"), "MMMM yyyy")
    }));
  }, [allProfitTransactionsForFY]);

  const filteredProfitTransactions = useMemo(() => {
    if (selectedMonth === "all") return allProfitTransactionsForFY;
    return allProfitTransactionsForFY.filter(tx => {
      if (!tx.date) return false;
      try {
        return format(startOfMonth(parseISO(tx.date)), "yyyy-MM") === selectedMonth;
      } catch (e) {
        return false;
      }
    });
  }, [allProfitTransactionsForFY, selectedMonth]);
  
  const totalProfitForSelectedPeriod = filteredProfitTransactions.reduce((acc, item) => acc + (item.profit || 0), 0);

  const monthlyProfitsDataForSelectedPeriod = useMemo(() => {
    const monthlyAgg: Record<string, { totalProfit: number, totalSalesValue: number, totalCostOfGoods: number }> = {};
    
    // Use filteredProfitTransactions if a month is selected, otherwise all transactions for the FY
    const sourceTransactions = selectedMonth === "all" ? allProfitTransactionsForFY : filteredProfitTransactions;

    sourceTransactions.forEach(item => {
      if (item.date) {
        try {
          const monthKey = format(startOfMonth(parseISO(item.date)), "yyyy-MM");
          if (!monthlyAgg[monthKey]) {
            monthlyAgg[monthKey] = { totalProfit: 0, totalSalesValue: 0, totalCostOfGoods: 0 };
          }
          monthlyAgg[monthKey].totalProfit += (item.profit || 0);
          monthlyAgg[monthKey].totalSalesValue += item.totalAmount;
          monthlyAgg[monthKey].totalCostOfGoods += item.purchaseRate * item.netWeight;

        } catch (e) {
          console.error("Error parsing date for monthly aggregation in ProfitSummary:", item.date, e);
        }
      }
    });

    const summary: MonthlyProfitInfo[] = Object.entries(monthlyAgg)
      .map(([key, value]) => ({
        monthKey: key, // Storing "yyyy-MM"
        monthYear: format(parseISO(key + "-01"), "MMMM yyyy"),
        totalProfit: value.totalProfit,
        totalSalesValue: value.totalSalesValue,
        totalCostOfGoods: value.totalCostOfGoods,
      }))
      .sort((a, b) => parseISO(b.monthKey + "-01").getTime() - parseISO(a.monthKey + "-01").getTime());
    
    if (selectedMonth !== "all" && summary.length > 0) {
        return summary.filter(s => s.monthKey === selectedMonth);
    }
    return summary;
  }, [allProfitTransactionsForFY, filteredProfitTransactions, selectedMonth]);


  return (
    <Card className="shadow-lg border-primary/30 mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl text-primary">Profit & Loss Statement (FY: {financialYear})</CardTitle>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by Month..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months (Current FY)</SelectItem>
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
          <h3 className="text-xl font-semibold mb-3 text-foreground">Transaction-wise Profit & Loss</h3>
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
                      <TableCell className="text-right">{row.purchaseRate?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell className="text-right">{row.rate?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{row.netWeight?.toLocaleString()} kg</TableCell>
                      <TableCell className={`text-right font-medium ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {row.profit?.toFixed(2)}
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
            <h3 className="text-xl font-semibold mb-3 text-foreground">Month-wise Profit Summary</h3>
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
          <span className={`ml-4 ${totalProfitForSelectedPeriod >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {totalProfitForSelectedPeriod.toFixed(2)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

      