
// src/components/dashboard/ProfitSummary.tsx

import React from "react";

interface ProfitRow {
  date: string;
  purchaseRate: number;
  saleRate: number;
  netWeight: number;
  profit: number;
}

interface Sale {
  lotNumber: string;
  date: string;
  rate: number;
  netWeight: number;
  // Add other sale properties if they exist
}

interface Purchase {
  lotNumber: string;
  date: string;
  rate: number;
  netWeight: number;
  // Add other purchase properties if they exist
}

interface ProfitSummaryProps {
  sales: Sale[];
  purchases: Purchase[];
}

export const ProfitSummary: React.FC<ProfitSummaryProps> = ({ sales, purchases }) => {
  // Debug: Log the sales and purchases data received
  console.log("🔥 SALES data received:", sales);
  console.log("🔥 PURCHASES data received:", purchases);

  const getPurchaseRate = (lotNumber: string = ""): number => {
    const purchase = purchases.find(p =>
      p.lotNumber?.toLowerCase().trim() === lotNumber.toLowerCase().trim()
    );
    if (!purchase) {
      console.warn(`⚠️ No purchase found for lot: "${lotNumber}"`);
      return 0;
    }
    console.log(`✅ Matched purchase for ${lotNumber}: ₹${purchase.rate}`);
    return purchase.rate ?? 0;
  };

  const profitSummary = sales.map((sale) => {
    const purchaseRate = getPurchaseRate(sale.lotNumber);
    const profit = (sale.rate - purchaseRate) * sale.netWeight;

    // Debug: Log details for each sale calculation
    console.log("📦 Sale:", sale);
    console.log("🎯 Purchase Rate:", purchaseRate);
    console.log("💰 Profit:", profit);

    return {
      ...sale,
      purchaseRate, // Include purchase rate for display
      profit,
    };
  });

  const totalProfit = profitSummary.reduce((acc, item) => acc + item.profit, 0);

  return (
    <div className="bg-white rounded-xl p-4 shadow-md mt-4">
      <h2 className="text-lg font-semibold mb-2">Profit & Loss Statement</h2>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Date</th>
            <th className="p-2">Purchase</th>
            <th className="p-2">Sale</th>
            <th className="p-2">Qty (kg)</th>
            <th className="p-2">Profit</th>
          </tr>
        </thead>
        <tbody>
          {profitSummary.map((row, i) => (
            <tr key={i}>
              <td className="p-2">{row.date}</td>
              <td className="p-2">₹{row.purchaseRate}</td>
              <td className="p-2">₹{row.rate}</td>
              <td className="p-2">{row.netWeight} kg</td>
              <td className={`p-2 font-medium ${row.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{row.profit.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold">
            <td className="p-2" colSpan={4}>Total Profit/Loss:</td>
            <td className={`p-2 ${totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
              ₹{totalProfit.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
