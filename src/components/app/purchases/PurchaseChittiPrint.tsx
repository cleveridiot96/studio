
"use client";

import type { Purchase } from "@/lib/types";
import { format } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface PurchaseChittiPrintProps {
  purchase: Purchase;
}

// This component is designed to be captured by html2canvas.
// It should be styled to approximate an A5 layout.
// Tailwind classes for an A5-ish size: w-[148mm] h-[210mm] (approx. 558px x 793px at 96dpi)
// For direct printing, @page CSS is better. For html2canvas, inline styles or specific pixel widths might be needed.
// Let's aim for a content block that's roughly A5 proportioned.
// Actual A5: 148mm x 210mm. At 96 DPI, this is 559px x 794px.

export const PurchaseChittiPrint: React.FC<PurchaseChittiPrintProps> = ({ purchase }) => {
  if (!purchase) return null;

  const assumedBagWeightKg = 50;
  const grossWeightKg = purchase.quantity * assumedBagWeightKg;
  const transportCost = (purchase.transportRatePerKg || 0) * grossWeightKg;

  return (
    <div className="p-4 bg-white text-black w-[550px] text-sm print-chitti-styles">
      {/* Printable styles specific to this chitti can be defined in globals.css under .print-chitti-styles */}
      <style jsx global>{`
        .print-chitti-styles {
          font-family: sans-serif;
          line-height: 1.4;
        }
        .print-chitti-styles h1, .print-chitti-styles h2, .print-chitti-styles h3 {
          margin-top: 0.5em;
          margin-bottom: 0.25em;
        }
        .print-chitti-styles table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .print-chitti-styles th, .print-chitti-styles td {
          border: 1px solid #ccc;
          padding: 4px 6px;
          text-align: left;
        }
        .print-chitti-styles th {
          background-color: #f0f0f0;
        }
        .print-chitti-styles .text-right {
          text-align: right;
        }
        .print-chitti-styles .font-bold {
          font-weight: bold;
        }
        .print-chitti-styles .mt-4 {
          margin-top: 16px;
        }
         .print-chitti-styles .mb-2 {
          margin-bottom: 8px;
        }
        .print-chitti-styles .flex-between {
            display: flex;
            justify-content: space-between;
        }
      `}</style>

      <div className="text-center mb-4">
        <PrintHeaderSymbol className="text-lg" />
        <h1 className="text-xl font-bold mt-1">Purchase Voucher</h1>
      </div>

      <div className="flex-between mb-2">
        <span>Date: <strong>{format(new Date(purchase.date), "dd-MM-yyyy")}</strong></span>
        <span>Voucher No: <strong>{purchase.id.slice(-6).toUpperCase()}</strong></span>
      </div>
      
      <div className="mb-2">
        Supplier: <strong>{purchase.supplierName || purchase.supplierId}</strong>
      </div>
      
      {purchase.agentName && (
        <div className="mb-2">
          Agent: <strong>{purchase.agentName}</strong>
        </div>
      )}

      <div className="mb-2">
        Location: <strong>{purchase.locationName || purchase.locationId}</strong>
      </div>

      <div className="mb-4">
        Vakkal / Lot No: <strong>{purchase.lotNumber}</strong>
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
            <td>Goods Purchased</td>
            <td className="text-right">{purchase.quantity}</td>
            <td className="text-right">{purchase.netWeight.toLocaleString()}</td>
            <td className="text-right">{purchase.rate.toFixed(2)}</td>
            <td className="text-right">{(purchase.netWeight * purchase.rate).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 space-y-1">
        {purchase.expenses && purchase.expenses > 0 && (
          <div className="flex-between">
            <span>Other Expenses:</span>
            <span className="font-bold">₹{purchase.expenses.toFixed(2)}</span>
          </div>
        )}
        {transportCost > 0 && (
           <div className="flex-between">
            <span>Transport Charges (Rate: ₹{purchase.transportRatePerKg?.toFixed(2)}/kg on {grossWeightKg}kg):</span>
            <span className="font-bold">₹{transportCost.toFixed(2)}</span>
          </div>
        )}
         <div className="flex-between border-t pt-2 mt-2">
          <span className="font-bold text-base">Total Amount:</span>
          <span className="font-bold text-base">₹{purchase.totalAmount.toFixed(2)}</span>
        </div>
        {purchase.effectiveRate && purchase.effectiveRate > 0 && (
            <div className="flex-between text-xs">
                <span>Effective Rate:</span>
                <span>₹{purchase.effectiveRate.toFixed(2)} / kg</span>
            </div>
        )}
      </div>


      {purchase.transporterName && (
        <div className="mt-4 text-xs">
          Transporter: <strong>{purchase.transporterName}</strong>
        </div>
      )}
      
      <div className="mt-8 pt-8 flex-between text-xs">
        <div>
          <p>Receiver's Signature</p>
          <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
        <div>
          <p>Authorised Signatory</p>
           <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
      </div>
    </div>
  );
};
