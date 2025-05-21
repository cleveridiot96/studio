
"use client";

import React, { useMemo, useState } from "react";
import type { Sale, Purchase, MonthlyProfitInfo as MonthlyProfitInfoType } from "@/lib/types";
import { format, parseISO, startOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

interface ProfitSummaryProps {
  sales: Sale[];
  purchases: Purchase[];
}

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales, purchases }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); 

  const getPurchaseDetails = (lotNumber: string = ""): { rate: number; supplierName?: string; agentName?: string } => {
    const purchase = purchases.find(p =>
      p.lotNumber?.toLowerCase().trim() === lotNumber?.toLowerCase().trim()
    );
    if (!purchase) {
      console.warn(`⚠️ No purchase found for lot: "${lotNumber}" in ProfitSummary`);
      return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
    }
    return {
      rate: purchase.rate ?? 0,
      supplierName: purchase.supplierName || purchase.supplierId || 'N/A',
      agentName: purchase.agentName || purchase.agentId || 'N/A',
    };
  };

  const allProfitTransactions = useMemo(() => {
    if (!sales || !purchases) return [];
    return sales.map((sale) => {
      const { rate: purchaseRate, supplierName, agentName } = getPurchaseDetails(sale.lotNumber);
      
      const profit = sale.calculatedProfit !== undefined 
        ? sale.calculatedProfit 
        : (sale.rate * sale.netWeight) - (purchaseRate * sale.netWeight) - (sale.transportCost || 0) - (sale.calculatedBrokerageCommission || 0);

      return {
        date: sale.date,
        lotNumber: sale.lotNumber,
        supplierName: supplierName,
        agentName: agentName,
        customerName: sale.customerName || sale.customerId || 'N/A',
        brokerName: sale.brokerName || sale.brokerId || 'N/A',
        purchaseRate: purchaseRate,
        saleRate: sale.rate,
        netWeight: sale.netWeight,
        profit: profit,
        billNumber: sale.billNumber,
      };
    }).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [sales, purchases]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    allProfitTransactions.forEach(tx => {
      months.add(format(startOfMonth(parseISO(tx.date)), "yyyy-MM"));
    });
    return Array.from(months).sort().reverse().map(monthKey => ({
      value: monthKey, // "yyyy-MM"
      label: format(parseISO(monthKey + "-01"), "MMMM yyyy")
    }));
  }, [allProfitTransactions]);

  const filteredProfitTransactions = useMemo(() => {
    if (selectedMonth === "all") return allProfitTransactions;
    return allProfitTransactions.filter(tx => format(startOfMonth(parseISO(tx.date)), "yyyy-MM") === selectedMonth);
  }, [allProfitTransactions, selectedMonth]);
  
  const totalProfitForSelectedPeriod = filteredProfitTransactions.reduce((acc, item) => acc + (item.profit || 0), 0);

  const monthlyProfitsDataForSelectedPeriod = useMemo(() => {
    const monthlyAgg: Record<string, { totalProfit: number; totalSalesValue: number; totalCostOfGoods: number }> = {}; 
    const sourceTransactions = selectedMonth === "all" ? allProfitTransactions : filteredProfitTransactions;

    sourceTransactions.forEach(item => {
      const monthKey = format(startOfMonth(parseISO(item.date)), "yyyy-MM");
      if (!monthlyAgg[monthKey]) {
        monthlyAgg[monthKey] = { totalProfit: 0, totalSalesValue: 0, totalCostOfGoods: 0 };
      }
      monthlyAgg[monthKey].totalProfit += item.profit || 0;
      // For simplicity, totalSalesValue & totalCostOfGoods are aggregated on all transactions for the month,
      // even if a single transaction is filtered.
      // This part might need refinement if a single month view is strictly for THAT month's values only.
      monthlyAgg[monthKey].totalSalesValue += (item.saleRate * item.netWeight);
      monthlyAgg[monthKey].totalCostOfGoods += (item.purchaseRate * item.netWeight);
    });

    const summary: MonthlyProfitInfoType[] = Object.entries(monthlyAgg)
      .map(([key, value]) => ({
        monthKey: key, // "yyyy-MM"
        monthYear: format(parseISO(key + "-01"), "MMMM yyyy"),
        totalProfit: value.totalProfit,
        totalSalesValue: value.totalSalesValue,
        totalCostOfGoods: value.totalCostOfGoods,
      }))
      .sort((a, b) => {
        return parseISO(b.monthKey + "-01").getTime() - parseISO(a.monthKey + "-01").getTime();
      });
    
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
                <div className="overflow-x-auto max-h-[400px] rounded-md border">
                    <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/80 z-10">
                        <tr>
                        <th className="p-2 border text-left">Date</th>
                        <th className="p-2 border text-left">Bill No.</th>
                        <th className="p-2 border text-left">Vakkal</th>
                        <th className="p-2 border text-left">Supplier</th>
                        <th className="p-2 border text-left">Agent</th>
                        <th className="p-2 border text-left">Customer</th>
                        <th className="p-2 border text-left">Broker</th>
                        <th className="p-2 border text-right">Purchase Rate (₹/kg)</th>
                        <th className="p-2 border text-right">Sale Rate (₹/kg)</th>
                        <th className="p-2 border text-right">Qty (kg)</th>
                        <th className="p-2 border text-right">Profit (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProfitTransactions.map((row, i) => (
                        <tr key={`${row.date}-${row.lotNumber}-${row.billNumber || i}`} className="border-b hover:bg-muted/30">
                            <td className="p-2 border">{format(parseISO(row.date), "dd-MM-yy")}</td>
                            <td className="p-2 border">{row.billNumber || 'N/A'}</td>
                            <td className="p-2 border">{row.lotNumber}</td>
                            <td className="p-2 border truncate max-w-[100px]">{row.supplierName}</td>
                            <td className="p-2 border truncate max-w-[80px]">{row.agentName}</td>
                            <td className="p-2 border truncate max-w-[100px]">{row.customerName}</td>
                            <td className="p-2 border truncate max-w-[80px]">{row.brokerName}</td>
                            <td className="p-2 border text-right">{row.purchaseRate?.toFixed(2) || 'N/A'}</td>
                            <td className="p-2 border text-right">{row.saleRate.toFixed(2)}</td>
                            <td className="p-2 border text-right">{row.netWeight.toLocaleString()} kg</td>
                            <td className={`p-2 border text-right font-medium ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {row.profit.toFixed(2)}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </div>

          {monthlyProfitsDataForSelectedPeriod.length > 0 && (
            <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Month-wise Profit Summary</h3>
                <div className="overflow-x-auto max-h-[300px] rounded-md border">
                    <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-muted/80 z-10">
                        <tr>
                        <th className="p-2 border text-left">Month</th>
                        <th className="p-2 border text-right">Total Profit (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthlyProfitsDataForSelectedPeriod.map((monthData) => (
                        <tr key={monthData.monthKey} className="border-b hover:bg-muted/30">
                            <td className="p-2 border">{monthData.monthYear}</td>
                            <td className={`p-2 border text-right font-medium ${monthData.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {monthData.totalProfit.toFixed(2)}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
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
