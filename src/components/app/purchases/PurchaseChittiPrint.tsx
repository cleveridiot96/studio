
"use client";

import type { Purchase } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface PurchaseChittiPrintProps {
  purchase: Purchase;
}

export const PurchaseChittiPrint: React.FC<PurchaseChittiPrintProps> = ({ purchase }) => {
  if (!purchase) return null;
  
  const totalExpenses = (purchase.transportCharges || 0) + (purchase.packingCharges || 0) + (purchase.labourCharges || 0) + (purchase.brokerageCharges || 0) + (purchase.miscExpenses || 0);

  return (
    <div className="p-4 bg-white text-black w-[550px] text-sm print-chitti-styles">
      <style jsx global>{`
        .print-chitti-styles { font-family: Arial, sans-serif; line-height: 1.4; }
        .print-chitti-styles h1, .print-chitti-styles h2 { margin: 0; padding: 0; }
        .print-chitti-styles hr { border-top: 1px solid #888; margin: 4px 0; }
        .print-chitti-styles table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
        .print-chitti-styles th, .print-chitti-styles td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
        .print-chitti-styles th { background-color: #f0f0f0; }
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
      `}</style>

      <div className="text-center mb-2">
        <PrintHeaderSymbol className="text-base" />
        <h2 className="text-lg font-bold mt-1">Purchase Voucher</h2>
      </div>

      <div className="flex-between mb-2">
        <div className="font-bold">Purchase ID: {purchase.id.slice(-6).toUpperCase()}</div>
        <div>Date: {format(parseISO(purchase.date), "dd-MMM-yyyy")}</div>
      </div>
      <hr />

      <div className="mt-2 space-y-1">
        <div className="flex-between"><span>Supplier:</span><span className="font-bold">{purchase.supplierName || purchase.supplierId}</span></div>
        {purchase.agentName && <div className="flex-between"><span>Agent:</span><span className="font-bold">{purchase.agentName}</span></div>}
        {purchase.transporterName && <div className="flex-between"><span>Transporter:</span><span className="font-bold">{purchase.transporterName}</span></div>}
        <div className="flex-between"><span>Location:</span><span className="font-bold">{purchase.locationName || purchase.locationId}</span></div>
      </div>
      <hr className="mt-2" />

      {purchase.items && purchase.items.length > 0 && (
        <table className="text-xs">
          <thead>
            <tr>
              <th>Vakkal/Lot No.</th>
              <th className="text-right">Bags</th>
              <th className="text-right">Net Wt (kg)</th>
              <th className="text-right">Rate (₹/kg)</th>
              <th className="text-right">Goods Value (₹)</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item, index) => (
              <tr key={index}>
                <td>{item.lotNumber}</td>
                <td className="text-right">{item.quantity.toLocaleString()}</td>
                <td className="text-right">{item.netWeight.toLocaleString()}</td>
                <td className="text-right">{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="text-right">{item.goodsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={4}>Total Goods Value</td>
              <td className="text-right">{purchase.totalGoodsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      )}

      {totalExpenses > 0 && (
        <>
          <div className="mt-1 mb-1 font-bold">Expenses:</div>
          <div className="space-y-1 text-xs">
            {purchase.transportCharges && purchase.transportCharges > 0 && <div className="flex-between"><span>Transport:</span><span className="text-right">{purchase.transportCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.packingCharges && purchase.packingCharges > 0 && <div className="flex-between"><span>Packing:</span><span className="text-right">{purchase.packingCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.labourCharges && purchase.labourCharges > 0 && <div className="flex-between"><span>Labour:</span><span className="text-right">{purchase.labourCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.brokerageCharges && purchase.brokerageCharges > 0 && <div className="flex-between"><span>Brokerage:</span><span className="text-right">{purchase.brokerageCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            {purchase.miscExpenses && purchase.miscExpenses > 0 && <div className="flex-between"><span>Misc:</span><span className="text-right">{purchase.miscExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
            <div className="flex-between py-1 border-t border-dashed mt-1 font-bold">
                <span>Total Expenses:</span>
                <span className="text-right">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </>
      )}
      
      <hr className="border-black mt-2 mb-1"/>
      <div className="flex-between font-bold text-base mt-1">
        <span>GRAND TOTAL:</span>
        <span className="underline-val">
          ₹{purchase.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};
