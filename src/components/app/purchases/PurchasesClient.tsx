// @ts-nocheck
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
} from "@/components/ui/alert-dialog"
import { useSettings } from "@/contexts/SettingsContext";
import { isDateInFinancialYear } from "@/lib/utils";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

// Mock Data - Replace with API calls in a real application
const initialPurchasesData: Purchase[] = [
  {
    id: "purchase-1",
    date: "2024-05-01", // FY 2024-2025
    lotNumber: "AB/6",
    supplierId: "s1",
    supplierName: "AR Agent Supplier",
    agentId: "a1",
    agentName: "AR Agent",
    itemName: "Wheat",
    quantity: 6,
    netWeight: 300,
    rate: 320,
    totalAmount: 96000,
    warehouseId: "w1",
    warehouseName: "Mumbai Godown",
    transporterId: "t1",
    transporterName: "Speedy Logistics"
  },
  {
    id: "purchase-2",
    date: "2023-10-15", // FY 2023-2024
    lotNumber: "CD/12",
    supplierId: "s2",
    supplierName: "Local Farm Co.",
    agentId: "a2",
    agentName: "Krishi Mitra",
    itemName: "Soyabean",
    quantity: 10,
    netWeight: 500,
    rate: 450,
    totalAmount: 225000,
    warehouseId: "w2",
    warehouseName: "Chiplun Storage",
    transporterId: "t2",
    transporterName: "Bharat Transports"
  },
  {
    id: "purchase-3",
    date: "2024-02-20", // FY 2023-2024
    lotNumber: "EF/3",
    supplierId: "s1",
    supplierName: "AR Agent Supplier",
    itemName: "Maize",
    quantity: 20,
    netWeight: 1000,
    rate: 280,
    totalAmount: 280000,
    warehouseId: "w1",
    warehouseName: "Mumbai Godown",
  },
  {
    id: "purchase-4",
    date: "2025-01-10", // FY 2024-2025
    lotNumber: "GH/78",
    supplierId: "s2",
    supplierName: "Local Farm Co.",
    agentId: "a1",
    agentName: "AR Agent",
    itemName: "Cotton",
    quantity: 15,
    netWeight: 750,
    rate: 600,
    totalAmount: 450000,
    warehouseId: "w2",
    warehouseName: "Chiplun Storage",
    transporterId: "t1",
    transporterName: "Speedy Logistics"
  },
];

// Keys for localStorage
const PURCHASES_STORAGE_KEY = 'purchasesData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';


const initialSuppliers: Supplier[] = [
  { id: "s1", name: "AR Agent Supplier", type: "Supplier" },
  { id: "s2", name: "Local Farm Co.", type: "Supplier" },
];
const initialAgents: Agent[] = [
  { id: "a1", name: "AR Agent", type: "Agent" },
  { id: "a2", name: "Krishi Mitra", type: "Agent" },
];
const initialWarehouses: Warehouse[] = [
  { id: "w1", name: "Mumbai Godown", type: "Warehouse" },
  { id: "w2", name: "Chiplun Storage", type: "Warehouse" },
];
const initialTransporters: Transporter[] = [
  { id: "t1", name: "Speedy Logistics", type: "Transporter" },
  { id: "t2", name: "Bharat Transports", type: "Transporter" },
];


export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, initialPurchasesData);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, initialSuppliers);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, initialAgents);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, initialWarehouses);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, initialTransporters);

  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

  const filteredPurchases = React.useMemo(() => {
    return purchases.filter(purchase => isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear]);


  const handleAddOrUpdatePurchase = (purchase: Purchase) => {
    setPurchases(prevPurchases => {
      const isEditing = prevPurchases.some(p => p.id === purchase.id);
      if (isEditing) {
        toast({ title: "Success!", description: "Purchase updated successfully." });
        return prevPurchases.map(p => p.id === purchase.id ? purchase : p);
      } else {
        toast({ title: "Success!", description: "Purchase added successfully." });
        return [purchase, ...prevPurchases];
      }
    });
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
      setPurchases(prev => prev.filter(p => p.id !== purchaseToDeleteId));
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
    setPurchaseToEdit(null); 
    setIsAddPurchaseFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchases</h1>
          <p className="text-lg text-muted-foreground">Add and manage your purchase records for FY {financialYear}.</p>
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

      <PurchaseTable data={filteredPurchases} onEdit={handleEditPurchase} onDelete={handleDeletePurchaseAttempt} />

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
