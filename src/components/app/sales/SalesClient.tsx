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

// Mock Data - Replace with API calls in a real application
const initialSales: Sale[] = [
  {
    id: "sale-1",
    date: "2024-05-10",
    billNumber: "INV-00123",
    customerId: "c1",
    customerName: "Ram Kumar", // Denormalized for display
    itemName: "Basmati Rice",
    quantity: 10,
    price: 65,
    totalAmount: 650, // 10 * 65
  },
];

const initialCustomers: Customer[] = [
  { id: "c1", name: "Ram Kumar" },
  { id: "c2", name: "Sita Devi Traders" },
];

export function SalesClient() {
  const { toast } = useToast();
  const [sales, setSales] = React.useState<Sale[]>(initialSales);
  const [customers, setCustomers] = React.useState<MasterItem[]>(initialCustomers);

  const [isAddSaleFormOpen, setIsAddSaleFormOpen] = React.useState(false);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = React.useState<string | null>(null);

  const handleAddOrUpdateSale = (sale: Sale) => {
    const isEditing = sales.some(s => s.id === sale.id);
    if (isEditing) {
      setSales(sales.map(s => s.id === sale.id ? sale : s));
      toast({ title: "Success!", description: "Sale updated successfully." });
    } else {
      setSales([sale, ...sales]);
      toast({ title: "Success!", description: "Sale added successfully." });
    }
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
      setSales(sales.filter(s => s.id !== saleToDeleteId));
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
    setSaleToEdit(null); // Ensure it's for adding new
    setIsAddSaleFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales</h1>
          <p className="text-lg text-muted-foreground">Generate sales bills and track sales records.</p>
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

      <SaleTable data={sales} onEdit={handleEditSale} onDelete={handleDeleteSaleAttempt} />

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
