
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

  // useState for managing local UI state
  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);
  const [isSalesClientHydrated, setIsSalesClientHydrated] = React.useState(false); // For ensuring client-side only logic runs after mount

  // Memoized empty array for stable default value to useLocalStorageState
  const memoizedEmptyArray = React.useMemo(() => [], []);

  // useLocalStorageState hooks for persistent data
  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyArray);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);

  // useEffect to set hydration flag after component mounts on client
  React.useEffect(() => {
    setIsSalesClientHydrated(true);
  }, []); // Empty dependency array means this runs once on mount

  // useMemo for derived data (filtered sales)
  // This recalculates only when its dependencies (sales, financialYear, isAppHydrating, isSalesClientHydrated) change.
  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    return sales.filter(sale => sale && sale.date && isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear, isAppHydrating, isSalesClientHydrated]);

  // useCallback for memoizing event handlers to prevent unnecessary re-renders of child components
  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    const isEditing = sales.some(s => s.id === sale.id);
    setSales(prevSales => {
      if (isEditing) {
        return prevSales.map(s => s.id === sale.id ? sale : s);
      } else {
        return [{...sale, id: sale.id || `sale-${Date.now()}` }, ...prevSales];
      }
    });
    setSaleToEdit(null); // Reset editing state
    toast({ title: "Success!", description: isEditing ? "Sale updated successfully." : "Sale added successfully." });
  }, [sales, setSales, toast]); // Dependencies for this callback

  const handleEditSale = React.useCallback((sale: Sale) => {
    setSaleToEdit(sale);
    setIsAddSaleFormOpen(true);
  }, []); // No dependencies, this function's identity is stable

  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => {
    setSaleToDeleteId(saleId);
    setShowDeleteConfirm(true);
  }, []); // No dependencies

  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      toast({ title: "Success!", description: "Sale deleted successfully.", variant: "destructive" });
      setSaleToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, toast]); // Dependencies

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    let updated = false;
    switch (type) {
        case "Customer":
            setCustomers(prev => {
                updated = true;
                // Ensure no duplicates and sort
                const newSet = new Map(prev.map(item => [item.id, item]));
                newSet.set(newItem.id, newItem);
                return Array.from(newSet.values()).sort((a, b) => a.name.localeCompare(b.name));
            });
            break;
        case "Transporter":
            setTransporters(prev => {
                updated = true;
                const newSet = new Map(prev.map(item => [item.id, item]));
                newSet.set(newItem.id, newItem);
                return Array.from(newSet.values()).sort((a, b) => a.name.localeCompare(b.name));
            });
            break;
        case "Broker":
            setBrokers(prev => {
                updated = true;
                const newSet = new Map(prev.map(item => [item.id, item]));
                newSet.set(newItem.id, newItem as Broker); // Ensure correct type
                return Array.from(newSet.values()).sort((a, b) => a.name.localeCompare(b.name));
            });
            break;
        default:
            toast({title: "Info", description: `Master type ${type} not handled here for sales.`})
            break;
    }
    if (updated) {
        toast({ title: `${newItem.type} "${newItem.name}" added/updated from Sales.` });
    }
  }, [setCustomers, setTransporters, setBrokers, toast]); // Dependencies

  const openAddSaleForm = React.useCallback(() => {
    setSaleToEdit(null); 
    setIsAddSaleFormOpen(true);
  }, []); // No dependencies

  const closeAddSaleForm = React.useCallback(() => {
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, []); // No dependencies

  // Conditional rendering based on hydration state
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
      
      {/* AddSaleForm is rendered conditionally */}
      {isAddSaleFormOpen && (
        <AddSaleForm
          isOpen={isAddSaleFormOpen}
          onClose={closeAddSaleForm}
          onSubmit={handleAddOrUpdateSale}
          customers={customers as Customer[]}
          transporters={transporters as Transporter[]}
          brokers={brokers}
          inventoryLots={inventorySource} 
          existingSales={sales} // Pass existing sales for stock validation
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
              This action cannot be undone. This will permanently delete the sale
              record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSale} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    