
"use client";

import type { LocationTransfer } from "@/lib/types";
import { format } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface LocationTransferSlipPrintProps {
  transfer: LocationTransfer;
}

export const LocationTransferSlipPrint: React.FC<LocationTransferSlipPrintProps> = ({ transfer }) => {
  if (!transfer) return null;

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
        <h1 className="text-xl font-bold mt-1">Location Transfer Slip</h1>
      </div>

      <div className="flex-between mb-2">
        <span>Date: <strong>{format(new Date(transfer.date), "dd-MM-yyyy")}</strong></span>
        <span>Transfer ID: <strong>{transfer.id.slice(-6).toUpperCase()}</strong></span>
      </div>
      
      <div className="mb-2">
        From Warehouse: <strong>{transfer.fromWarehouseName || transfer.fromWarehouseId}</strong>
      </div>
      <div className="mb-2">
        To Warehouse: <strong>{transfer.toWarehouseName || transfer.toWarehouseId}</strong>
      </div>
      
      {transfer.transporterName && (
        <div className="mb-2">
          Transporter: <strong>{transfer.transporterName}</strong>
        </div>
      )}
      
      <h3 className="font-semibold mt-4 mb-2">Items Transferred:</h3>
      <table className="text-xs">
        <thead>
          <tr>
            <th>Vakkal/Lot No.</th>
            <th className="text-right">Bags</th>
            <th className="text-right">Net Wt (kg)</th>
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item, index) => (
            <tr key={index}>
              <td>{item.lotNumber}</td>
              <td className="text-right">{item.bagsToTransfer.toLocaleString()}</td>
              <td className="text-right">{item.netWeightToTransfer.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:0})}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {transfer.notes && (
        <div className="mt-4 text-xs">
          Notes: <strong>{transfer.notes}</strong>
        </div>
      )}
      
      <div className="mt-8 pt-8 flex-between text-xs">
        <div>
          <p>Dispatched By Signature</p>
          <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
        <div>
          <p>Received By Signature</p>
           <p className="mt-8 border-t border-gray-400 pt-1">____________________</p>
        </div>
      </div>
    </div>
  );
};
