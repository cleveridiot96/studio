
"use client";

import type { Sale } from "@/lib/types";
import { format } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface SaleChittiPrintProps {
  sale: Sale;
}

export const SaleChittiPrint: React.FC<SaleChittiPrintProps> = ({ sale }) => {
  if (!sale) return null;

  const calculatedSaleValue = sale.netWeight * sale.rate;

  return (
    <div className="p-4 bg-white text-black w-[550px] text-sm print-chitti-styles">
      <style jsx global>{`
        .print-chitti-styles { font-family: sans-serif; line-height: 1.4; }
        .print-chitti-styles h1, .print-chitti-styles h2, .print-chitti-styles h3 { margin-top: 0.5em; margin-bottom: 0.25em; }
        .print-chitti-styles table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
        .print-chitti-styles th, .print-chitti-styles td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        .print-chitti-styles th { background-color: #f0f0f0; }
        .print-chitti-styles .text-right { text-align: right; }
        .print-chitti-styles .font-bold { font-weight: bold; }
        .print-chitti-styles .mt-4 { margin-top: 16px; }
        .print-chitti-styles .mb-2 { margin-bottom: 8px; }
        .print-chitti-styles .flex-between { display: flex; justify-content: space-between; }
      `}</style>

      <div className="text-center mb-4">
        <PrintHeaderSymbol className="text-lg" />
        <h1 className="text-xl font-bold mt-1">Sale Voucher</h1>
      </div>

      <div className="flex-between mb-2">
        <span>Date: <strong>{format(new Date(sale.date), "dd-MM-yyyy")}</strong></span>
        <span>Bill No: <strong>{sale.billNumber || sale.id.slice(-6).toUpperCase()}</strong></span>
      </div>
      
      <div className="mb-2">
        Customer: <strong>{sale.customerName || sale.customerId}</strong>
      </div>
      
      {sale.brokerName && (
        <div className="mb-2">
          Broker: <strong>{sale.brokerName}</strong>
        </div>
      )}

      <div className="mb-4">
        Vakkal / Lot No: <strong>{sale.lotNumber}</strong>
      </div>
      
      <table className="text-xs">
        <thead>
          <tr>
            <th>Description</th>
            <th className="text-right">Bags</th>
            <th className="text-right">Net Wt (kg)</th>
            <th className="text-right">Rate (₹/kg)</th>
            <th className="text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Goods Sold</td>
            <td className="text-right">{sale.quantity}</td>
            <td className="text-right">{sale.netWeight.toLocaleString()}</td>
            <td className="text-right">{sale.rate.toFixed(2)}</td>
            <td className="text-right">{calculatedSaleValue.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 space-y-1">
        {sale.cutBill && sale.manualBillAmount !== undefined && sale.manualBillAmount !== calculatedSaleValue && (
          <div className="flex-between">
            <span>Original Sale Value:</span>
            <span className="font-bold">₹{calculatedSaleValue.toFixed(2)}</span>
          </div>
        )}
        {sale.transportCost && sale.transportCost > 0 && (
           <div className="flex-between">
            <span>Transport Charges:</span>
            <span className="font-bold">₹{sale.transportCost.toFixed(2)}</span>
          </div>
        )}
         {sale.calculatedBrokerageCommission && sale.calculatedBrokerageCommission > 0 && (
           <div className="flex-between">
            <span>Brokerage:</span>
            <span className="font-bold">₹{sale.calculatedBrokerageCommission.toFixed(2)}</span>
          </div>
        )}
         <div className="flex-between border-t pt-2 mt-2">
          <span className="font-bold text-base">Total Amount Due:</span>
          <span className="font-bold text-base">₹{sale.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {sale.notes && (
        <div className="mt-4 text-xs">
          Notes: <strong>{sale.notes}</strong>
        </div>
      )}
      
      <div className="mt-8 pt-8 flex-between text-xs">
        <div>
          <p>Receiver's Signature</p>
          <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
        <div>
          <p>For Kisan Khata Sahayak</p>
           <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
      </div>
    </div>
  );
};
