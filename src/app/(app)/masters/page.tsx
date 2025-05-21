
"use client";
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Users, Truck, UserCheck, UserCog, Handshake, PlusCircle, List, Building } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { MasterForm } from '@/components/app/masters/MasterForm';
import { MasterList } from '@/components/app/masters/MasterList';
import type { MasterItem, MasterItemType } from '@/lib/types';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { useToast } from '@/hooks/use-toast';
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
import { doesNameExist } from '@/lib/masterUtils';


// Storage keys
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';


// Initial data set (will be empty array after formatting)
const initialCustomers: MasterItem[] = [];
const initialSuppliers: MasterItem[] = [];
const initialAgents: MasterItem[] = [];
const initialTransporters: MasterItem[] = [];
const initialBrokers: MasterItem[] = [];
const initialWarehouses: MasterItem[] = [];


type MasterPageTabKey = MasterItemType | 'All';

const TABS_CONFIG: { value: MasterPageTabKey; label: string; icon: React.ElementType; }[] = [
  { value: "All", label: "All Parties", icon: List },
  { value: "Customer", label: "Customers", icon: Users },
  { value: "Supplier", label: "Suppliers", icon: Truck },
  { value: "Agent", label: "Agents", icon: UserCheck },
  { value: "Transporter", label: "Transporters", icon: UserCog },
  { value: "Broker", label: "Brokers", icon: Handshake },
  { value: "Warehouse", label: "Warehouses", icon: Building },
];

export default function MastersPage() {
  const { toast } = useToast();
  
  const memoizedInitialCustomers = useMemo(() => initialCustomers, []);
  const memoizedInitialSuppliers = useMemo(() => initialSuppliers, []);
  const memoizedInitialAgents = useMemo(() => initialAgents, []);
  const memoizedInitialTransporters = useMemo(() => initialTransporters, []);
  const memoizedInitialBrokers = useMemo(() => initialBrokers, []);
  const memoizedInitialWarehouses = useMemo(() => initialWarehouses, []);

  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, memoizedInitialCustomers);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, memoizedInitialSuppliers);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, memoizedInitialAgents);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, memoizedInitialTransporters);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(BROKERS_STORAGE_KEY, memoizedInitialBrokers);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, memoizedInitialWarehouses);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [activeTab, setActiveTab] = useState<MasterPageTabKey>(TABS_CONFIG[0].value);

  const [itemToDelete, setItemToDelete] = useState<MasterItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    // This effect runs once on mount to signal client-side hydration is complete.
    setHydrated(true);
  }, []);

  const allMasterItems = useMemo(() => {
    if (!hydrated) return []; 
    // This combines all master lists. If a list (e.g., suppliers) is empty, nothing from it will be added.
    return [...customers, ...suppliers, ...agents, ...transporters, ...brokers, ...warehouses].sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, suppliers, agents, transporters, brokers, warehouses, hydrated]);


  const getMasterDataState = useCallback((type: MasterItemType | 'All') => {
    switch (type) {
      case 'Customer': return { data: customers, setData: setCustomers };
      case 'Supplier': return { data: suppliers, setData: setSuppliers };
      case 'Agent': return { data: agents, setData: setAgents };
      case 'Transporter': return { data: transporters, setData: setTransporters };
      case 'Broker': return { data: brokers, setData: setBrokers };
      case 'Warehouse': return { data: warehouses, setData: setWarehouses };
      case 'All': return { data: allMasterItems, setData: () => {} }; // setData is a no-op for 'All'
      default: return { data: [], setData: () => {} };
    }
  }, [customers, suppliers, agents, transporters, brokers, warehouses, setCustomers, setSuppliers, setAgents, setTransporters, setBrokers, setWarehouses, allMasterItems]);

  const handleAddOrUpdateMasterItem = useCallback((item: MasterItem) => {
    const { setData } = getMasterDataState(item.type);
    // Use allMasterItems for name checking to ensure uniqueness across all types if needed,
    // or filter based on current item's type if names can be duplicated across types.
    // For this implementation, we check against all items.
    const itemsForNameCheck = allMasterItems.filter(existingItem => existingItem.id !== item.id);

    if (doesNameExist(item.name, item.type, item.id, itemsForNameCheck)) {
      toast({
        title: "Duplicate Name",
        description: `An item named "${item.name}" of type "${item.type}" already exists. Please use a different name.`,
        variant: "destructive",
      });
      return;
    }

    let toastMessage = "";
    let toastDescription = "";

    setData(prev => {
      const existingIndex = prev.findIndex(i => i.id === item.id);
      if (existingIndex > -1) {
        const updatedData = [...prev];
        updatedData[existingIndex] = item;
        toastMessage = `${item.type} updated successfully!`;
        toastDescription = `Details for ${item.name} saved.`;
        return updatedData;
      } else {
        toastMessage = `${item.type} added successfully!`;
        toastDescription = `${item.name} is now in your masters.`;
        return [item, ...prev].sort((a,b) => a.name.localeCompare(b.name));
      }
    });

    if (toastMessage) {
      toast({ title: toastMessage, description: toastDescription });
    }

    setIsFormOpen(false);
    setEditingItem(null);

  }, [getMasterDataState, allMasterItems, toast]); 

  const handleEditItem = useCallback((item: MasterItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleDeleteItemAttempt = useCallback((item: MasterItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteItem = useCallback(() => {
    if (itemToDelete) {
      const itemType = itemToDelete.type;
      const itemName = itemToDelete.name;
      const { setData } = getMasterDataState(itemType);
      
      setData(prev => prev.filter(i => i.id !== itemToDelete.id));
      
      toast({ title: `${itemType} deleted.`, description: `${itemName} has been removed.`, variant: 'destructive' });
      
      setItemToDelete(null);
      setShowDeleteConfirm(false);
    }
  }, [itemToDelete, getMasterDataState, toast]);

  const openFormForNewItem = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const addButtonLabel = useMemo(() => {
    if (activeTab === 'All') return "Add New Party/Entity";
    const currentTabConfig = TABS_CONFIG.find(t => t.value === activeTab);
    const singularLabel = currentTabConfig?.label.endsWith('s') ? currentTabConfig.label.slice(0, -1) : currentTabConfig?.label;
    return `Add New ${singularLabel || 'Party/Entity'}`;
  }, [activeTab]);


  if (!hydrated) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p className="text-lg text-muted-foreground">Loading master data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Masters</h1>
        </div>
        <Button onClick={openFormForNewItem} size="lg" className="text-base py-3 px-6 shadow-md">
          <PlusCircle className="mr-2 h-5 w-5" /> {addButtonLabel}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MasterPageTabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 h-auto">
          {TABS_CONFIG.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="py-2 sm:py-3 text-sm sm:text-base flex-wrap">
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS_CONFIG.map(tab => {
          const currentData = tab.value === 'All' ? allMasterItems : getMasterDataState(tab.value).data;
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary">Manage {tab.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <MasterList
                    data={currentData} 
                    itemType={tab.value} 
                    isAllItemsTab={tab.value === "All"}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItemAttempt}
                  />
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">
                    Total {tab.value === 'All' ? 'parties/entities' : tab.label.toLowerCase()}: {currentData.length}
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {isFormOpen && (
        <MasterForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
          onSubmit={handleAddOrUpdateMasterItem}
          initialData={editingItem}
          itemTypeFromButton={editingItem ? editingItem.type : (activeTab === 'All' ? 'Customer' : activeTab as MasterItemType)}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the master item: <strong>{itemToDelete?.name}</strong> ({itemToDelete?.type}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
    

    