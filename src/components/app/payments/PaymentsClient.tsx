
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Payment, MasterItemType, Purchase, StockPaymentItem } from "@/lib/types";
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
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useOutstandingBalances } from '@/hooks/useOutstandingBalances';
import { useMasterData } from "@/contexts/MasterDataContext";
import { useTransactions } from '@/hooks/useTransactions';

export function PaymentsClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();
  const { payments, setPayments, purchases, addLedgerEntry, removeLedgerEntries, setSales } = useTransactions();
  
  const { payableParties } = useOutstandingBalances();
  const { setMasterData } = useMasterData();

  const [isAddPaymentFormOpen, setIsAddPaymentFormOpen] = React.useState(false);
  const [paymentToEdit, setPaymentToEdit] = React.useState<Payment | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [paymentToDeleteId, setPaymentToDeleteId] = React.useState<string | null>(null);

  const filteredPayments = React.useMemo(() => {
    if (isAppHydrating) return [];
    return payments.filter(payment => payment && payment.date && isDateInFinancialYear(payment.date, financialYear));
  }, [payments, financialYear, isAppHydrating]);

  const handleAddOrUpdatePayment = React.useCallback((payment: Payment) => {
    const isEditing = payments.some(p => p.id === payment.id);
    
    // If it's a stock payment, create a corresponding "sale" transaction
    if (payment.paymentType === 'Stock' && payment.stockItems) {
      const stockValue = payment.stockItems.reduce((sum, item) => sum + item.value, 0);
      
      // Update the payment amount to reflect the stock value
      payment.amount = stockValue;

      // This "sale" is for internal accounting to reduce stock correctly.
      // It won't appear on the main sales screen but will be processed by the inventory system.
      const internalSale: any = {
        id: `sale-for-payment-${payment.id}`,
        date: payment.date,
        billNumber: `PAYMENT-KIND-${payment.partyName}`,
        customerId: payment.partyId, // The supplier is the 'customer' in this context
        customerName: payment.partyName,
        items: payment.stockItems.map(si => ({
          lotNumber: si.lotNumber,
          quantity: si.quantity,
          netWeight: si.netWeight,
          rate: si.rate,
          goodsValue: si.value,
          // Profit-related fields are zeroed out as this isn't a real sale for profit
          purchaseRate: 0,
          costOfGoodsSold: 0,
          itemGrossProfit: 0,
          itemNetProfit: 0,
          costBreakdown: { baseRate: 0, purchaseExpenses: 0, transferExpenses: 0 },
        })),
        totalGoodsValue: stockValue,
        billedAmount: stockValue,
        totalQuantity: payment.stockItems.reduce((sum, item) => sum + item.quantity, 0),
        totalNetWeight: payment.stockItems.reduce((sum, item) => sum + item.netWeight, 0),
        totalCostOfGoodsSold: 0,
        totalGrossProfit: 0,
        totalCalculatedProfit: 0,
        notes: `Stock payment to settle balance. Ref Payment ID: ${payment.id}`,
        isStockPaymentSale: true, // Flag to identify this special type of sale
      };
      // Add or update this internal sale
      setSales(prevSales => {
        const existingIndex = prevSales.findIndex(s => s.id === internalSale.id);
        if (existingIndex > -1) {
            const updatedSales = [...prevSales];
            updatedSales[existingIndex] = internalSale;
            return updatedSales;
        }
        return [...prevSales, internalSale];
      });
    }


    setPayments(prevPayments => {
      if (isEditing) {
        return prevPayments.map(p => p.id === payment.id ? payment : p);
      } else {
        return [{ ...payment, id: payment.id || `payment-${Date.now()}` }, ...prevPayments];
      }
    });

    removeLedgerEntries(payment.id); // Clear old entries
    if (payment.amount > 0) {
      addLedgerEntry({
        id: `ledger-${payment.id}`,
        date: payment.date,
        type: payment.paymentType === 'Stock' ? 'Stock Payment' : 'Payment',
        account: payment.partyType,
        debit: payment.amount, // Payment debits the party's account (reduces liability)
        credit: 0,
        party: payment.partyName,
        partyId: payment.partyId,
        relatedVoucher: payment.id,
        remarks: `Payment to ${payment.partyName}`
      });
    }

    setPaymentToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Payment updated successfully." : "Payment added successfully." });
    window.dispatchEvent(new CustomEvent('reindex-search'));
  }, [payments, setPayments, setSales, addLedgerEntry, removeLedgerEntries, toast]);

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
      // Also remove the associated internal sale if it was a stock payment
      const paymentToDelete = payments.find(p => p.id === paymentToDeleteId);
      if (paymentToDelete?.paymentType === 'Stock') {
        const internalSaleId = `sale-for-payment-${paymentToDelete.id}`;
        setSales(prevSales => prevSales.filter(s => s.id !== internalSaleId));
      }

      setPayments(prev => prev.filter(p => p.id !== paymentToDeleteId));
      removeLedgerEntries(paymentToDeleteId);
      toast({ title: "Success!", description: "Payment deleted successfully.", variant: "destructive" });
      setPaymentToDeleteId(null);
      setShowDeleteConfirm(false);
      window.dispatchEvent(new CustomEvent('reindex-search'));
    }
  }, [paymentToDeleteId, payments, setPayments, setSales, removeLedgerEntries, toast]);
  
  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: any) => {
     setMasterData(type, (prev: any[]) => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
     toast({ title: `Master list updated for ${type}.`});
     window.dispatchEvent(new Event('storage'));
  }, [toast, setMasterData]);


  const openAddPaymentForm = React.useCallback(() => {
    setPaymentToEdit(null);
    setIsAddPaymentFormOpen(true);
  }, []);

  const closeAddPaymentForm = React.useCallback(() => {
    setIsAddPaymentFormOpen(false);
    setPaymentToEdit(null);
  }, []);

  if (isAppHydrating) {
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
              This action cannot be undone. This will permanently delete the payment record. If this was a stock payment, the related stock deduction will also be reversed.
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
