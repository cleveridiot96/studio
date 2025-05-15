
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
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

// Initial Data (empty for payments, masters will be loaded)
const initialPaymentsData: Payment[] = [];

// Placeholder initial master data (will be overridden by localStorage if available)
const initialSuppliers: Supplier[] = [];
const initialAgents: Agent[] = [];
const initialBrokers: Broker[] = [];
const initialTransporters: Transporter[] = [];

export function PaymentsClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();

  const [payments, setPayments] = useLocalStorageState<Payment[]>(PAYMENTS_STORAGE_KEY, initialPaymentsData);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, initialSuppliers);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, initialAgents);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(BROKERS_STORAGE_KEY, initialBrokers);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, initialTransporters);

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
    setPayments(prevPayments => {
      const isEditing = prevPayments.some(p => p.id === payment.id);
      if (isEditing) {
        toast({ title: "Success!", description: "Payment updated successfully." });
        return prevPayments.map(p => p.id === payment.id ? payment : p);
      } else {
        toast({ title: "Success!", description: "Payment added successfully." });
        return [payment, ...prevPayments];
      }
    });
    setPaymentToEdit(null);
  }, [setPayments, toast]);

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
    // This function might be called if a new party is added from the AddPaymentForm
    // It should update the corresponding master list
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments (FY {financialYear})</h1>
          {/* <p className="text-lg text-muted-foreground">Track payments made for FY {financialYear}.</p> */}
        </div>
        <Button onClick={openAddPaymentForm} size="lg" className="text-base py-3 px-6 shadow-md">
          <PlusCircle className="mr-2 h-5 w-5" /> Add Payment
        </Button>
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
