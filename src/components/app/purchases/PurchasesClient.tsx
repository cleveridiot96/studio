
// @ts-nocheck
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, FilePlus2, Printer } from "lucide-react";
import type { Purchase, MasterItem, MasterItemType, Supplier, Agent, Warehouse, Transporter, Broker } from "@/lib/types";
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

const initialPurchasesData: Purchase[] = [
  {
    id: "purchase-1", date: "2024-05-01", lotNumber: "LOT-A/100", supplierId: "supp-anand", supplierName: "Anand Agro Products", agentId: "agent-ajay", agentName: "Ajay Kumar",
    quantity: 100, netWeight: 5000, rate: 22, expenses: 500, transportRatePerKg: 0.5, transporterId: "trans-speedy", transporterName: "Speedy Logistics",
    totalAmount: (5000 * 22) + 500 + (0.5 * 5000), locationId: "wh-mum", locationName: "Mumbai Central Warehouse"
  },
  {
    id: "purchase-2", date: "2024-05-05", lotNumber: "LOT-B/50", supplierId: "supp-meena", supplierName: "Meena Farms",
    quantity: 50, netWeight: 2500, rate: 25, expenses: 200,
    totalAmount: (2500 * 25) + 200, locationId: "wh-pune", locationName: "Pune North Godown"
  },
  {
    id: "purchase-3", date: "2024-05-10", lotNumber: "LOT-C/75", supplierId: "supp-vikas", supplierName: "Vikas Seeds & Grains", agentId: "agent-sunila", agentName: "Sunil Varma",
    quantity: 75, netWeight: 3750, rate: 20,
    totalAmount: (3750 * 20), locationId: "wh-ngp", locationName: "Nagpur South Storage"
  },
  {
    id: "purchase-4", date: "2024-05-12", lotNumber: "LOT-D/120", supplierId: "supp-uma", supplierName: "Uma Organics",
    quantity: 120, netWeight: 6000, rate: 28, expenses: 700, transportRatePerKg: 0.4, transporterId: "trans-reliable", transporterName: "Reliable Transports",
    totalAmount: (6000 * 28) + 700 + (0.4*6000), locationId: "wh-mum", locationName: "Mumbai Central Warehouse"
  },
  {
    id: "purchase-5", date: "2024-05-15", lotNumber: "LOT-E/80", supplierId: "supp-sunilp", supplierName: "Sunil Trading Co.", agentId: "agent-ajay", agentName: "Ajay Kumar",
    quantity: 80, netWeight: 4000, rate: 23.5,
    totalAmount: (4000 * 23.5), locationId: "wh-pune", locationName: "Pune North Godown"
  },
];

// Keys for localStorage - ensure these match where master data is stored
const PURCHASES_STORAGE_KEY = 'purchasesData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers'; // Though not used in purchase form, kept for consistency if needed elsewhere

export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, initialPurchasesData);
  // Load master data using the keys defined in masters/page.tsx for consistency
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, []);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, []);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, []);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, []); // Kept for AddPurchaseForm prop, though not used in form

  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

  const filteredPurchases = React.useMemo(() => {
    return purchases.filter(purchase => isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear]);

  const handleAddOrUpdatePurchase = React.useCallback((purchase: Purchase) => {
    const isEditing = purchases.some(p => p.id === purchase.id);
    setPurchases(prevPurchases => {
      if (isEditing) {
        return prevPurchases.map(p => p.id === purchase.id ? purchase : p);
      } else {
        return [purchase, ...prevPurchases];
      }
    });
    setPurchaseToEdit(null);
    toast({ title: "Success!", description: isEditing ? "Purchase updated successfully." : "Purchase added successfully." });
  }, [setPurchases, toast, purchases]); // Added purchases to dependency array for isEditing

  const handleEditPurchase = React.useCallback((purchase: Purchase) => {
    setPurchaseToEdit(purchase);
    setIsAddPurchaseFormOpen(true);
  }, []);

  const handleDeletePurchaseAttempt = React.useCallback((purchaseId: string) => {
    setPurchaseToDeleteId(purchaseId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeletePurchase = React.useCallback(() => {
    if (purchaseToDeleteId) {
      setPurchases(prev => prev.filter(p => p.id !== purchaseToDeleteId));
      toast({ title: "Success!", description: "Purchase deleted successfully." });
      setPurchaseToDeleteId(null);
      setShowDeleteConfirm(false);
    }
  }, [purchaseToDeleteId, setPurchases, toast]);

  const handleMasterDataUpdate = React.useCallback((type: MasterItemType, newItem: MasterItem) => {
    switch (type) {
      case "Supplier":
        setSuppliers(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Agent":
        setAgents(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
        break;
      case "Warehouse":
        setWarehouses(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);
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
  }, [setSuppliers, setAgents, setWarehouses, setTransporters, setBrokers]);

  const openAddPurchaseForm = React.useCallback(() => {
    setPurchaseToEdit(null);
    setIsAddPurchaseFormOpen(true);
  }, []);

  const closeAddPurchaseForm = React.useCallback(() => {
    setIsAddPurchaseFormOpen(false);
    setPurchaseToEdit(null);
  }, []);

  return (
    <div className="space-y-6 print-area">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchases (FY {financialYear})</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddPurchaseForm} size="lg" className="text-base py-3 px-6 shadow-md">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Purchase
          </Button>
          <Button variant="outline" size="icon" onClick={() => window.print()}>
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print</span>
          </Button>
        </div>
      </div>

      <PurchaseTable data={filteredPurchases} onEdit={handleEditPurchase} onDelete={handleDeletePurchaseAttempt} />

      {isAddPurchaseFormOpen && (
        <AddPurchaseForm
          isOpen={isAddPurchaseFormOpen}
          onClose={closeAddPurchaseForm}
          onSubmit={handleAddOrUpdatePurchase}
          suppliers={suppliers}
          agents={agents}
          warehouses={warehouses}
          transporters={transporters}
          brokers={brokers}
          onMasterDataUpdate={handleMasterDataUpdate}
          purchaseToEdit={purchaseToEdit}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the purchase record.
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

    