
// src/components/dashboard/ProfitSummary.tsx

import React from "react";
import type { Sale, Purchase } from "@/lib/types"; // Assuming these types are correctly defined
import { format, parseISO, startOfMonth } from 'date-fns';

interface ProfitSummaryProps {
  sales: Sale[];
  purchases: Purchase[];
}

interface MonthlyProfit {
  monthYear: string; // "MMMM yyyy"
  totalProfit: number;
}

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales, purchases }) => {
  
  const getPurchaseDetails = (lotNumber: string = ""): { rate: number; supplierName?: string; agentName?: string } => {
    const purchase = purchases.find(p =>
      p.lotNumber?.toLowerCase().trim() === lotNumber.toLowerCase().trim()
    );
    if (!purchase) {
      // console.warn(`⚠️ No purchase found for lot: "${lotNumber}" in ProfitSummary`);
      return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
    }
    return {
      rate: purchase.rate ?? 0,
      supplierName: purchase.supplierName || 'N/A',
      agentName: purchase.agentName || 'N/A',
    };
  };

  const profitSummaryData = sales.map((sale) => {
    const { rate: purchaseRate, supplierName, agentName } = getPurchaseDetails(sale.lotNumber);
    
    const profit = sale.calculatedProfit !== undefined 
      ? sale.calculatedProfit 
      : (sale.rate - purchaseRate) * sale.netWeight - (sale.transportCost || 0) - (sale.brokerageAmount || 0);

    return {
      date: sale.date,
      lotNumber: sale.lotNumber,
      supplierName: supplierName,
      agentName: agentName,
      customerName: sale.customerName || 'N/A',
      brokerName: sale.brokerName || 'N/A',
      purchaseRate: purchaseRate,
      saleRate: sale.rate,
      netWeight: sale.netWeight,
      profit: profit,
    };
  });

  const totalProfit = profitSummaryData.reduce((acc, item) => acc + (item.profit || 0), 0);

  const monthlyProfitsData = React.useMemo(() => {
    const monthlyAgg: Record<string, number> = {}; // Key: "yyyy-MM"

    profitSummaryData.forEach(item => {
      const monthKey = format(startOfMonth(parseISO(item.date)), "yyyy-MM");
      if (!monthlyAgg[monthKey]) {
        monthlyAgg[monthKey] = 0;
      }
      monthlyAgg[monthKey] += item.profit || 0;
    });

    return Object.entries(monthlyAgg)
      .map(([key, profit]) => ({
        monthYear: format(parseISO(key + "-01"), "MMMM yyyy"),
        totalProfit: profit,
      }))
      .sort((a, b) => {
        // Sort by date, most recent month first
        const dateA = parseISO(a.monthYear.split(" ")[1] + "-" + (new Date(Date.parse(a.monthYear.split(" ")[0] +" 1, 2000")).getMonth()+1).toString().padStart(2, '0') + "-01");
        const dateB = parseISO(b.monthYear.split(" ")[1] + "-" + (new Date(Date.parse(b.monthYear.split(" ")[0] +" 1, 2000")).getMonth()+1).toString().padStart(2, '0') + "-01");
        return dateB.getTime() - dateA.getTime();
      });
  }, [profitSummaryData]);


  return (
    <div className="bg-card text-card-foreground rounded-xl p-4 shadow-md mt-4 border space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-3 text-primary">Transaction-wise Profit & Loss</h2>
        {profitSummaryData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No sales data to analyze for profit in the selected period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 border text-left">Date</th>
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
                {profitSummaryData.map((row, i) => (
                  <tr key={`${row.date}-${row.lotNumber}-${i}`} className="border-b hover:bg-muted/30">
                    <td className="p-2 border">{format(parseISO(row.date), "dd-MM-yy")}</td>
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
              <tfoot>
                <tr className="bg-muted font-semibold">
                  <td className="p-2 border text-right" colSpan={9}>Total Net Profit/Loss:</td>
                  <td className={`p-2 border text-right ${totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {totalProfit.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-primary">Month-wise Profit Summary</h2>
        {monthlyProfitsData.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No monthly profit data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 border text-left">Month</th>
                  <th className="p-2 border text-right">Total Profit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyProfitsData.map((monthData) => (
                  <tr key={monthData.monthYear} className="border-b hover:bg-muted/30">
                    <td className="p-2 border">{monthData.monthYear}</td>
                    <td className={`p-2 border text-right font-medium ${monthData.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {monthData.totalProfit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

