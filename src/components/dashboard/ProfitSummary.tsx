
"use client";

import React, { useMemo, useState } from "react";
import type { Sale, Purchase, MonthlyProfitInfo as MonthlyProfitInfoType } from "@/lib/types";
import { format, parseISO, startOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProfitSummaryProps {
  sales: Sale[];
  purchases: Purchase[];
}

interface ProfitTransactionDisplayItem {
  date: string;
  billNumber?: string;
  lotNumber: string;
  supplierName?: string;
  agentName?: string;
  customerName?: string;
  brokerName?: string;
  purchaseRate: number;
  saleRate: number;
  netWeight: number;
  profit: number;
}

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales, purchases }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "all" or "yyyy-MM"

  const getPurchaseDetailsForSaleLot = (lotNumberFromSale?: string | null): { rate: number; supplierName?: string; agentName?: string } => {
    const searchLot = String(lotNumberFromSale || "").toLowerCase().trim();

    if (!searchLot) {
      // console.warn(`ProfitSummary: Attempted to find purchase for an empty/invalid lotNumber.`);
      return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
    }

    const matchedPurchase = purchases.find(p => {
      const purchaseLot = String(p.lotNumber || "").toLowerCase().trim();
      return purchaseLot === searchLot;
    });

    if (!matchedPurchase) {
      // console.warn(`ProfitSummary: No matching purchase found for lot: "${searchLot}" (original input: "${lotNumberFromSale}")`);
      return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
    }
    return {
      rate: matchedPurchase.rate ?? 0,
      supplierName: matchedPurchase.supplierName || matchedPurchase.supplierId || 'N/A',
      agentName: matchedPurchase.agentName || matchedPurchase.agentId || 'N/A',
    };
  };

  const allProfitTransactions = useMemo((): ProfitTransactionDisplayItem[] => {
    if (!sales || !purchases) {
      // console.warn("ProfitSummary: Sales or Purchases data is missing for calculation.");
      return [];
    }

    return sales.map((sale) => {
      const { rate: purchaseRateValue, supplierName, agentName } = getPurchaseDetailsForSaleLot(sale.lotNumber);
      
      const saleRateNum = typeof sale.rate === 'number' ? sale.rate : 0;
      const purchaseRateNum = typeof purchaseRateValue === 'number' ? purchaseRateValue : 0;
      const saleNetWeightNum = typeof sale.netWeight === 'number' ? sale.netWeight : 0;
      
      // Use pre-calculated profit if available and valid, otherwise calculate it
      // This allows complex profit logic from AddSaleForm to take precedence
      let currentProfit = (typeof sale.calculatedProfit === 'number' && !isNaN(sale.calculatedProfit))
                          ? sale.calculatedProfit
                          : (saleRateNum - purchaseRateNum) * saleNetWeightNum;
      
      currentProfit = isNaN(currentProfit) ? 0 : currentProfit;

      return {
        date: sale.date,
        billNumber: sale.billNumber || 'N/A',
        lotNumber: sale.lotNumber || "N/A",
        supplierName,
        agentName,
        customerName: sale.customerName || sale.customerId || 'N/A',
        brokerName: sale.brokerName || sale.brokerId || 'N/A',
        purchaseRate: purchaseRateNum,
        saleRate: saleRateNum,
        netWeight: saleNetWeightNum,
        profit: currentProfit,
      };
    });
  }, [sales, purchases]); // getPurchaseDetailsForSaleLot is stable due to useCallback or definition scope

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    allProfitTransactions.forEach(tx => {
      if (tx.date) {
        try {
          months.add(format(startOfMonth(parseISO(tx.date)), "yyyy-MM"));
        } catch (e) {
          // console.error("Error parsing date for month option:", tx.date, e);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)).map(monthKey => ({
      value: monthKey,
      label: format(parseISO(monthKey + "-01"), "MMMM yyyy")
    }));
  }, [allProfitTransactions]);

  const filteredProfitTransactions = useMemo(() => {
    if (selectedMonth === "all") return allProfitTransactions;
    return allProfitTransactions.filter(tx => {
      if (!tx.date) return false;
      try {
        return format(startOfMonth(parseISO(tx.date)), "yyyy-MM") === selectedMonth;
      } catch (e) {
        return false;
      }
    });
  }, [allProfitTransactions, selectedMonth]);
  
  const totalProfitForSelectedPeriod = filteredProfitTransactions.reduce((acc, item) => acc + (item.profit || 0), 0);

  const monthlyProfitsDataForSelectedPeriod = useMemo(() => {
    const monthlyAgg: Record<string, { totalProfit: number }> = {};
    const sourceTransactions = selectedMonth === "all" ? allProfitTransactions : filteredProfitTransactions;

    sourceTransactions.forEach(item => {
      if (item.date) {
        try {
          const monthKey = format(startOfMonth(parseISO(item.date)), "yyyy-MM");
          if (!monthlyAgg[monthKey]) {
            monthlyAgg[monthKey] = { totalProfit: 0 };
          }
          monthlyAgg[monthKey].totalProfit += (item.profit || 0);
        } catch (e) {
          // console.error("Error parsing date for monthly aggregation:", item.date, e);
        }
      }
    });

    const summary: MonthlyProfitInfoType[] = Object.entries(monthlyAgg)
      .map(([key, value]) => ({
        monthKey: key,
        monthYear: format(parseISO(key + "-01"), "MMMM yyyy"),
        totalProfit: value.totalProfit,
        totalSalesValue: 0, // Not calculating these here for simplicity, focus on profit
        totalCostOfGoods: 0, // Not calculating these here
      }))
      .sort((a, b) => parseISO(b.monthKey + "-01").getTime() - parseISO(a.monthKey + "-01").getTime());
    
    if (selectedMonth !== "all" && summary.length > 0) {
        return summary.filter(s => s.monthKey === selectedMonth);
    }
    return summary;
  }, [allProfitTransactions, filteredProfitTransactions, selectedMonth]);

  return (
    <Card className="shadow-lg border-primary/30 mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl text-primary">Profit & Loss Statement</CardTitle>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by Month..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
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
            <p className="text-muted-foreground text-center py-4">No sales data to analyze for profit in the selected period.</p>
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
                    <TableRow key={`${row.date}-${row.lotNumber}-${row.billNumber || i}-${i}`}>
                      <TableCell>{row.date ? format(parseISO(row.date), "dd-MM-yy") : 'N/A'}</TableCell>
                      <TableCell>{row.billNumber}</TableCell>
                      <TableCell>{row.lotNumber}</TableCell>
                      <TableCell className="truncate max-w-[100px]">{row.supplierName}</TableCell>
                      <TableCell className="truncate max-w-[80px]">{row.agentName}</TableCell>
                      <TableCell className="truncate max-w-[100px]">{row.customerName}</TableCell>
                      <TableCell className="truncate max-w-[80px]">{row.brokerName}</TableCell>
                      <TableCell className="text-right">{row.purchaseRate?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell className="text-right">{row.saleRate?.toFixed(2)}</TableCell>
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
          <span>Total Net Profit/Loss (Selected Period):</span>
          <span className={`ml-4 ${totalProfitForSelectedPeriod >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {totalProfitForSelectedPeriod.toFixed(2)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

    