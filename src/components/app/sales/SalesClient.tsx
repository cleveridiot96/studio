
// @ts-nocheck
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, FilePlus2 } from "lucide-react";
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
const initialInventory: Purchase[] = []; // Purchases will act as inventory source


const SALES_STORAGE_KEY = 'salesData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const PURCHASES_STORAGE_KEY = 'purchasesData'; // For inventory source


export function SalesClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();

  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, initialSalesData);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, initialCustomers);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, initialTransporters);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, initialBrokers);
  const [inventorySource, setInventorySource] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, initialInventory);


  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);

  const filteredSales = React.useMemo(() => {
    return sales.filter(sale => isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear]);

  const availableInventoryForSale = React.useMemo(() => {
    // Basic transformation: for now, all purchases are considered inventory lots
    // In a real system, you'd track remaining quantities here
    return inventorySource.map(p => ({ id: p.id, vakkalNumber: p.lotNumber, ...p }));
  }, [inventorySource]);


  const handleAddOrUpdateSale = React.useCallback((sale: Sale) => {
    setSales(prevSales => {
      const isEditing = prevSales.some(s => s.id === sale.id);
      if (isEditing) {
        toast({ title: "Success!", description: "Sale updated successfully." });
        return prevSales.map(s => s.id === sale.id ? sale : s);
      } else {
        toast({ title: "Success!", description: "Sale added successfully." });
        // TODO: Add inventory deduction logic here
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
            break;
    }
  }, [setCustomers, setTransporters, setBrokers]);

  const openAddSaleForm = React.useCallback(() => {
    setSaleToEdit(null); 
    setIsAddSaleFormOpen(true);
  }, []);

  const closeAddSaleForm = React.useCallback(() => {
    setIsAddSaleFormOpen(false);
    setSaleToEdit(null);
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales</h1>
          <p className="text-lg text-muted-foreground">Generate sales bills and track sales records for FY {financialYear}.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddSaleForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
          </Button>
          <Button variant="outline" size="lg" className="text-base py-3 px-6 shadow-md" onClick={() => toast({title: "Info", description: "Multi-item sale functionality coming soon!"})}>
            <FilePlus2 className="mr-2 h-5 w-5" /> Add Multi-Item Sale
          </Button>
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
          inventory={availableInventoryForSale}
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

