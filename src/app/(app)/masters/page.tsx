
"use client";
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Users, Truck, UserCheck, Handshake, PlusCircle, List, Building, DollarSign } from "lucide-react";
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
import { FIXED_WAREHOUSES, FIXED_EXPENSES } from '@/lib/constants';
import { cn } from "@/lib/utils";

// Storage keys
const CUSTOMERS_STORAGE_KEY = 'masterCustomers';
const SUPPLIERS_STORAGE_KEY = 'masterSuppliers';
const AGENTS_STORAGE_KEY = 'masterAgents';
const TRANSPORTERS_STORAGE_KEY = 'masterTransporters';
const BROKERS_STORAGE_KEY = 'masterBrokers';
const WAREHOUSES_STORAGE_KEY = 'masterWarehouses';
const EXPENSES_STORAGE_KEY = 'masterExpenses';

const FIXED_WAREHOUSE_IDS = FIXED_WAREHOUSES.map(wh => wh.id);
const FIXED_EXPENSE_IDS = FIXED_EXPENSES.map(e => e.id);
const ALL_FIXED_IDS = [...FIXED_WAREHOUSE_IDS, ...FIXED_EXPENSE_IDS];

type MasterPageTabKey = MasterItemType | 'All';

const TABS_CONFIG: { value: MasterPageTabKey; label: string; icon: React.ElementType; colorClass: string; }[] = [
  { value: "All", label: "All Parties", icon: List, colorClass: 'text-white bg-red-800 hover:bg-red-900 data-[state=active]:bg-red-900 data-[state=active]:text-white' },
  { value: "Customer", label: "Customers", icon: Users, colorClass: 'bg-blue-500 hover:bg-blue-600 text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white' },
  { value: "Broker", label: "Brokers", icon: Handshake, colorClass: 'bg-yellow-400 hover:bg-yellow-500 text-gray-800 data-[state=active]:bg-yellow-500 data-[state=active]:text-black' },
  { value: "Supplier", label: "Suppliers", icon: Truck, colorClass: 'bg-orange-500 hover:bg-orange-600 text-white data-[state=active]:bg-orange-600 data-[state=active]:text-white' },
  { value: "Agent", label: "Agents", icon: UserCheck, colorClass: 'bg-green-500 hover:bg-green-600 text-white data-[state=active]:bg-green-600 data-[state=active]:text-white' },
  { value: "Warehouse", label: "Warehouses", icon: Building, colorClass: 'bg-teal-500 hover:bg-teal-600 text-white data-[state=active]:bg-teal-600 data-[state=active]:text-white' },
  { value: "Transporter", label: "Transport", icon: Truck, colorClass: 'bg-[#efb924] hover:bg-[#efb924]/90 text-black data-[state=active]:bg-[#efb924] data-[state=active]:text-black' },
  { value: "Expense", label: "Expenses", icon: DollarSign, colorClass: 'bg-purple-500 hover:bg-purple-600 text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white' },
];

