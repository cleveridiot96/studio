
"use client";

import type { Purchase } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface PurchaseChittiPrintProps {
  purchase: Purchase;
}

export const PurchaseChittiPrint: React.FC<PurchaseChittiPrintProps> = ({ purchase }) => {
  if (!purchase) return null;

  const itemValue = (purchase.netWeight || 0) * (purchase.rate || 0);
  // Ensure totalAmount is used directly if available, otherwise calculate.
  // The purchase.totalAmount should already include expenses and transportRate.
  const grandTotal = purchase.totalAmount;

  return (
    // Aiming for A7: 74mm x 105mm. At 96 DPI, approx 279px width.
    // Using w-[270px] for html2canvas capture target.
    <div className="p-2 bg-white text-black w-[270px] text-[10px] leading-tight print-chitti-styles">
      <style jsx global>{`
        .print-chitti-styles { font-family: Arial, sans-serif; }
        .print-chitti-styles hr { border-top: 0.5px solid #888; margin: 2px 0; }
        .print-chitti-styles .flex-between { display: flex; justify-content: space-between; }
        .print-chitti-styles .font-bold { font-weight: bold; }
        .print-chitti-styles .text-right { text-align: right; }
        .print-chitti-styles .w-half { width: 50%; }
        .print-chitti-styles .mb-1 { margin-bottom: 0.125rem; } /* 2px */
        .print-chitti-styles .mb-0_5 { margin-bottom: 0.0625rem; } /* 1px */
        .print-chitti-styles .mt-1 { margin-top: 0.125rem; }
        .print-chitti-styles .py-0_5 { padding-top: 0.0625rem; padding-bottom: 0.0625rem; }
        .print-chitti-styles .underline-val { border-bottom: 0.5px solid black; padding-bottom: 1px;}
      `}</style>

      <div className="text-center mb-1">
        <PrintHeaderSymbol className="text-xs" />
      </div>

      <div className="flex-between mb-1">
        <div className="font-bold text-xs">Vakkal: {purchase.lotNumber}</div>
        <div className="text-xs">Date: {format(parseISO(purchase.date), "dd/MM/yy")}</div>
      </div>
      <hr />

      <div className="flex-between py-0_5">
        <span className="w-1/2">Vakkal:</span>
        <span className="w-1/2 font-bold">{purchase.lotNumber}</span>
      </div>
      <div className="flex-between py-0_5">
        <span className="w-1/2">Location:</span>
        <span className="w-1/2 font-bold">{purchase.locationName || purchase.locationId}</span>
      </div>
      <hr />

      <div className="flex-between py-0_5">
        <span className="w-1/2">Net Weight (kg):</span>
        <span className="w-1/2 font-bold text-right">{purchase.netWeight.toLocaleString()}</span>
      </div>
      <div className="flex-between py-0_5 mb-1">
        <span className="w-1/2">Rate (₹/kg):</span>
        <span className="w-1/2 font-bold text-right">{purchase.rate.toFixed(2)}</span>
      </div>
      <hr />
      <div className="flex-between py-0_5 mb-1">
        <span className="w-1/2">Amount:</span>
        <span className="w-1/2 font-bold text-right">{itemValue.toFixed(2)}</span>
      </div>

      {purchase.transporterName && (
        <div className="flex-between text-xs py-0_5">
            <span>Transporter:</span>
            <span className="font-bold">{purchase.transporterName}</span>
        </div>
      )}
      
      <div className="flex-between py-0_5">
        <span className="w-3/4">Other Expens:</span>
        <span className="w-1/4 font-bold text-right">{(purchase.expenses || 0).toFixed(2)}</span>
      </div>
      <div className="flex-between py-0_5">
        <span className="w-3/4">Transport Ch:</span>
        <span className="w-1/4 font-bold text-right">{(purchase.transportRate || 0).toFixed(2)}</span>
      </div>
      <hr className="border-black my-1"/>
      <div className="flex-between font-bold text-xs mt-1">
        <span className="w-1/2">TOTAL:</span>
        <span className="w-1/2 text-right underline-val">₹{grandTotal.toFixed(2)}</span>
      </div>

       {purchase.supplierName && (
        <div className="mt-2 text-xs">
          Supplier: <strong>{purchase.supplierName}</strong>
        </div>
      )}
      {purchase.agentName && (
        <div className="mt-1 text-xs">
          Agent: <strong>{purchase.agentName}</strong>
        </div>
      )}

      <div className="mt-3 pt-3 flex-between text-[8px]">
        <div>
          <p className="mb-2">Receiver's Sign</p>
          <p className="border-t border-gray-400 pt-0_5">_________________</p>
        </div>
        <div>
          <p className="mb-2">Authorised Sign</p>
           <p className="border-t border-gray-400 pt-0_5">_________________</p>
        </div>
      </div>
    </div>
  );
};
