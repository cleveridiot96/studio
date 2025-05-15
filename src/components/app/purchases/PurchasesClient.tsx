
// @ts-nocheck
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, FilePlus2 } from "lucide-react";
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

// Initial Data set to empty arrays
const initialPurchasesData: Purchase[] = [];
const initialSuppliers: Supplier[] = [];
const initialAgents: Agent[] = [];
const initialWarehouses: Warehouse[] = []; // Used as Locations
const initialTransporters: Transporter[] = [];
const initialBrokers: Broker[] = [];


// Keys for localStorage
const PURCHASES_STORAGE_KEY = 'purchasesData';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses'; // Also used for Locations
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';


export function PurchasesClient() {
  const { toast } = useToast();
  const { financialYear } = useSettings();

  const [purchases, setPurchases] = useLocalStorageState<Purchase[]>(PURCHASES_STORAGE_KEY, initialPurchasesData);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, initialSuppliers);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, initialAgents);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, initialWarehouses); // Locations
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, initialTransporters);
  const [brokers, setBrokers] = useLocalStorageState<Broker[]>(BROKERS_STORAGE_KEY, initialBrokers);


  const [isAddPurchaseFormOpen, setIsAddPurchaseFormOpen] = React.useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [purchaseToDeleteId, setPurchaseToDeleteId] = React.useState<string | null>(null);

  const filteredPurchases = React.useMemo(() => {
    return purchases.filter(purchase => isDateInFinancialYear(purchase.date, financialYear));
  }, [purchases, financialYear]);


  const handleAddOrUpdatePurchase = React.useCallback((purchase: Purchase) => {
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
  }, [setPurchases, toast]);

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
      case "Warehouse": // Location
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchases (FY {financialYear})</h1>
          {/* <p className="text-lg text-muted-foreground">Add and manage your purchase records for FY {financialYear}.</p> */}
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

      {isAddPurchaseFormOpen && (
        <AddPurchaseForm
          isOpen={isAddPurchaseFormOpen}
          onClose={closeAddPurchaseForm}
          onSubmit={handleAddOrUpdatePurchase}
          suppliers={suppliers}
          agents={agents}
          warehouses={warehouses} // Locations
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
