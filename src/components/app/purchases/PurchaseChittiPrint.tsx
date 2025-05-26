
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
  const grandTotal = purchase.totalAmount; // This should already include expenses and transport

  return (
    // Aiming for A5: 148mm x 210mm.
    // Using w-[550px] for html2canvas capture target to ensure good resolution for A5.
    <div className="p-4 bg-white text-black w-[550px] text-sm print-chitti-styles">
      <style jsx global>{`
        .print-chitti-styles { font-family: Arial, sans-serif; line-height: 1.4; }
        .print-chitti-styles hr { border-top: 1px solid #888; margin: 4px 0; }
        .print-chitti-styles .flex-between { display: flex; justify-content: space-between; align-items: baseline; }
        .print-chitti-styles .font-bold { font-weight: bold; }
        .print-chitti-styles .text-right { text-align: right; }
        .print-chitti-styles .mb-1 { margin-bottom: 0.25rem; }
        .print-chitti-styles .mb-2 { margin-bottom: 0.5rem; }
        .print-chitti-styles .mt-1 { margin-top: 0.25rem; }
        .print-chitti-styles .mt-2 { margin-top: 0.5rem; }
        .print-chitti-styles .mt-4 { margin-top: 1rem; }
        .print-chitti-styles .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .print-chitti-styles .underline-val { border-bottom: 1px solid black; padding-bottom: 1px; }
        .print-chitti-styles .label-col { width: 40%; }
        .print-chitti-styles .value-col { width: 60%; text-align: right; }
      `}</style>

      <div className="text-center mb-2">
        <PrintHeaderSymbol className="text-base" />
        <h2 className="text-lg font-bold mt-1">Purchase Voucher</h2>
      </div>

      <div className="flex-between mb-2">
        <div className="font-bold">Vakkal/Lot: {purchase.lotNumber}</div>
        <div>Date: {format(parseISO(purchase.date), "dd-MMM-yyyy")}</div>
      </div>
      <hr />

      <div className="mt-2 space-y-1">
        <div className="flex-between">
          <span className="label-col">Supplier:</span>
          <span className="value-col font-bold">{purchase.supplierName || purchase.supplierId}</span>
        </div>
        {purchase.agentName && (
          <div className="flex-between">
            <span className="label-col">Agent:</span>
            <span className="value-col font-bold">{purchase.agentName}</span>
          </div>
        )}
        <div className="flex-between">
          <span className="label-col">Location (Warehouse):</span>
          <span className="value-col font-bold">{purchase.locationName || purchase.locationId}</span>
        </div>
        {purchase.transporterName && (
          <div className="flex-between">
            <span className="label-col">Transporter:</span>
            <span className="value-col font-bold">{purchase.transporterName}</span>
          </div>
        )}
      </div>
      <hr className="mt-2" />

      <div className="mt-2 space-y-1">
        <div className="flex-between">
          <span className="label-col">Quantity (Bags):</span>
          <span className="value-col font-bold">{purchase.quantity.toLocaleString()}</span>
        </div>
        <div className="flex-between">
          <span className="label-col">Net Weight (kg):</span>
          <span className="value-col font-bold">{purchase.netWeight.toLocaleString()}</span>
        </div>
        <div className="flex-between">
          <span className="label-col">Rate (₹/kg):</span>
          <span className="value-col font-bold">
            {purchase.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      <hr className="mt-2"/>
      
      <div className="mt-2 space-y-1">
        <div className="flex-between">
          <span className="label-col">Basic Value:</span>
          <span className="value-col font-bold">
            {itemValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        {(purchase.expenses || 0) > 0 && (
          <div className="flex-between">
            <span className="label-col">Other Expenses:</span>
            <span className="value-col">
              {(purchase.expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
        {(purchase.transportRate || 0) > 0 && (
          <div className="flex-between">
            <span className="label-col">Transport Charges:</span>
            <span className="value-col">
              {(purchase.transportRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
      
      <hr className="border-black mt-2 mb-1"/>
      <div className="flex-between font-bold text-base mt-1">
        <span className="label-col">GRAND TOTAL:</span>
        <span className="value-col underline-val">
          ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};
