
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Payment, MasterItem, MasterItemType, Supplier, Agent, Broker, Transporter } from "@/lib/types";
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

// Storage Keys
const PAYMENTS_STORAGE_KEY = 'paymentsData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';

const initialPaymentsData: Payment[] = [
  { id: "pay-1", date: "2024-05-03", partyId: "supp-anand", partyName: "Anand Agro Products", partyType: "Supplier", amount: 50000, paymentMethod: "Bank", referenceNo: "CHK1001", notes: "Advance for LOT-A" },
  { id: "pay-2", date: "2024-05-08", partyId: "agent-ajay", partyName: "Ajay Kumar", partyType: "Agent", amount: 2200, paymentMethod: "Cash", notes: "Commission for LOT-A" },
  { id: "pay-3", date: "2024-05-12", partyId: "trans-speedy", partyName: "Speedy Logistics", partyType: "Transporter", amount: 2500, paymentMethod: "UPI", referenceNo: "upi123", notes: "Transport for LOT-A" },
  { id: "pay-4", date: "2024-05-18", partyId: "broker-vinod", partyName: "Vinod Mehta", partyType: "Broker", amount: 280, paymentMethod: "Cash", notes: "Brokerage INV-001" },
  { id: "pay-5", date: "2024-05-20", partyId: "supp-meena", partyName: "Meena Farms", partyType: "Supplier", amount: 60000, paymentMethod: "Bank", referenceNo: "NEFT5678", notes: "Payment for LOT-B" },
];

export function PaymentsClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();

  const [payments, setPayments] = useLocalStorageState<Payment[]>(PAYMENTS_STORAGE_KEY, initialPaymentsData);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, []);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, []);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(BROKERS_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, []);

  const [isAddPaymentFormOpen, setIsAddPaymentFormOpen] = React.useState(false);
  const [paymentToEdit, setPaymentToEdit] = React.useState<Payment | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [paymentToDeleteId, setPaymentToDeleteId] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

   React.useEffect(() => {
    setHydrated(true);
  }, []);

  const allPaymentParties = React.useMemo(() => {
    if (!hydrated) return [];
    return [
      ...suppliers,
      ...agents,
      ...brokers,
      ...transporters
    ].filter(party => ['Supplier', 'Agent', 'Broker', 'Transporter'].includes(party.type));
  }, [suppliers, agents, brokers, transporters, hydrated]);

  const filteredPayments = React.useMemo(() => {
    if (!hydrated) return [];
    return payments.filter(payment => isDateInFinancialYear(payment.date, financialYear));
  }, [payments, financialYear, hydrated]);

  const handleAddOrUpdatePayment = React.useCallback((payment: Payment) => {
    const isEditing = payments.some(p => p.id === payment.id);
    setPayments(prevPayments => {
      if (isEditing) {
        return prevPayments.map(p => p.id === payment.id ? payment : p);
      } else {
        return [payment, ...prevPayments];
      }
    });
    setPaymentToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Payment updated successfully." : "Payment added successfully." });
  }, [setPayments, toast, payments]); // Added payments to dependency for isEditing

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
      toast({ title: "Success!", description: "Payment deleted successfully.", variant: "destructive" });
      setPaymentToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [paymentToDeleteId, setPayments, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    switch (type) {
      case "Supplier":
        setSuppliers(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Agent":
        setAgents(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Broker":
        setBrokers(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Transporter":
        setTransporters(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      default:
        toast({title: "Info", description: `Master type ${type} not handled here.`})
        break;
    }
     toast({ title: `${newItem.type} "${newItem.name}" updated/added from Payments.` });
  }, [setSuppliers, setAgents, setBrokers, setTransporters, toast]);

  const openAddPaymentForm = React.useCallback(() => {
    setPaymentToEdit(null);
    setIsAddPaymentFormOpen(true);
  }, []);

  const closeAddPaymentForm = React.useCallback(() => {
    setIsAddPaymentFormOpen(false);
    setPaymentToEdit(null);
  }, []);

  if (!hydrated) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p className="text-lg text-muted-foreground">Loading payments data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 print-area">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments (FY {financialYear})</h1>
        </div>
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
          parties={allPaymentParties}
          onMasterDataUpdate={handleMasterDataUpdate}
          paymentToEdit={paymentToEdit}
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

    