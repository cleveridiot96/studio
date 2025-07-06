
"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { Sale, Purchase, MonthlyProfitInfo, LocationTransfer } from "@/lib/types";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/contexts/SettingsContext"; // To get the global financial year
import { isDateInFinancialYear } from "@/lib/utils"; // Utility to check if a date is in FY
import { DollarSign } from "lucide-react";

interface ProfitSummaryProps {
  sales: Sale[];
  purchases: Purchase[];
  locationTransfers: LocationTransfer[];
}

const getPurchaseDetailsForSaleLot = (
  lotNumberFromSale: string | undefined | null,
  purchases: Purchase[],
  locationTransfers: LocationTransfer[]
): { rate: number; supplierName?: string; agentName?: string; effectiveRate: number } => {
  const searchLot = String(lotNumberFromSale || "").toLowerCase().trim();
  if (!searchLot) {
    return { rate: 0, supplierName: 'N/A', agentName: 'N/A', effectiveRate: 0 };
  }

  // First, try a direct match for non-transferred lots.
  const directMatchPurchase = purchases.find(p => String(p.lotNumber || "").toLowerCase().trim() === searchLot);
  if (directMatchPurchase) {
    return {
      rate: directMatchPurchase.rate ?? 0,
      effectiveRate: directMatchPurchase.effectiveRate ?? 0,
      supplierName: directMatchPurchase.supplierName || directMatchPurchase.supplierId || 'N/A',
      agentName: directMatchPurchase.agentName || directMatchPurchase.agentId || 'N/A',
    };
  }

  // If no direct match, it might be a transferred lot. Trace it back.
  let originalLotNumber: string | null = null;
  for (let i = locationTransfers.length - 1; i >= 0; i--) {
    const transfer = locationTransfers[i];
    for (const item of transfer.items) {
      if (String(item.newLotNumber || "").toLowerCase().trim() === searchLot) {
        originalLotNumber = item.originalLotNumber;
        break;
      }
    }
    if (originalLotNumber) break;
  }
  
  if (!originalLotNumber) {
    return { rate: 0, supplierName: 'N/A', agentName: 'N/A', effectiveRate: 0 };
  }
  
  const searchOriginalLot = String(originalLotNumber).toLowerCase().trim();
  const originalPurchase = purchases.find(p => String(p.lotNumber || "").toLowerCase().trim() === searchOriginalLot);

  if (!originalPurchase) {
    return { rate: 0, supplierName: 'N/A', agentName: 'N/A', effectiveRate: 0 };
  }

  return {
    rate: originalPurchase.rate ?? 0,
    effectiveRate: originalPurchase.effectiveRate ?? 0,
    supplierName: originalPurchase.supplierName || originalPurchase.supplierId || 'N/A',
    agentName: originalPurchase.agentName || originalPurchase.agentId || 'N/A',
  };
};


export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales: allSalesData, purchases, locationTransfers }) => {
  const { financialYear: currentFinancialYearString, isAppHydrating } = useSettings();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const getFinancialYearDateRange = (fyString: string): { start: Date; end: Date } | null => {
    const [startYearStr] = fyString.split('-');
    const startYear = parseInt(startYearStr, 10);
    if (isNaN(startYear)) return null;
    return {
      start: new Date(startYear, 3, 1), // April 1st
      end: endOfMonth(new Date(startYear + 1, 2, 1)), // March 31st
    };
  };

  const salesForCurrentFY = useMemo(() => {
    if (!hydrated || isAppHydrating || !allSalesData) return [];
    return allSalesData.filter(sale => sale?.date && isDateInFinancialYear(sale.date, currentFinancialYearString));
  }, [allSalesData, currentFinancialYearString, hydrated, isAppHydrating]);

  const allProfitTransactions = useMemo(() => {
    if (!salesForCurrentFY || !purchases || !locationTransfers) return [];

    return salesForCurrentFY.map((sale) => {
      const purchaseDetails = getPurchaseDetailsForSaleLot(sale.lotNumber, purchases, locationTransfers);
      
      const netPurchaseRate = sale.costOfGoodsSold && sale.netWeight > 0 ? sale.costOfGoodsSold / sale.netWeight : purchaseDetails.effectiveRate;
      const netSaleRate = sale.billedAmount && sale.netWeight > 0 ? sale.billedAmount / sale.netWeight : sale.rate;
      const grossProfit = sale.goodsValue - (sale.costOfGoodsSold || 0);

      return {
        ...sale,
        profit: sale.calculatedProfit || 0,
        purchaseRate: purchaseDetails.rate,
        supplierName: purchaseDetails.supplierName,
        agentName: purchaseDetails.agentName,
        netPurchaseRate,
        netSaleRate,
        grossProfit,
      };
    });
  }, [salesForCurrentFY, purchases, locationTransfers]);

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
    return Array.from(new Map(options.map(item => [item.value, item])).values())
      .sort((a,b) => {
          if (a.value === "all") return -1;
          if (b.value === "all") return 1;
          return b.value.localeCompare(a.value);
      });
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
    const monthlyAgg: Record<string, MonthlyProfitInfo> = {};
    
    filteredProfitTransactions.forEach(item => {
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
          monthlyAgg[monthKey].totalSalesValue += item.goodsValue;
          monthlyAgg[monthKey].totalCostOfGoods += (item.costOfGoodsSold || 0);
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

  if (!hydrated || isAppHydrating) {
    return <Card className="shadow-lg border-primary/30 mt-6"><CardHeader><CardTitle>Loading Profit Data...</CardTitle></CardHeader><CardContent><p>Please wait...</p></CardContent></Card>;
  }
  
  return (
    <Card className="shadow-lg border-primary/30 mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl text-primary flex items-center">
            <DollarSign className="mr-2 h-6 w-6"/> Profit & Loss (FY: {currentFinancialYearString})
          </CardTitle>
          <MasterDataCombobox
            value={selectedMonth}
            onChange={(value) => setSelectedMonth(value || "all")}
            options={monthOptions}
            placeholder="Select Period"
            searchPlaceholder="Search periods..."
            className="w-full sm:w-[220px]"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Transaction-wise Profit & Loss</h3>
          {filteredProfitTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sales data for profit in the selected period.</p>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border">
              <Table size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vakkal</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Net Purch. Rate</TableHead>
                    <TableHead className="text-right">Net Sale Rate</TableHead>
                    <TableHead className="text-right">Gross Profit (₹)</TableHead>
                    <TableHead className="text-right">Net Profit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfitTransactions.map((row, i) => (
                    <TableRow key={`${row.id}-${i}`}>
                      <TableCell>{row.date ? format(parseISO(row.date), "dd-MM-yy") : 'N/A'}</TableCell>
                      <TableCell>{row.lotNumber || "N/A"}</TableCell>
                      <TableCell className="truncate max-w-[120px]">{row.customerName || row.customerId}</TableCell>
                      <TableCell className="text-right">{(row.netPurchaseRate || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{(row.netSaleRate || 0).toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-medium ${(row.grossProfit || 0) >= 0 ? "text-cyan-600" : "text-orange-600"}`}>
                        {(row.grossProfit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${(row.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
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
            <ScrollArea className="h-auto max-h-[200px] rounded-md border">
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
          <span className={`ml-4 ${(totalProfitForSelectedPeriod || 0) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          ₹{(totalProfitForSelectedPeriod || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};
