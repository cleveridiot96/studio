
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react"; // Removed FilePlus2
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

// Initial Data set to empty arrays
const initialSalesData: Sale[] = [];
const initialCustomers: Customer[] = [];
const initialTransporters: Transporter[] = [];
const initialBrokers: Broker[] = [];
const initialInventorySource: Purchase[] = []; // Purchases will act as inventory source

const SALES_STORAGE_KEY = 'salesData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const PURCHASES_STORAGE_KEY = 'purchasesData'; // For inventory source

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();
  const [hydrated, setHydrated] = React.useState(false);

  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, initialSalesData);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, initialCustomers);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, initialTransporters);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, initialBrokers);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, initialInventorySource);

  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    setHydrated(true);
  }, []);

  const filteredSales = React.useMemo(() => {
    if (!hydrated) return [];
    return sales.filter(sale => isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear, hydrated]);

  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    setSales(prevSales => {
      const isEditing = prevSales.some(s => s.id === sale.id);
      if (isEditing) {
        toast({ title: "Success!", description: "Sale updated successfully." });
        return prevSales.map(s => s.id === sale.id ? sale : s);
      } else {
        toast({ title: "Success!", description: "Sale added successfully." });
        // TODO: Add inventory deduction logic here based on sale.lotNumber, sale.quantity, sale.netWeight
        return [sale, ...prevSales];
      }
    });
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
      // TODO: Add inventory restitution logic here if sale is deleted
      toast({ title: "Success!", description: "Sale deleted successfully." });
      setSaleToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [saleToDeleteId, setSales, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    switch (type) {
        case "Customer":
            setCustomers(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
            break;
        case "Transporter":
            setTransporters(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
            break;
        case "Broker":
            setBrokers(prev => [newItem as Broker, ...prev.filter(i => i.id !== newItem.id)]);
            break;
        default:
            toast({title: "Info", description: `Master type ${type} not handled here.`})
            break;
    }
    toast({ title: `${newItem.type} "${newItem.name}" added/updated from Sales.` });
  }, [setCustomers, setTransporters, setBrokers, toast]);

  const openAddSaleForm = React.useCallback(() => {
    setSaleToEdit(null); 
    setIsAddSaleFormOpen(true);
  }, []);

  const closeAddSaleForm = React.useCallback(() => {
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, []);

  if (!hydrated) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p className="text-lg text-muted-foreground">Loading sales data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales (FY {financialYear})</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddSaleForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
          </Button>
          {/* Multi-Item Sale Button removed as requested */}
        </div>
      </div>

      <SaleTable data={filteredSales} onEdit={handleEditSale} onDelete={handleDeleteSaleAttempt} />
      
      {isAddSaleFormOpen && (
        <AddSaleForm
          isOpen={isAddSaleFormOpen}
          onClose={closeAddSaleForm}
          onSubmit={handleAddOrUpdateSale}
          customers={customers}
          transporters={transporters}
          brokers={brokers}
          inventoryLots={inventorySource} // Pass purchases as inventory source
          existingSales={sales} // Pass existing sales for stock calculation
          onMasterDataUpdate={handleMasterDataUpdate}
          saleToEdit={saleToEdit}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sale record.
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
