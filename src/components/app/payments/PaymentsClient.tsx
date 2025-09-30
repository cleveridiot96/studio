
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Payment, MasterItem, MasterItemType, Supplier, Agent, Transporter, Purchase, Sale, LedgerEntry, Broker } from "@/lib/types";
import { PaymentTable } from "./PaymentTable";
import { AddPaymentForm } from "./AddPaymentForm";
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
import { useOutstandingBalances } from '@/hooks/useOutstandingBalances';

// TRIAL PACKAGE 1 DATA
const initialPaymentsData: Payment[] = [
    { id: "pay-tp1-1", date: "2024-07-20", partyId: "supp-anand", partyName: "ANAND AGRO PRODUCTS", partyType: "Supplier", amount: 50000, paymentMethod: "Bank", transactionType: "On Account", notes: "PART PAYMENT FOR VAKKAL-A1" },
];

const PAYMENTS_STORAGE_KEY = 'paymentsData';
const PURCHASES_STORAGE_KEY = 'purchasesData';
const LEDGER_STORAGE_KEY = 'ledgerData';


export function PaymentsClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const [hydrated, setHydrated] = React.useState(false);

  const [payments, setPayments] = useLocalStorageState<Payment[]>(PAYMENTS_STORAGE_KEY, []);
  const [purchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, []);
  const [ledgerData, setLedgerData] = useLocalStorageState<LedgerEntry[]>(LEDGER_STORAGE_KEY, []);
  
  const { payableParties, getPartyName } = useOutstandingBalances();


  const [isAddPaymentFormOpen, setIsAddPaymentFormOpen] = React.useState(false);
  const [paymentToEdit, setPaymentToEdit] = React.useState<Payment | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [paymentToDeleteId, setPaymentToDeleteId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    setHydrated(true);
    if (localStorage.getItem(PAYMENTS_STORAGE_KEY) === null) {
      setPayments(initialPaymentsData);
    }
  }, [setPayments]);

  const filteredPayments = React.useMemo(() => {
    if (isAppHydrating || !hydrated) return [];
    return payments.filter(payment => payment && payment.date && isDateInFinancialYear(payment.date, financialYear));
  }, [payments, financialYear, isAppHydrating, hydrated]);

  const handleAddOrUpdatePayment = React.useCallback((payment: Payment) => {
    const isEditing = payments.some(p => p.id === payment.id);
    setPayments(prevPayments => {
      if (isEditing) {
        return prevPayments.map(p => p.id === payment.id ? payment : p);
      } else {
        return [{ ...payment, id: payment.id || `payment-${Date.now()}` }, ...prevPayments];
      }
    });

    // Add a single, simple ledger entry for the payment itself
    const newLedgerEntry: LedgerEntry = {
        id: `ledger-${payment.id}`,
        date: payment.date,
        type: 'Payment',
        account: `${payment.partyType} Payable`, // General account for payments
        debit: payment.amount, // Payment debits the party's account
        credit: 0,
        paymentMode: payment.paymentMethod,
        party: payment.partyName,
        partyId: payment.partyId,
        relatedVoucher: payment.id,
        linkedTo: {
            voucherType: 'Purchase', // Assuming payments are mostly for purchases
            voucherId: payment.id,
        },
        remarks: `Payment made: ${payment.notes || ''}`
    };
    setLedgerData(prev => [...prev.filter(l => l.id !== `ledger-${payment.id}`), newLedgerEntry]);
    
    setPaymentToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Payment updated successfully." : "Payment added successfully." });
  }, [setPayments, setLedgerData, toast, payments]);

  const handleEditPayment = React.useCallback((payment: Payment) => {
    setPaymentToEdit(payment);
    setIsAddPaymentFormOpen(true);
  }, []);

  const handleDeletePaymentAttempt = React.useCallback((paymentId: string) => {
    setPaymentToDeleteId(paymentId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeletePayment = React.useCallback(() => {
    if (paymentToDeleteId) {
      setPayments(prev => prev.filter(p => p.id !== paymentToDeleteId));
      setLedgerData(prev => prev.filter(l => l.id !== `ledger-${paymentToDeleteId}`));
      toast({ title: "Success!", description: "Payment deleted successfully.", variant: "destructive" });
      setPaymentToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [paymentToDeleteId, setPayments, setLedgerData, toast]);
  
  // This function is a placeholder for now, as master data management is centralized in MastersPage.
  // We pass it to the form to satisfy the prop requirement.
  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
     // A full implementation would update the corresponding master list (e.g., setSuppliers)
     // and re-trigger the balance calculation. For now, we'll just log it.
    console.info(`A new master item of type ${type} was added/updated:`, newItem);
    toast({ title: `Master list updated for ${type}.`});
    window.dispatchEvent(new Event('storage')); // Force re-fetch in useOutstandingBalances
  }, [toast]);


  const openAddPaymentForm = React.useCallback(() => {
    setPaymentToEdit(null);
    setIsAddPaymentFormOpen(true);
  }, []);

  const closeAddPaymentForm = React.useCallback(() => {
    setIsAddPaymentFormOpen(false);
    setPaymentToEdit(null);
  }, []);

  if (isAppHydrating || !hydrated) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p className="text-lg text-muted-foreground">Loading payments data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Payments (FY {financialYear})</h1>
        <div className="flex gap-2">
            <Button onClick={openAddPaymentForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Payment
            </Button>
            <Button variant="outline" size="icon" onClick={() => window.print()}>
                <Printer className="h-5 w-5" />
                <span className="sr-only">Print</span>
            </Button>
        </div>
      </div>

      <PaymentTable data={filteredPayments} onEdit={handleEditPayment} onDelete={handleDeletePaymentAttempt} />

      {isAddPaymentFormOpen && (
        <AddPaymentForm
          isOpen={isAddPaymentFormOpen}
          onClose={closeAddPaymentForm}
          onSubmit={handleAddOrUpdatePayment}
          parties={payableParties}
          onMasterDataUpdate={handleMasterDataUpdate}
          paymentToEdit={paymentToEdit}
          allPurchases={purchases}
          allPayments={payments}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the payment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePayment} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
