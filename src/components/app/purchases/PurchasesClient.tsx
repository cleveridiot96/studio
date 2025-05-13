"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, FilePlus2 } from "lucide-react";
import type { Purchase, MasterItem, MasterItemType, Supplier, Agent, Warehouse, Transporter } from "@/lib/types";
import { PurchaseTable } from "./PurchaseTable";
import { AddPurchaseForm } from "./AddPurchaseForm";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Mock Data - Replace with API calls in a real application
const initialPurchases: Purchase[] = [
  {
    id: "purchase-1",
    date: "2024-05-01",
    lotNumber: "AB/6",
    supplierId: "s1",
    supplierName: "AR Agent Supplier", // Denormalized for display
    agentId: "a1",
    agentName: "AR Agent", // Denormalized for display
    itemName: "Wheat",
    quantity: 6,
    netWeight: 300,
    rate: 320,
    totalAmount: 96000, // 300 * 320
    warehouseId: "w1",
    warehouseName: "Mumbai Godown",
    transporterId: "t1",
    transporterName: "Speedy Logistics"
  },
];

const initialSuppliers: Supplier[] = [
  { id: "s1", name: "AR Agent Supplier" },
  { id: "s2", name: "Local Farm Co." },
];
const initialAgents: Agent[] = [
  { id: "a1", name: "AR Agent" },
  { id: "a2", name: "Krishi Mitra" },
];
const initialWarehouses: Warehouse[] = [
  { id: "w1", name: "Mumbai Godown" },
  { id: "w2", name: "Chiplun Storage" },
];
const initialTransporters: Transporter[] = [
  { id: "t1", name: "Speedy Logistics" },
  { id: "t2", name: "Bharat Transports" },
];


export function PurchasesClient() {
  const { toast } = useToast();
  const [purchases, setPurchases] = React.useState<Purchase[]>(initialPurchases);
  const [suppliers, setSuppliers] = React.useState<MasterItem[]>(initialSuppliers);
  const [agents, setAgents] = React.useState<MasterItem[]>(initialAgents);
  const [warehouses, setWarehouses] = React.useState<MasterItem[]>(initialWarehouses);
  const [transporters, setTransporters] = React.useState<MasterItem[]>(initialTransporters);

  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);


  const handleAddOrUpdatePurchase = (purchase: Purchase) => {
    const isEditing = purchases.some(p => p.id === purchase.id);
    if (isEditing) {
      setPurchases(purchases.map(p => p.id === purchase.id ? purchase : p));
      toast({ title: "Success!", description: "Purchase updated successfully." });
    } else {
      setPurchases([purchase, ...purchases]);
      toast({ title: "Success!", description: "Purchase added successfully." });
    }
    setPurchaseToEdit(null);
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setPurchaseToEdit(purchase);
    setIsAddPurchaseFormOpen(true);
  };

  const handleDeletePurchaseAttempt = (purchaseId: string) => {
    setPurchaseToDeleteId(purchaseId);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePurchase = () => {
    if (purchaseToDeleteId) {
      setPurchases(purchases.filter(p => p.id !== purchaseToDeleteId));
      toast({ title: "Success!", description: "Purchase deleted successfully." });
      setPurchaseToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleMasterDataUpdate = (type: MasterItemType, newItem: MasterItem) => {
    switch (type) {
      case "Supplier":
        setSuppliers(prev => [newItem, ...prev]);
        break;
      case "Agent":
        setAgents(prev => [newItem, ...prev]);
        break;
      case "Warehouse":
        setWarehouses(prev => [newItem, ...prev]);
        break;
      case "Transporter":
        setTransporters(prev => [newItem, ...prev]);
        break;
      default:
        break;
    }
  };
  
  const openAddPurchaseForm = () => {
    setPurchaseToEdit(null); // Ensure it's for adding new
    setIsAddPurchaseFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchases</h1>
          <p className="text-lg text-muted-foreground">Add and manage your purchase records.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddPurchaseForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Purchase
          </Button>
          <Button variant="outline" size="lg" className="text-base py-3 px-6 shadow-md" onClick={() => toast({title: "Info", description: "Multi-item purchase functionality coming soon!"})}>
            <FilePlus2 className="mr-2 h-5 w-5" /> Add Multi-Item Purchase
          </Button>
        </div>
      </div>

      <PurchaseTable data={purchases} onEdit={handleEditPurchase} onDelete={handleDeletePurchaseAttempt} />

      <AddPurchaseForm
        isOpen={isAddPurchaseFormOpen}
        onClose={() => { setIsAddPurchaseFormOpen(false); setPurchaseToEdit(null); }}
        onSubmit={handleAddOrUpdatePurchase}
        suppliers={suppliers}
        agents={agents}
        warehouses={warehouses}
        transporters={transporters}
        onMasterDataUpdate={handleMasterDataUpdate}
        purchaseToEdit={purchaseToEdit}
      />
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase
              record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurchaseToDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePurchase} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
