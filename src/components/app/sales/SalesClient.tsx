
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
  const { financialYear, isAppHydrating } = useSettings();

  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);
  const [isSalesClientHydrated, setIsSalesClientHydrated] = React.useState(false);

  const memoizedEmptyArray = React.useMemo(() => [], []);

  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, memoizedEmptyArray);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, memoizedEmptyArray);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedEmptyArray);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, memoizedEmptyArray);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, memoizedEmptyArray);

  React.useEffect(() => {
    setIsSalesClientHydrated(true);
  }, []);

  const filteredSales = React.useMemo(() => {
    if (isAppHydrating || !isSalesClientHydrated) return [];
    return sales.filter(sale => sale && sale.date && isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear, isAppHydrating, isSalesClientHydrated]);

  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    setSales(prevSales => {
      const isEditing = prevSales.some(s => s.id === sale.id);
      // Toast should be called after state update or based on logic not directly inside updater
      // For simplicity, calling it before, but in complex scenarios, consider useEffect
      toast({
        title: "Success!",
        description: isEditing ? "Sale updated successfully." : "Sale added successfully."
      });
      if (isEditing) {
        return prevSales.map(s => s.id === sale.id ? sale : s);
      } else {
        return [{ ...sale, id: sale.id || `sale-${Date.now()}` }, ...prevSales];
      }
    });
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, [setSales, toast]);

  const handleEditSale = React.useCallback((sale: Sale) => {
    setSaleToEdit(sale);
    setIsAddSaleFormOpen(true);
  }, []);

  const handleDeleteSaleAttempt = React.useCallback((saleId: string) => {
    setSaleToDeleteId(saleId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteSale = React.useCallback(() => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      toast({ title: "Success!", description: "Sale deleted successfully.", variant: "destructive" });
      setSaleToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    let updated = false;
    const masterSetters = {
      Customer: setCustomers,
      Transporter: setTransporters,
      Broker: setBrokers,
    };

    const setter = masterSetters[type as keyof typeof masterSetters];

    if (setter) {
      setter(prev => {
        updated = true;
        const newSet = new Map(prev.map(item => [item.id, item]));
        newSet.set(newItem.id, newItem as any); // Cast as any if type narrowing is complex
        return Array.from(newSet.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
    } else {
        toast({title: "Info", description: `Master type ${type} not handled here for sales.`});
    }

    if (updated) {
        toast({ title: `${newItem.type} "${newItem.name}" added/updated from Sales.` });
    }
  }, [setCustomers, setTransporters, setBrokers, toast]);

  const openAddSaleForm = React.useCallback(() => {
    setSaleToEdit(null);
    setIsAddSaleFormOpen(true);
  }, []);

  const closeAddSaleForm = React.useCallback(() => {
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, []);

  if (isAppHydrating || !isSalesClientHydrated) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <p className="text-lg text-muted-foreground">Loading sales data...</p>
      </div>
    );
  }

  // Temporarily commenting out render guard for syntax debugging
  // const renderCount = React.useRef(0);
  // renderCount.current += 1;
  // if (renderCount.current > 50) {
  //   console.error('SalesClient: Render loop detected - breaking cycle');
  //   return <div className="p-4 text-destructive">Render loop blocked in SalesClient - please check console.</div>;
  // }

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
      
      {isSalesClientHydrated && (
        <AddSaleForm
          key={saleToEdit ? `edit-${saleToEdit.id}` : 'add-new-sale'}
          isOpen={isAddSaleFormOpen}
          onClose={closeAddSaleForm}
          onSubmit={handleAddOrUpdateSale}
          customers={customers as Customer[]}
          transporters={transporters as Transporter[]}
          brokers={brokers}
          inventoryLots={inventorySource} 
          existingSales={sales}
          onMasterDataUpdate={handleMasterDataUpdate}
          saleToEdit={saleToEdit}
        />
      )}

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
