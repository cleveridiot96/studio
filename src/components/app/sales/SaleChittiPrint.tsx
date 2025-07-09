
"use client";

import type { Sale } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface SaleChittiPrintProps {
  sale: Sale;
}

export const SaleChittiPrint: React.FC<SaleChittiPrintProps> = ({ sale }) => {
  if (!sale) return null;
  
  const cashDiscount = (sale.expenses || []).find(e => e.account === 'Cash Discount')?.amount || 0;
  const totalSaleSideExpenses = (sale.expenses || []).filter(e => e.account !== 'Cash Discount').reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-4 bg-white text-black w-[550px] text-sm print-chitti-styles uppercase">
      <style jsx global>{`
        .print-chitti-styles { font-family: sans-serif; line-height: 1.4; }
        .print-chitti-styles h1, .print-chitti-styles h2 { margin-top: 0.5em; margin-bottom: 0.25em; }
        .print-chitti-styles table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
        .print-chitti-styles th, .print-chitti-styles td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        .print-chitti-styles th { background-color: #f0f0f0; }
        .print-chitti-styles .text-right { text-align: right; }
        .print-chitti-styles .font-bold { font-weight: bold; }
        .print-chitti-styles .mt-4 { margin-top: 16px; }
        .print-chitti-styles .mb-2 { margin-bottom: 8px; }
        .print-chitti-styles .flex-between { display: flex; justify-content: space-between; }
        .print-chitti-styles .text-destructive { color: #a12121; }
        .print-chitti-styles .text-green-700 { color: #1d6c4c; }
        .print-chitti-styles .text-red-700 { color: #a12121; }
      `}</style>

      <div className="text-center mb-4">
        <PrintHeaderSymbol className="text-lg" />
        <h1 className="text-xl font-bold mt-1">SALE VOUCHER</h1>
      </div>

      <div className="flex-between mb-2">
        <span>DATE: <strong>{format(parseISO(sale.date), "dd/MM/yy")}</strong></span>
        <span>BILL NO: <strong>{sale.billNumber || sale.id.slice(-6).toUpperCase()}</strong></span>
      </div>
      
      <div className="mb-2">
        CUSTOMER: <strong>{sale.customerName || sale.customerId}</strong>
      </div>
      
      {sale.brokerName && (
        <div className="mb-2">
          BROKER: <strong>{sale.brokerName}</strong>
        </div>
      )}
      
      {sale.items && sale.items.length > 0 && (
        <table className="text-xs">
          <thead>
            <tr>
              <th>VAKKAL / LOT NO.</th>
              <th className="text-right">BAGS</th>
              <th className="text-right">NET WT (KG)</th>
              <th className="text-right">RATE (₹/KG)</th>
              <th className="text-right">GOODS VALUE (₹)</th>
              <th className="text-right">PROFIT (₹)</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
               <tr key={index}>
                <td>{item.lotNumber}</td>
                <td className="text-right">{Math.round(item.quantity).toLocaleString()}</td>
                <td className="text-right">{item.netWeight.toLocaleString()}</td>
                <td className="text-right">{Math.round(item.rate || 0)}</td>
                <td className="text-right">{Math.round(item.goodsValue || 0).toLocaleString()}</td>
                <td className={`text-right font-medium ${Math.round(item.itemNetProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {Math.round(item.itemNetProfit || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
              <tr className="font-bold">
                  <td colSpan={4}>TOTAL GOODS VALUE</td>
                  <td className="text-right">{Math.round(sale.totalGoodsValue || 0).toLocaleString()}</td>
                  <td className={`text-right font-bold ${Math.round(sale.totalCalculatedProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {Math.round(sale.totalCalculatedProfit || 0).toLocaleString()}
                  </td>
              </tr>
          </tfoot>
        </table>
      )}

      <div className="mt-4 space-y-1">
        {cashDiscount > 0 && (
          <div className="flex-between text-destructive">
            <span>LESS: CASH DISCOUNT:</span>
            <span className="font-bold">(-) ₹{Math.round(cashDiscount).toLocaleString()}</span>
          </div>
        )}
         <div className="flex-between border-t pt-2 mt-2">
          <span className="font-bold text-base">NET AMOUNT PAYABLE:</span>
          <span className="font-bold text-base">₹{Math.round(sale.billedAmount || 0).toLocaleString()}</span>
        </div>
      </div>
      
      <div className="mt-4 pt-2 border-t-2 border-dashed border-gray-400">
        <h3 className="font-bold text-center text-xs mb-2">PROFIT & LOSS (INTERNAL)</h3>
        <table className="text-xs">
           <tbody>
              <tr>
                <td>TOTAL GOODS VALUE</td>
                <td className="text-right font-bold">₹{Math.round(sale.totalGoodsValue || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td>LESS: TOTAL COST OF GOODS</td>
                <td className="text-right text-destructive">(-) ₹{Math.round(sale.totalCostOfGoodsSold || 0).toLocaleString()}</td>
              </tr>
              <tr className="font-bold border-t">
                <td>GROSS PROFIT</td>
                <td className="text-right">₹{Math.round(sale.totalGrossProfit || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td>LESS: SALE EXPENSES</td>
                <td className="text-right text-destructive">(-) ₹{Math.round(totalSaleSideExpenses).toLocaleString()}</td>
              </tr>
              <tr className="font-bold border-t-2 border-black text-base">
                <td>NET PROFIT</td>
                <td className={`text-right ${Math.round(sale.totalCalculatedProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ₹{Math.round(sale.totalCalculatedProfit || 0).toLocaleString()}
                </td>
              </tr>
           </tbody>
        </table>
      </div>

      {sale.notes && (
        <div className="mt-4 text-xs">
          NOTES: <strong>{sale.notes}</strong>
        </div>
      )}
      
      <div className="mt-8 pt-8 flex-between text-xs">
        <div>
          <p>RECEIVER'S SIGNATURE</p>
          <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
        <div>
          <p>FOR STOCK MARKET TRACKER</p>
           <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
      </div>
    </div>
  );
};
