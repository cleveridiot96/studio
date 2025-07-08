
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
    <div className="p-4 bg-white text-black w-[550px] text-sm print-chitti-styles uppercase">
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
        <h2 className="text-lg font-bold mt-1">PURCHASE VOUCHER</h2>
      </div>

      <div className="flex-between mb-2">
        <div className="font-bold">PURCHASE ID: {purchase.id.slice(-6).toUpperCase()}</div>
        <div>DATE: {format(parseISO(purchase.date), "dd/MM/yy")}</div>
      </div>
      <hr />

      <div className="mt-2 space-y-1">
        <div className="flex-between"><span>SUPPLIER:</span><span className="font-bold">{purchase.supplierName || purchase.supplierId}</span></div>
        {purchase.agentName && <div className="flex-between"><span>AGENT:</span><span className="font-bold">{purchase.agentName}</span></div>}
        {purchase.transporterName && <div className="flex-between"><span>TRANSPORTER:</span><span className="font-bold">{purchase.transporterName}</span></div>}
        <div className="flex-between"><span>LOCATION:</span><span className="font-bold">{purchase.locationName || purchase.locationId}</span></div>
      </div>
      <hr className="mt-2" />

      {purchase.items && purchase.items.length > 0 && (
        <table className="text-xs">
          <thead>
            <tr>
              <th>VAKKAL/LOT NO.</th>
              <th className="text-right">BAGS</th>
              <th className="text-right">NET WT (KG)</th>
              <th className="text-right">RATE (₹/KG)</th>
              <th className="text-right">GOODS VALUE (₹)</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item, index) => (
              <tr key={index}>
                <td>{item.lotNumber}</td>
                <td className="text-right">{Math.round(item.quantity).toLocaleString('en-IN')}</td>
                <td className="text-right">{item.netWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                <td className="text-right">{Math.round(item.rate).toLocaleString('en-IN')}</td>
                <td className="text-right">{Math.round(item.goodsValue).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={4}>TOTAL GOODS VALUE</td>
              <td className="text-right">{Math.round(purchase.totalGoodsValue).toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      )}

      {totalExpenses > 0 && (
        <>
          <div className="mt-1 mb-1 font-bold">EXPENSES:</div>
          <div className="space-y-1 text-xs">
            {purchase.transportCharges && purchase.transportCharges > 0 && <div className="flex-between"><span>TRANSPORT:</span><span className="text-right">{Math.round(purchase.transportCharges).toLocaleString('en-IN')}</span></div>}
            {purchase.packingCharges && purchase.packingCharges > 0 && <div className="flex-between"><span>PACKING:</span><span className="text-right">{Math.round(purchase.packingCharges).toLocaleString('en-IN')}</span></div>}
            {purchase.labourCharges && purchase.labourCharges > 0 && <div className="flex-between"><span>LABOUR:</span><span className="text-right">{Math.round(purchase.labourCharges).toLocaleString('en-IN')}</span></div>}
            {purchase.brokerageCharges && purchase.brokerageCharges > 0 && <div className="flex-between"><span>BROKERAGE:</span><span className="text-right">{Math.round(purchase.brokerageCharges).toLocaleString('en-IN')}</span></div>}
            {purchase.miscExpenses && purchase.miscExpenses > 0 && <div className="flex-between"><span>MISC:</span><span className="text-right">{Math.round(purchase.miscExpenses).toLocaleString('en-IN')}</span></div>}
            <div className="flex-between py-1 border-t border-dashed mt-1 font-bold">
                <span>TOTAL EXPENSES:</span>
                <span className="text-right">{Math.round(totalExpenses).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </>
      )}
      
      <hr className="border-black mt-2 mb-1"/>
      <div className="flex-between font-bold text-base mt-1">
        <span>GRAND TOTAL:</span>
        <span className="underline-val">
          ₹{Math.round(purchase.totalAmount).toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
};
    