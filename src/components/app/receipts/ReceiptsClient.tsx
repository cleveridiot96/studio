
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Receipt, MasterItem, MasterItemType, Sale, LedgerEntry } from "@/lib/types";
import { ReceiptTable } from "./ReceiptTable";
import { AddReceiptForm } from "./AddReceiptForm";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useOutstandingBalances } from '@/hooks/useOutstandingBalances';
import { useMasterData } from "@/contexts/MasterDataContext";
import { useTransactions } from "@/hooks/useTransactions";

export function ReceiptsClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const { receipts, setReceipts, sales, addLedgerEntry, removeLedgerEntries } = useTransactions();

  const { receivableParties } = useOutstandingBalances();
  const { setMasterData } = useMasterData();

  const [isAddReceiptFormOpen, setIsAddReceiptFormOpen] = React.useState(false);
  const [receiptToEdit, setReceiptToEdit] = React.useState<Receipt | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [receiptToDeleteId, setReceiptToDeleteId] = React.useState<string | null>(null);

  const filteredReceipts = React.useMemo(() => {
    if (isAppHydrating) return [];
    return receipts.filter(receipt => isDateInFinancialYear(receipt.date, financialYear));
  }, [receipts, financialYear, isAppHydrating]);

  const handleAddOrUpdateReceipt = React.useCallback((receipt: Receipt) => {
    const isEditing = receipts.some(r => r.id === receipt.id);
    setReceipts(prevReceipts => {
      if (isEditing) {
        return prevReceipts.map(r => r.id === receipt.id ? receipt : r);
      } else {
        return [{...receipt, id: receipt.id || `receipt-${Date.now()}`},...prevReceipts];
      }
    });

    const newLedgerEntry: LedgerEntry = {
        id: `ledger-${receipt.id}`,
        date: receipt.date,
        type: 'Receipt',
        account: `${receipt.partyType} Receivable`,
        debit: 0,
        credit: receipt.amount + (receipt.cashDiscount || 0), // Receipt credits the party's account
        paymentMode: receipt.paymentMethod,
        party: receipt.partyName,
        partyId: receipt.partyId,
        relatedVoucher: receipt.id,
        linkedTo: {
            voucherType: 'Sale',
            voucherId: receipt.id,
        },
        remarks: `Receipt from ${receipt.partyName}: ${receipt.notes || ''}`
    };
    addLedgerEntry(newLedgerEntry);

    setReceiptToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Receipt updated successfully." : "Receipt added successfully." });
    window.dispatchEvent(new CustomEvent('reindex-search'));
  }, [receipts, setReceipts, addLedgerEntry, toast]); 

  const handleEditReceipt = React.useCallback((receipt: Receipt) => {
    setReceiptToEdit(receipt);
    setIsAddReceiptFormOpen(true);
  }, []);

  const handleDeleteReceiptAttempt = React.useCallback((receiptId: string) => {
    setReceiptToDeleteId(receiptId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteReceipt = React.useCallback(() => {
    if (receiptToDeleteId) {
      setReceipts(prev => prev.filter(r => r.id !== receiptToDeleteId));
      removeLedgerEntries(receiptToDeleteId);
      toast({ title: "Success!", description: "Receipt deleted successfully.", variant: "destructive" });
      setReceiptToDeleteId(null);
      setShowDeleteConfirm(false);
      window.dispatchEvent(new CustomEvent('reindex-search'));
    }
  }, [receiptToDeleteId, setReceipts, removeLedgerEntries, toast]);
  
  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    setMasterData(type, (prev: any[]) => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
    toast({ title: `Master list updated for ${type}.`});
    window.dispatchEvent(new CustomEvent('reindex-search'));
  }, [toast, setMasterData]);


  const openAddReceiptForm = React.useCallback(() => {
    setReceiptToEdit(null);
    setIsAddReceiptFormOpen(true);
  }, []);

  const closeAddReceiptForm = React.useCallback(() => {
    setIsAddReceiptFormOpen(false);
    setReceiptToEdit(null);
  }, []);

  if (isAppHydrating) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p className="text-lg text-muted-foreground">Loading receipts data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Receipts (FY {financialYear})</h1>
         <div className="flex gap-2">
            <Button onClick={openAddReceiptForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Receipt
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}>
                <Printer className="h-5 w-5" />
                <span className="sr-only">Print</span>
            </Button>
        </div>
      </div>

      <ReceiptTable data={filteredReceipts} onEdit={handleEditReceipt} onDelete={handleDeleteReceiptAttempt} />

      {isAddReceiptFormOpen && (
        <AddReceiptForm
          isOpen={isAddReceiptFormOpen}
          onClose={closeAddReceiptForm}
          onSubmit={handleAddOrUpdateReceipt}
          parties={receivableParties}
          onMasterDataUpdate={handleMasterDataUpdate}
          receiptToEdit={receiptToEdit}
          allSales={sales}
          allReceipts={receipts}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the receipt record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReceiptToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReceipt} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
