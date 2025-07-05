
"use client";

import type { Purchase } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface PurchaseChittiPrintProps {
  purchase: Purchase;
}

export const PurchaseChittiPrint: React.FC<PurchaseChittiPrintProps> = ({ purchase }) => {
  if (!purchase) return null;
  
  const goodsValue = purchase.netWeight * purchase.rate;
  const totalExpenses = (purchase.transportCharges || 0) + (purchase.packingCharges || 0) + (purchase.labourCharges || 0) + (purchase.brokerageCharges || 0) + (purchase.miscExpenses || 0);
  const grandTotal = purchase.totalAmount;

  return (
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
        {purchase.transporterName && (
          <div className="flex-between">
            <span className="label-col">Transporter:</span>
            <span className="value-col font-bold">{purchase.transporterName}</span>
          </div>
        )}
        <div className="flex-between">
          <span className="label-col">Location (Warehouse):</span>
          <span className="value-col font-bold">{purchase.locationName || purchase.locationId}</span>
        </div>
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
        <div className="flex-between py-1 border-t border-dashed">
          <span className="label-col font-bold">Goods Value:</span>
          <span className="value-col font-bold">
            {goodsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {totalExpenses > 0 && (
        <>
          <hr />
          <div className="mt-1 mb-1">
            <span className="font-bold">Expenses:</span>
          </div>
          <div className="space-y-1">
            {purchase.transportCharges && purchase.transportCharges > 0 && <div className="flex-between"><span className="label-col">Transport:</span><span className="value-col">{purchase.transportCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.packingCharges && purchase.packingCharges > 0 && <div className="flex-between"><span className="label-col">Packing:</span><span className="value-col">{purchase.packingCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.labourCharges && purchase.labourCharges > 0 && <div className="flex-between"><span className="label-col">Labour:</span><span className="value-col">{purchase.labourCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.brokerageCharges && purchase.brokerageCharges > 0 && <div className="flex-between"><span className="label-col">Brokerage:</span><span className="value-col">{purchase.brokerageCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.miscExpenses && purchase.miscExpenses > 0 && <div className="flex-between"><span className="label-col">Misc:</span><span className="value-col">{purchase.miscExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            <div className="flex-between py-1 border-t border-dashed">
                <span className="label-col font-bold">Total Expenses:</span>
                <span className="value-col font-bold">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </>
      )}
      
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
