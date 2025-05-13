// @ts-nocheck
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, FilePlus2 } from "lucide-react";
import type { Sale, MasterItem, MasterItemType, Customer } from "@/lib/types";
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


// Mock Data - Replace with API calls in a real application
const initialSalesData: Sale[] = [
  {
    id: "sale-1",
    date: "2024-05-10", // FY 2024-2025
    billNumber: "INV-00123",
    customerId: "c1",
    customerName: "Ram Kumar",
    itemName: "Basmati Rice",
    quantity: 10,
    price: 65,
    totalAmount: 650,
  },
  {
    id: "sale-2",
    date: "2023-11-20", // FY 2023-2024
    billNumber: "INV-00124",
    customerId: "c2",
    customerName: "Sita Devi Traders",
    itemName: "Wheat Flour",
    quantity: 50,
    price: 40,
    totalAmount: 2000,
  },
  {
    id: "sale-3",
    date: "2024-03-05", // FY 2023-2024
    billNumber: "INV-00125",
    customerId: "c1",
    customerName: "Ram Kumar",
    itemName: "Sugar",
    quantity: 25,
    price: 42,
    totalAmount: 1050,
  },
   {
    id: "sale-4",
    date: "2025-02-15", // FY 2024-2025
    billNumber: "INV-00126",
    customerId: "c2",
    customerName: "Sita Devi Traders",
    itemName: "Pulses",
    quantity: 30,
    price: 120,
    totalAmount: 3600,
  },
];

const SALES_STORAGE_KEY = 'salesData';
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';


const initialCustomers: Customer[] = [
  { id: "c1", name: "Ram Kumar", type: "Customer" },
  { id: "c2", name: "Sita Devi Traders", type: "Customer" },
];

export function SalesClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();

  const [sales, setSales] = useLocalStorageState<Sale[]>(SALES_STORAGE_KEY, initialSalesData);
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, initialCustomers);


  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);

  const filteredSales = React.useMemo(() => {
    return sales.filter(sale => isDateInFinancialYear(sale.date, financialYear));
  }, [sales, financialYear]);

  const handleAddOrUpdateSale = (sale: Sale) => {
    setSales(prevSales => {
      const isEditing = prevSales.some(s => s.id === sale.id);
      if (isEditing) {
        toast({ title: "Success!", description: "Sale updated successfully." });
        return prevSales.map(s => s.id === sale.id ? sale : s);
      } else {
        toast({ title: "Success!", description: "Sale added successfully." });
        return [sale, ...prevSales];
      }
    });
    setSaleToEdit(null);
  };

  const handleEditSale = (sale: Sale) => {
    setSaleToEdit(sale);
    setIsAddSaleFormOpen(true);
  };

  const handleDeleteSaleAttempt = (saleId: string) => {
    setSaleToDeleteId(saleId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSale = () => {
    if (saleToDeleteId) {
      setSales(prev => prev.filter(s => s.id !== saleToDeleteId));
      toast({ title: "Success!", description: "Sale deleted successfully." });
      setSaleToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleMasterDataUpdate = (type: MasterItemType, newItem: MasterItem) => {
    if (type === "Customer") {
      setCustomers(prev => [newItem, ...prev]);
    }
  };

  const openAddSaleForm = () => {
    setSaleToEdit(null); 
    setIsAddSaleFormOpen(true);
  };

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

      <AddSaleForm
        isOpen={isAddSaleFormOpen}
        onClose={() => { setIsAddSaleFormOpen(false); setSaleToEdit(null); }}
        onSubmit={handleAddOrUpdateSale}
        customers={customers}
        onMasterDataUpdate={handleMasterDataUpdate}
        saleToEdit={saleToEdit}
      />

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
