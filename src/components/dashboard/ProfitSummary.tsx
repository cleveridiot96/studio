
// src/components/dashboard/ProfitSummary.tsx

import React from "react";
import type { Sale, Purchase } from "@/lib/types"; // Assuming these types are correctly defined
import { format, parseISO } from 'date-fns';

interface ProfitSummaryProps {
  sales: Sale[];
  purchases: Purchase[];
}

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales, purchases }) => {
  // Debug: Log the sales and purchases data received
  // console.log("🔥 SALES data received in ProfitSummary:", sales);
  // console.log("🔥 PURCHASES data received in ProfitSummary:", purchases);

  const getPurchaseDetails = (lotNumber: string = ""): { rate: number; supplierName?: string; agentName?: string } => {
    const purchase = purchases.find(p =>
      p.lotNumber?.toLowerCase().trim() === lotNumber.toLowerCase().trim()
    );
    if (!purchase) {
      // console.warn(`⚠️ No purchase found for lot: "${lotNumber}" in ProfitSummary`);
      return { rate: 0, supplierName: 'N/A', agentName: 'N/A' };
    }
    // console.log(`✅ Matched purchase for ${lotNumber} in ProfitSummary: Rate ₹${purchase.rate}, Supplier ${purchase.supplierName}`);
    return {
      rate: purchase.rate ?? 0,
      supplierName: purchase.supplierName || 'N/A',
      agentName: purchase.agentName || 'N/A',
    };
  };

  const profitSummaryData = sales.map((sale) => {
    const { rate: purchaseRate, supplierName, agentName } = getPurchaseDetails(sale.lotNumber);
    
    // Use the calculatedProfit from the Sale object if available, otherwise calculate.
    // The sale.calculatedProfit should ideally be the single source of truth for profit.
    // For this display, we'll prioritize it. If it's not there, we'll do a basic calculation.
    const profit = sale.calculatedProfit !== undefined 
      ? sale.calculatedProfit 
      : (sale.rate - purchaseRate) * sale.netWeight - (sale.transportCost || 0) - (sale.brokerageAmount || 0);


    // console.log("📦 Sale in ProfitSummary:", sale);
    // console.log("🎯 Purchase Rate for profit calc:", purchaseRate);
    // console.log("💰 Calculated Profit for display:", profit);

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

  return (
    <div className="bg-card text-card-foreground rounded-xl p-4 shadow-md mt-4 border">
      <h2 className="text-lg font-semibold mb-3 text-primary">Profit & Loss Statement</h2>

      {profitSummaryData.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No sales data to analyze for profit in the selected period.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
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
                <td className="p-2 border">{row.supplierName}</td>
                <td className="p-2 border">{row.agentName}</td>
                <td className="p-2 border">{row.customerName}</td>
                <td className="p-2 border">{row.brokerName}</td>
                <td className="p-2 border text-right">{row.purchaseRate.toFixed(2)}</td>
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
              <td className="p-2 border text-right" colSpan={9}>Total Profit/Loss:</td>
              <td className={`p-2 border text-right ${totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                {totalProfit.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};
