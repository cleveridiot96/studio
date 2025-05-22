
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Sale, MasterItem, MasterItemType, Customer, Transporter, Broker, Purchase } from "@/lib/types"; // Ensure MasterItemType is imported if used by onMasterDataUpdate
import { SaleTable } from "./SaleTable";
import { AddSaleForm } from "./AddSaleForm";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';

const SALES_STORAGE_KEY = "salesData";
const CUSTOMERS_STORAGE_KEY = "masterCustomers";
const TRANSPORTERS_STORAGE_KEY = "masterTransporters";
const BROKERS_STORAGE_KEY = "masterBrokers";
const PURCHASES_STORAGE_KEY = "purchasesData"; // Used for inventoryLots

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingSale, setEditingSale] = React.useState<Sale | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  
  // This local hydrated state can be useful if SalesClient has its own async data loading
  // that needs to complete before rendering, separate from isAppHydrating.
  // For now, primarily relying on isAppHydrating for context-based data readiness.
  const [isSalesClientDataReady, setIsSalesClientDataReady] = React.useState(false);


  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [customers, setCustomers] = useLocalStorageState<Customer[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<Transporter[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyArray);
  const [inventoryLots, setInventoryLots] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);

  React.useEffect(() => {
    // This signals that the component has mounted and useLocalStorageState has had a chance to load initial values.
    setIsSalesClientDataReady(true);
  }, []);


  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientDataReady) return []; // Wait for both global settings and local data
    return sales.filter(s => s && s.date && isDateInFinancialYear(s.date, financialYear));
  }, [sales, financialYear, isAppHydrating, isSalesClientDataReady]);

  const handleAddOrUpdate = React.useCallback((newSale: Sale) => {
    setSales(prev => {
      const isEditing = prev.some(s => s.id === newSale.id);
      if (isEditing) {
        return prev.map(s => (s.id === newSale.id ? newSale : s));
      }
      return [{ ...newSale, id: newSale.id || `sale-${Date.now()}` }, ...prev];
    });

    toast({ title: "Success", description: editingSale ? "Sale updated." : "Sale added." });
    setEditingSale(null); // Reset editingSale after submission
    setIsFormOpen(false);  // Close form
  }, [setSales, toast, editingSale]); // Added editingSale to dependencies

  const handleEdit = React.useCallback((sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
  }, []);

  const handleDeleteAttempt = React.useCallback((id: string) => { // Renamed from handleDelete to avoid conflict
    setDeleteId(id);
  }, []);

  const confirmDelete = React.useCallback(() => {
    if (deleteId) {
      setSales(prev => prev.filter(s => s.id !== deleteId));
      toast({ title: "Deleted", description: "Sale record removed.", variant: "destructive" });
      setDeleteId(null);
    }
  }, [deleteId, setSales, toast]);

  const closeForm = React.useCallback(() => {
    setEditingSale(null);
    setIsFormOpen(false);
  }, []);

  const openForm = React.useCallback(() => { // Renamed from openAddSaleForm to avoid conflict
    setEditingSale(null);
    setIsFormOpen(true);
  }, []);

  // Placeholder for onMasterDataUpdate, assuming it's used by AddSaleForm
  // You'll need to define the actual master data setters (setCustomers, setBrokers, etc.) if they are used here.
  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    // Example: if type === 'Customer', call setCustomers(...)
    // This needs to be implemented based on how AddSaleForm calls it.
    // For now, just a log and toast.
    console.log("Master data update triggered from SalesClient:", type, newItem);
    toast({title: "Info", description: `Master data update for ${type} received.`});

    // Actual update logic would be:
    if (type === 'Customer') {
      setCustomers(prev => {
        const existing = prev.find(c => c.id === newItem.id);
        if (existing) return prev.map(c => c.id === newItem.id ? newItem as Customer : c);
        return [...prev, newItem as Customer].sort((a,b) => a.name.localeCompare(b.name));
      });
    } else if (type === 'Broker') {
      setBrokers(prev => {
        const existing = prev.find(b => b.id === newItem.id);
        if (existing) return prev.map(b => b.id === newItem.id ? newItem as Broker : b);
        return [...prev, newItem as Broker].sort((a,b) => a.name.localeCompare(b.name));
      });
    } else if (type === 'Transporter') {
        setTransporters(prev => {
            const existing = prev.find(t => t.id === newItem.id);
            if (existing) return prev.map(t => t.id === newItem.id ? newItem as Transporter : t);
            return [...prev, newItem as Transporter].sort((a,b) => a.name.localeCompare(b.name));
        });
    }

  }, [setCustomers, setBrokers, setTransporters, toast]);


  if (isAppHydrating || !isSalesClientDataReady) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading sales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Sales (FY {financialYear})</h1>
        <div className="flex gap-2">
          <Button onClick={openForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print</span>
          </Button>
        </div>
      </div>

      <SaleTable data={filteredSales} onEdit={handleEdit} onDelete={handleDeleteAttempt} />

      {isFormOpen && (
        <AddSaleForm
          key={editingSale ? `edit-${editingSale.id}` : 'add-new-sale'} // Key for re-mounting
          isOpen={isFormOpen} // Use isFormOpen directly
          onClose={closeForm}
          onSubmit={handleAddOrUpdate}
          customers={customers as Customer[]}
          brokers={brokers}
          transporters={transporters as Transporter[]}
          inventoryLots={inventoryLots}
          existingSales={sales}
          onMasterDataUpdate={handleMasterDataUpdate} // Ensure AddSaleForm uses this
          saleToEdit={editingSale}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the sale.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