export default function MastersPage() {
  const { toast } = useToast();
  
  const [customers, setCustomers] = useLocalStorageState<MasterItem[]>(CUSTOMERS_STORAGE_KEY, []);
  const [suppliers, setSuppliers] = useLocalStorageState<MasterItem[]>(SUPPLIERS_STORAGE_KEY, []);
  const [agents, setAgents] = useLocalStorageState<MasterItem[]>(AGENTS_STORAGE_KEY, []);
  const [transporters, setTransporters] = useLocalStorageState<MasterItem[]>(TRANSPORTERS_STORAGE_KEY, []);
  const [brokers, setBrokers] = useLocalStorageState<MasterItem[]>(BROKERS_STORAGE_KEY, []);
  const [warehouses, setWarehouses] = useLocalStorageState<MasterItem[]>(WAREHOUSES_STORAGE_KEY, []);
  const [expenses, setExpenses] = useLocalStorageState<MasterItem[]>(EXPENSES_STORAGE_KEY, []);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [activeTab, setActiveTab] = useState<MasterPageTabKey>(TABS_CONFIG[0].value);

  const [itemToDelete, setItemToDelete] = useState<MasterItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [hydrated, setHydrated] = useState(false);
  
  const prevAllMasterItemsRef = useRef<MasterItem[]>([]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const allMasterItems = useMemo(() => {
    if (!hydrated) return []; 
    return [...customers, ...suppliers, ...agents, ...transporters, ...brokers, ...warehouses, ...expenses]
      .filter(item => item && item.id && item.name && item.type) 
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, suppliers, agents, transporters, brokers, warehouses, expenses, hydrated]);

  useEffect(() => {
    if (hydrated) {
      const prevItemsMap = new Map(prevAllMasterItemsRef.current.map(item => [item.id, item]));
      const currentItemsMap = new Map(allMasterItems.map(item => [item.id, item]));

      if (prevAllMasterItemsRef.current.length > allMasterItems.length) {
          const deletedItem = prevAllMasterItemsRef.current.find(item => !currentItemsMap.has(item.id));
          if (deletedItem) {
              toast({ title: `${deletedItem.type} deleted`, description: `${deletedItem.name} has been removed.`, variant: 'destructive' });
          }
      }
      
      prevAllMasterItemsRef.current = allMasterItems;
    }
  }, [allMasterItems, hydrated, toast]);

  const hydrateFixedItems = <T extends MasterItem>(
    currentItems: T[],
    fixedItems: readonly T[],
    setItems: (items: T[]) => void
  ) => {
    const itemsMap = new Map(currentItems.map(item => [item.id, item]));
    let updated = false;
    fixedItems.forEach(fixedItem => {
      if (!itemsMap.has(fixedItem.id) || JSON.stringify(itemsMap.get(fixedItem.id)) !== JSON.stringify(fixedItem)) {
        itemsMap.set(fixedItem.id, fixedItem);
        updated = true;
      }
    });
    if (updated) {
      setItems(Array.from(itemsMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  useEffect(() => {
    if (hydrated) {
      hydrateFixedItems(warehouses, FIXED_WAREHOUSES, setWarehouses);
      hydrateFixedItems(expenses, FIXED_EXPENSES, setExpenses);
    }
  }, [hydrated, setWarehouses, warehouses, setExpenses, expenses]);


  const getMasterDataState = useCallback((type: MasterItemType | 'All') => {
    switch (type) {
      case 'Customer': return { data: customers, setData: setCustomers };
      case 'Supplier': return { data: suppliers, setData: setSuppliers };
      case 'Agent': return { data: agents, setData: setAgents };
      case 'Transporter': return { data: transporters, setData: setTransporters };
      case 'Broker': return { data: brokers, setData: setBrokers };
      case 'Warehouse': return { data: warehouses, setData: setWarehouses };
      case 'Expense': return { data: expenses, setData: setExpenses };
      case 'All': return { data: allMasterItems, setData: () => {} }; 
      default: return { data: [], setData: () => {} };
    }
  }, [customers, suppliers, agents, transporters, brokers, warehouses, expenses, setCustomers, setSuppliers, setAgents, setTransporters, setBrokers, setWarehouses, setExpenses, allMasterItems]);

  const handleAddOrUpdateMasterItem = useCallback((item: MasterItem) => {
    if (ALL_FIXED_IDS.includes(item.id) && editingItem?.id === item.id) {
       const fixedItemConfig = [...FIXED_WAREHOUSES, ...FIXED_EXPENSES].find(fw => fw.id === item.id);
       if (item.name !== fixedItemConfig?.name) {
          const { setData } = getMasterDataState(item.type);
          const updatedItem = { ...item, type: fixedItemConfig.type as MasterItemType };
          setData(prev => prev.map(i => i.id === item.id ? updatedItem : i).sort((a,b) => a.name.localeCompare(b.name)));
          toast({ title: `Fixed ${item.type} Updated`, description: `Name for ${item.name} updated.`});
       } else {
          toast({ title: "No Changes", description: `No changes made to fixed item ${item.name}.`});
       }
       setIsFormOpen(false);
       setEditingItem(null);
       return;
    }

    const { setData, data: currentData } = getMasterDataState(item.type);
    const itemsForNameCheck = allMasterItems.filter(existingItem => existingItem.id !== item.id);

    if (doesNameExist(item.name, item.type, item.id, itemsForNameCheck)) {
      toast({
        title: "Duplicate Name",
        description: `An item named "${item.name}" of type "${item.type}" already exists. Please use a different name.`,
        variant: "destructive",
      });
      return;
    }

    const isEditing = currentData.some(i => i.id === item.id);
    setData(prev => {
      if (isEditing) {
        return prev.map(i => i.id === item.id ? item : i).sort((a, b) => a.name.localeCompare(b.name));
      } else {
        return [item, ...prev].sort((a, b) => a.name.localeCompare(b.name));
      }
    });

    toast({
        title: isEditing ? `${item.type} updated` : `${item.type} added`,
        description: isEditing ? `Details for ${item.name} saved.` : `${item.name} is now in your masters.`
    });

    setIsFormOpen(false);
    setEditingItem(null);
  }, [getMasterDataState, allMasterItems, toast, editingItem]); 

  const handleEditItem = useCallback((item: MasterItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  }, []);

  const handleDeleteItemAttempt = useCallback((item: MasterItem) => {
    if (ALL_FIXED_IDS.includes(item.id)) {
      toast({
        title: "Deletion Prohibited",
        description: `${item.name} is a fixed item and cannot be deleted.`,
        variant: "destructive",
      });
      return;
    }
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  }, [toast]);

  const confirmDeleteItem = useCallback(() => {
    if (itemToDelete) {
      if (ALL_FIXED_IDS.includes(itemToDelete.id)) {
        toast({ title: "Error", description: "Fixed items cannot be deleted.", variant: "destructive" });
        setItemToDelete(null);
        setShowDeleteConfirm(false);
        return;
      }
      const itemType = itemToDelete.type;
      const { setData } = getMasterDataState(itemType);
      setData(prev => prev.filter(i => i.id !== itemToDelete.id));
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
    return `Add New ${singularLabel || 'Item'}`;
  }, [activeTab]);

  const addButtonDynamicClass = useMemo(() => {
    if (activeTab === 'All') {
      return '';
    }
    const config = TABS_CONFIG.find(t => t.value === activeTab);
    if (!config) return '';

    const bgClass = config.colorClass.split(' ').find(c => /^bg-\S+/.test(c) && !c.includes(':')) || 'bg-primary';
    const textClass = config.colorClass.split(' ').find(c => /^text-\S+/.test(c) && !c.includes(':')) || 'text-primary-foreground';
    const hoverBgClass = config.colorClass.split(' ').find(c => c.startsWith('hover:bg-')) || 'hover:bg-primary/90';

    return `${bgClass} ${textClass} ${hoverBgClass}`.trim();
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
        <Button onClick={openFormForNewItem} size="lg" className={cn(
            "text-base py-3 px-6 shadow-md",
            addButtonDynamicClass
        )}>
            <PlusCircle className="mr-2 h-5 w-5" /> {addButtonLabel}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MasterPageTabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto rounded-lg overflow-hidden p-1 bg-muted gap-1">
          {TABS_CONFIG.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "py-3 text-sm font-medium flex-wrap !shadow-none data-[state=inactive]:opacity-90 transition-all rounded-md focus-visible:ring-offset-muted flex items-center justify-center",
                tab.colorClass,
                tab.value === 'Broker' && 'data-[state=active]:!text-black',
                tab.value === 'Transporter' && 'data-[state=active]:!text-black'
              )}
            >
              <tab.icon className="w-5 h-5 mr-2" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS_CONFIG.map(tab => {
            const currentData = tab.value === 'All' ? allMasterItems : getMasterDataState(tab.value as MasterItemType | 'All').data;
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary">Manage {tab.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MasterList
                      data={currentData} 
                      itemType={tab.value as MasterItemType | 'All'}
                      isAllItemsTab={tab.value === "All"}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItemAttempt}
                      fixedItemIds={ALL_FIXED_IDS}
                    />
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-muted-foreground">
                      Total {tab.value === 'All' ? 'items' : tab.label.toLowerCase()}: {currentData.length}
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
          itemTypeFromButton={editingItem ? editingItem.type : (activeTab !== 'All' ? activeTab as MasterItemType : 'Customer')}
          fixedIds={ALL_FIXED_IDS}
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
