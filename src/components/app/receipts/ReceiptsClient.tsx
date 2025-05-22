
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Receipt, MasterItem, MasterItemType, Customer, Broker } from "@/lib/types";
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
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';

const RECEIPTS_STORAGE_KEY = 'receiptsData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const BROKERS_STORAGE_KEY = 'masterBrokers';

const initialReceiptsData: Receipt[] = [
  { id: "rec-fy2526-1", date: "2025-05-11", partyId: "cust-ramesh", partyName: "Ramesh Retail", partyType: "Customer", amount: 15000, paymentMethod: "Bank", referenceNo: "NEFTFY2526-123", notes: "Part payment for INV-FY2526-001", cashDiscount: 0, relatedSaleIds: [] },
  { id: "rec-fy2526-2", date: "2025-06-22", partyId: "cust-sita", partyName: "Sita General Store", partyType: "Customer", amount: 45000, paymentMethod: "Cash", notes: "Full payment for INV-FY2526-002", cashDiscount: 0, relatedSaleIds: [] },
  { id: "rec-fy2425-1", date: "2024-09-19", partyId: "broker-leela", partyName: "Leela Associates", partyType: "Broker", amount: 300, paymentMethod: "UPI", notes: "Brokerage received for INV-FY2425-001", cashDiscount: 0, relatedSaleIds: [] },
];

export function ReceiptsClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings(); 

  const memoizedInitialReceipts = React.useMemo(() => initialReceiptsData, []);
  const memoizedEmptyMasters = React.useMemo(() => [], []);

  const [receipts, setReceipts] = useLocalStorageState<Receipt[]>(RECEIPTS_STORAGE_KEY, memoizedInitialReceipts);
  const [customers, setCustomers] = useLocalStorageState<Customer[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyMasters);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyMasters);

  const [isAddReceiptFormOpen, setIsAddReceiptFormOpen] = React.useState(false);
  const [receiptToEdit, setReceiptToEdit] = React.useState<Receipt | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [receiptToDeleteId, setReceiptToDeleteId] = React.useState<string | null>(null);

  const allReceiptParties = React.useMemo(() => {
    return [
        ...customers.filter(c => c.type === 'Customer'),
        ...brokers.filter(b => b.type === 'Broker')
    ].filter(party => party && party.id && party.name && party.type)
     .sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, brokers]);

  const filteredReceipts = React.useMemo(() => {
    if (isAppHydrating) return [];
    return receipts.filter(receipt => receipt && receipt.date && isDateInFinancialYear(receipt.date, financialYear));
  }, [receipts, financialYear, isAppHydrating]);

  const handleAddOrUpdateReceipt = React.useCallback((receipt: Receipt) => {
    const isEditing = receipts.some(r => r.id === receipt.id);
    let toastMessage = "";
    let toastDescription = "";

    setReceipts(prevReceipts => {
      if (isEditing) {
        toastMessage = "Success!";
        toastDescription = "Receipt updated successfully.";
        return prevReceipts.map(r => r.id === receipt.id ? receipt : r);
      } else {
        toastMessage = "Success!";
        toastDescription = "Receipt added successfully.";
        return [{...receipt, id: receipt.id || `receipt-${Date.now()}`}, ...prevReceipts];
      }
    });
    setReceiptToEdit(null);
    if (toastMessage) {
      toast({ title: toastMessage, description: toastDescription });
    }
  }, [setReceipts, receipts, toast]); 

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
      toast({ title: "Success!", description: "Receipt deleted successfully.", variant: "destructive" });
      setReceiptToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [receiptToDeleteId, setReceipts, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    let updated = false;
    switch (type) {
      case "Customer":
        setCustomers(prev => {
          updated = true;
          return [newItem as Customer, ...prev.filter(i => i.id !== newItem.id)];
        });
        break;
      case "Broker":
        setBrokers(prev => {
          updated = true;
          return [newItem as Broker, ...prev.filter(i => i.id !== newItem.id)];
        });
        break;
      default:
        toast({title: "Info", description: `Master type ${type} not handled here.`})
        break;
    }
     if(updated){
        toast({ title: `${newItem.type} "${newItem.name}" added/updated.` });
    }
  }, [setCustomers, setBrokers, toast]);

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
          parties={allReceiptParties}
          onMasterDataUpdate={handleMasterDataUpdate}
          receiptToEdit={receiptToEdit}
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
