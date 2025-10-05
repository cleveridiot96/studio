"use client";

import type { LedgerEntry } from '@/lib/types';
import { format, parseISO } from "date-fns";
import { PrintHeaderSymbol } from "@/components/shared/PrintHeaderSymbol";

interface AccountStatementPrintProps {
  partyDetails: { name: string; type: string; } | undefined;
  dateRange: { from: Date; to: Date; } | undefined;
  ledgerData: {
    debitTransactions: any[];
    creditTransactions: any[];
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
    balanceType: string;
  }
}

export const AccountStatementPrint: React.FC<AccountStatementPrintProps> = ({ partyDetails, dateRange, ledgerData }) => {
  if (!partyDetails || !dateRange || !ledgerData) return null;
  
  const { debitTransactions, creditTransactions, openingBalance, closingBalance, totalDebit, totalCredit, balanceType } = ledgerData;
  const openingBalanceDisplay = {
    amount: Math.abs(openingBalance),
    type: openingBalance >= 0 ? 'Dr' : 'Cr'
  };

  const closingBalanceDisplay = {
    amount: Math.abs(closingBalance),
    type: closingBalance >= 0 ? 'Dr' : 'Cr'
  }

  const allTransactions = [
      ...debitTransactions.filter(tx => tx.id !== 'op_bal').map(tx => ({...tx, side: 'debit'})),
      ...creditTransactions.filter(tx => tx.id !== 'op_bal').map(tx => ({...tx, side: 'credit'}))
  ].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  let runningBalance = openingBalance;

  return (
    <div className="p-4 bg-white text-black w-[550px] text-xs print-chitti-styles uppercase">
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
        <h2 className="text-lg font-bold mt-1">ACCOUNT STATEMENT</h2>
      </div>

       <div className="text-center mb-2">
            <h1 className="text-xl font-bold">{partyDetails.name} ({partyDetails.type})</h1>
            <p className="text-xs">
              PERIOD: {dateRange.from ? format(dateRange.from, "dd/MM/yy") : 'START'} TO {dateRange.to ? format(dateRange.to, "dd/MM/yy") : 'END'}
            </p>
        </div>
      <hr />

      <table className="text-xs">
          <thead>
            <tr>
              <th>DATE</th>
              <th>PARTICULARS</th>
              <th className="text-right">DEBIT (₹)</th>
              <th className="text-right">CREDIT (₹)</th>
              <th className="text-right">BALANCE (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold">
              <td colSpan={2}>OPENING BALANCE</td>
              <td className="text-right">{openingBalance > 0 ? openingBalanceDisplay.amount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}</td>
              <td className="text-right">{openingBalance < 0 ? openingBalanceDisplay.amount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}</td>
              <td className="text-right">{openingBalanceDisplay.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})} {openingBalanceDisplay.type}</td>
            </tr>
            {allTransactions.map(tx => {
                runningBalance = runningBalance + tx.debit - tx.credit;
                const balanceDisplay = { amount: Math.abs(runningBalance), type: runningBalance >= 0 ? 'Dr' : 'Cr' };
                return (
                    <tr key={tx.id}>
                        <td>{format(parseISO(tx.date), "dd/MM/yy")}</td>
                        <td>{tx.particulars}</td>
                        <td className="text-right">{tx.debit > 0 ? tx.debit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}</td>
                        <td className="text-right">{tx.credit > 0 ? tx.credit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '-'}</td>
                        <td className="text-right">{balanceDisplay.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})} {balanceDisplay.type}</td>
                    </tr>
                );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-100">
              <td colSpan={2}>TOTALS</td>
              <td className="text-right">{totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td className="text-right">{totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td></td>
            </tr>
             <tr className="font-bold bg-gray-200">
              <td colSpan={4}>CLOSING BALANCE</td>
              <td className="text-right">{closingBalanceDisplay.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})} {closingBalanceDisplay.type}</td>
            </tr>
          </tfoot>
      </table>
    </div>
  );
};
