
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Printer } from "lucide-react";
import type { Sale, MasterItem, MasterItemType, Customer, Transporter, Broker, Purchase } from "@/lib/types";
import { SaleTable } from "./SaleTable";
import { AddSaleForm } from "./AddSaleForm";
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

// Constants for localStorage keys
const SALES_STORAGE_KEY = 'salesData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const PURCHASES_STORAGE_KEY = 'purchasesData'; // For inventory lots

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear, isAppHydrating } = useSettings(); // Hook from SettingsContext

  // UI State
  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);
  const [isSalesClientHydrated, setIsSalesClientHydrated] = React.useState(false);

  // Memoized empty array for stable default value to useLocalStorageState
  const memoizedEmptyArray = React.useMemo(() => [], []);

  // Data states from localStorage
  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyArray);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);

  // Effect to mark client-side hydration as complete
  React.useEffect(() => {
    setIsSalesClientHydrated(true);
  }, []);

  // Memoized derived data for sales filtered by financial year
  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    return sales.filter(sale => sale && sale.date && isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear, isAppHydrating, isSalesClientHydrated]);

  // Memoized callback for opening the "Add Sale" form
  const openAddSaleForm = React.useCallback(() => {
    setSaleToEdit(null);
    setIsAddSaleFormOpen(true);
  }, []);

  // Memoized callback for closing the "Add Sale" form
  const closeAddSaleForm = React.useCallback(() => {
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, []);

  // Memoized callback for handling sale submission (add or update)
  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    setSales(prevSales => {
      const isEditing = prevSales.some(s => s.id === sale.id);
      if (isEditing) {
        return prevSales.map(s => s.id === sale.id ? sale : s);
      } else {
        // Ensure new sales get a unique ID if not provided
        return [{ ...sale, id: sale.id || `sale-${Date.now()}` }, ...prevSales];
      }
    });
    toast({
      title: "Success!",
      description: sales.some(s => s.id === sale.id) ? "Sale updated successfully." : "Sale added successfully."
    });
    closeAddSaleForm(); // Close form after submission
  }, [setSales, toast, closeAddSaleForm, sales]); // Added 'sales' to dep array for isEditing check message, though setSales is stable

  // Memoized callback for initiating sale edit
  const handleEditSale = React.useCallback((sale: Sale) => {
    setSaleToEdit(sale);
    setIsAddSaleFormOpen(true);
  }, []);

  // Memoized callback for initiating sale deletion
  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => {
    setSaleToDeleteId(saleId);
    setShowDeleteConfirm(true);
  }, []);

  // Memoized callback for confirming sale deletion
  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      toast({
        title: "Success!",
        description: "Sale deleted successfully.",
        variant: "destructive"
      });
      setSaleToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, toast]);

  // Memoized callback for updating master data lists when a new master is added via the form
  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    const updateList = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      setter(prev => {
        const newSet = new Map(prev.map(item => [item.id, item]));
        newSet.set(newItem.id, newItem);
        return Array.from(newSet.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
    };

    switch (type) {
      case "Customer":
        updateList(setCustomers as React.Dispatch<React.SetStateAction<MasterItem[]>>);
        break;
      case "Transporter":
        updateList(setTransporters as React.Dispatch<React.SetStateAction<MasterItem[]>>);
        break;
      case "Broker":
        updateList(setBrokers as React.Dispatch<React.SetStateAction<Broker[]>>);
        break;
      default:
        toast({ title: "Info", description: `Master type ${type} not directly handled for master data updates in Sales.` });
        return; // Exit if type is not handled
    }
    toast({ title: `${newItem.type} "${newItem.name}" added/updated.` });
  }, [setCustomers, setTransporters, setBrokers, toast]);

  // Render guard for development to catch excessive re-renders
  const renderCount = React.useRef(0);
  if (process.env.NODE_ENV === 'development') {
    renderCount.current += 1;
    if (renderCount.current > 50) { // Adjusted threshold for safety
      console.error('SalesClient: Excessive re-renders detected! Potential infinite loop.');
      // In a real scenario, you might throw an error or return a fallback UI
      // For now, let's allow rendering but log the error.
    }
  }

  // Show loading state until settings and local client state are hydrated
  if (isAppHydrating || !isSalesClientHydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading sales data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-foreground">Sales (FY {financialYear})</h1>
        <div className="flex gap-2">
          <Button onClick={openAddSaleForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print</span>
          </Button>
        </div>
      </div>

      <SaleTable data={filteredSales} onEdit={handleEditSale} onDelete={handleDeleteSaleAttempt} />
      
      {/* Conditionally render AddSaleForm only when it's meant to be open and client is hydrated */}
      {isSalesClientHydrated && isAddSaleFormOpen && (
        <AddSaleForm
          key={saleToEdit ? `edit-${saleToEdit.id}` : 'add-new-sale'} // Unique key to force remount
          isOpen={true} // isOpen is controlled by the conditional render
          onClose={closeAddSaleForm}
          onSubmit={handleAddOrUpdateSale}
          customers={customers as Customer[]}
          transporters={transporters as Transporter[]}
          brokers={brokers}
          inventoryLots={inventorySource} 
          existingSales={sales} // Pass existing sales for stock validation in form
          onMasterDataUpdate={handleMasterDataUpdate}
          saleToEdit={saleToEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sale record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSale} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    