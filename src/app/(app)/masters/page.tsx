// @ts-nocheck
"use client";
import React, { useState, useCallback, useMemo } from 'react';
import { Users, Truck, UserCheck, UserCog, Handshake, PlusCircle, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { MasterForm } from '@/components/app/masters/MasterForm';
import { MasterList } from '@/components/app/masters/MasterList';
import type { MasterItem, MasterItemType, MasterItemSubtype } from '@/lib/types';
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

// Storage keys
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';

// Initial data (ensure subtypes are included for customers)
const initialCustomers: MasterItem[] = [
  { id: 'c1', name: 'Alpha Customer', type: 'Customer', subtype: 'Retailer' },
  { id: 'c2', name: 'Gamma Wholesaler', type: 'Customer', subtype: 'Wholesaler' },
];
const initialSuppliers: MasterItem[] = [{ id: 's1', name: 'Beta Supplier', type: 'Supplier' }];
const initialAgents: MasterItem[] = [{ id: 'a1', name: 'Epsilon Agent', type: 'Agent', commission: 2.5 }];
const initialTransporters: MasterItem[] = [{ id: 't1', name: 'Delta Transporter', type: 'Transporter' }];
const initialBrokers: MasterItem[] = [{ id: 'b1', name: 'Zeta Broker', type: 'Broker', commission: 1 }];


type MasterPageTabKey = MasterItemType | 'All';

const TABS_CONFIG: { value: MasterPageTabKey; label: string; icon: React.ElementType; subtypes?: MasterItemSubtype[] }[] = [
  { value: "All", label: "All Items", icon: List },
  { value: "Customer", label: "Customers", icon: Users, subtypes: ['Retailer', 'Wholesaler', 'Corporate'] },
  { value: "Supplier", label: "Suppliers", icon: Truck },
  { value: "Agent", label: "Agents", icon: UserCheck },
  { value: "Transporter", label: "Transporters", icon: UserCog },
  { value: "Broker", label: "Brokers", icon: Handshake },
];

export default function MastersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, initialCustomers);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, initialSuppliers);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, initialAgents);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, initialTransporters);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(BROKERS_STORAGE_KEY, initialBrokers);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [activeTab, setActiveTab] = useState<MasterPageTabKey>(TABS_CONFIG[0].value);

  const [itemToDelete, setItemToDelete] = useState<MasterItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const allMasterItems = useMemo(() => {
    return [...customers, ...suppliers, ...agents, ...transporters, ...brokers].sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, suppliers, agents, transporters, brokers]);


  const getMasterDataState = useCallback((type: MasterItemType | 'All') => {
    if (type === 'All') {
      return { data: allMasterItems, setData: () => {} };
    }
    switch (type) {
      case 'Customer': return { data: customers, setData: setCustomers };
      case 'Supplier': return { data: suppliers, setData: setSuppliers };
      case 'Agent': return { data: agents, setData: setAgents };
      case 'Transporter': return { data: transporters, setData: setTransporters };
      case 'Broker': return { data: brokers, setData: setBrokers };
      default: return { data: [], setData: () => {} };
    }
  }, [allMasterItems, customers, suppliers, agents, transporters, brokers, setCustomers, setSuppliers, setAgents, setTransporters, setBrokers]);

  const handleAddOrUpdateMasterItem = useCallback((item: MasterItem) => {
    const { data, setData } = getMasterDataState(item.type);
    
    // Duplicate name check (case-insensitive within the same type)
    const trimmedNewName = item.name.trim().toLowerCase();
    const isDuplicateName = data.some(
      existingItem => 
        existingItem.id !== item.id && // Exclude the item itself if editing
        existingItem.name.trim().toLowerCase() === trimmedNewName &&
        existingItem.type === item.type
    );

    if (isDuplicateName) {
      toast({
        title: "Duplicate Name",
        description: `An item named "${item.name}" of type "${item.type}" already exists. Please use a different name.`,
        variant: "destructive",
      });
      return; // Stop execution if duplicate
    }

    setData(prev => {
      const existingIndex = prev.findIndex(i => i.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = item;
        toast({ title: `${item.type} updated successfully!` });
        return updated;
      }
      toast({ title: `${item.type} added successfully!` });
      return [item, ...prev];
    });
    setIsFormOpen(false);
    setEditingItem(null);
  }, [getMasterDataState, toast]);

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
      const { setData } = getMasterDataState(itemToDelete.type);
      setData(prev => prev.filter(i => i.id !== itemToDelete.id));
      toast({ title: `${itemToDelete.type} deleted.`, variant: 'destructive' });
      setItemToDelete(null);
      setShowDeleteConfirm(false);
    }
  }, [itemToDelete, getMasterDataState, toast]);

  const openFormForNewItem = () => {
    setEditingItem(null);
    // Determine initial type for the form. If 'All' tab is active, default to 'Customer'.
    const initialTypeForForm = activeTab === 'All' ? 'Customer' : activeTab;
    const activeTabConfig = TABS_CONFIG.find(t => t.value === initialTypeForForm);
    
    setEditingItem(prev => ({
        ...prev,
        type: initialTypeForForm as MasterItemType,
        subtype: activeTabConfig?.subtypes?.[0] // Default to first subtype if available for the type
    }));
    setIsFormOpen(true);
  };
  
  const addButtonLabel = useMemo(() => {
    if (activeTab === 'All') return "Add New Item";
    // Find the config for the currently active tab to get its label
    const currentTabConfig = TABS_CONFIG.find(t => t.value === activeTab);
    // Use singular form for the button label, e.g., "Add New Customer"
    const singularLabel = currentTabConfig?.label.endsWith('s') ? currentTabConfig.label.slice(0, -1) : currentTabConfig?.label;
    return `Add New ${singularLabel || 'Item'}`;
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Masters</h1>
          <p className="text-lg text-muted-foreground">Manage your core business entities.</p>
        </div>
        <Button onClick={openFormForNewItem} size="lg" className="text-base py-3 px-6 shadow-md">
          <PlusCircle className="mr-2 h-5 w-5" /> {addButtonLabel}
        </Button>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as MasterPageTabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 h-auto">
          {TABS_CONFIG.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="py-2 sm:py-3 text-sm sm:text-base flex-wrap">
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS_CONFIG.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">Manage {tab.label}</CardTitle>
                <CardDescription>View, add, or edit {tab.label.toLowerCase()} details.</CardDescription>
              </CardHeader>
              <CardContent>
                <MasterList
                  data={getMasterDataState(tab.value).data}
                  itemType={tab.value as MasterItemType} 
                  isAllItemsTab={tab.value === "All"}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItemAttempt}
                />
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Total {tab.value === 'All' ? 'items' : tab.label.toLowerCase()}: {getMasterDataState(tab.value).data.length}
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {isFormOpen && (
        <MasterForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
          onSubmit={handleAddOrUpdateMasterItem}
          initialData={editingItem}
          itemTypeFromButton={editingItem?.type || (activeTab === 'All' ? 'Customer' : activeTab as MasterItemType)}
          customerSubtypes={TABS_CONFIG.find(t => t.value === 'Customer')?.subtypes}
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
