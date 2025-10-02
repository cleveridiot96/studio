
"use client";
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Users, Truck, UserCheck, Handshake, PlusCircle, List, Building, DollarSign, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { MasterForm } from '@/components/app/masters/MasterForm';
import { MasterList } from '@/components/app/masters/MasterList';
import type { MasterItem, MasterItemType } from '@/lib/types';
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
import Fuse from 'fuse.js';
import didYouMean from 'didyoumean2';
import { Input } from '@/components/ui/input';
import { useMasterData } from '@/contexts/MasterDataContext';

const FIXED_WAREHOUSE_IDS = FIXED_WAREHOUSES.map(wh => wh.id);
const FIXED_EXPENSE_IDS = FIXED_EXPENSES.map(e => e.id);
const ALL_FIXED_IDS = [...FIXED_WAREHOUSE_IDS, ...FIXED_EXPENSE_IDS];

type MasterPageTabKey = MasterItemType | 'All';

const TABS_CONFIG: { value: MasterPageTabKey; label: string; icon: React.ElementType; colorClass: string; }[] = [
  { value: "All", label: "ALL PARTIES", icon: List, colorClass: 'text-white bg-red-800 hover:bg-red-900 data-[state=active]:bg-red-900 data-[state=active]:text-white' },
  { value: "Customer", label: "CUSTOMERS", icon: Users, colorClass: 'bg-blue-500 hover:bg-blue-600 text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white' },
  { value: "Broker", label: "BROKERS", icon: Handshake, colorClass: 'bg-yellow-400 hover:bg-yellow-500 text-gray-800 data-[state=active]:bg-yellow-500 data-[state=active]:text-black' },
  { value: "Supplier", label: "SUPPLIERS", icon: Truck, colorClass: 'bg-orange-500 hover:bg-orange-600 text-white data-[state=active]:bg-orange-600 data-[state=active]:text-white' },
  { value: "Agent", label: "AGENTS", icon: UserCheck, colorClass: 'bg-green-500 hover:bg-green-600 text-white data-[state=active]:bg-green-600 data-[state=active]:text-white' },
  { value: "Warehouse", label: "WAREHOUSES", icon: Building, colorClass: 'bg-teal-500 hover:bg-teal-600 text-white data-[state=active]:bg-teal-600 data-[state=active]:text-white' },
  { value: "Transporter", label: "TRANSPORT", icon: Truck, colorClass: 'bg-[#531253] hover:bg-[#531253]/90 text-white data-[state=active]:bg-[#531253] data-[state=active]:text-white' },
  { value: "Expense", label: "EXPENSES", icon: DollarSign, colorClass: 'bg-purple-500 hover:bg-purple-600 text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white' },
];

const dispatchSearchReindex = () => {
    window.dispatchEvent(new CustomEvent('reindex-search'));
};

const fuseOptions = {
  keys: ['name'],
  includeScore: true,
  threshold: 0.4,
  includeMatches: true,
};

const validateMasterItem = (item: any): item is MasterItem => {
  return item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.type === 'string';
};

export default function MastersPage() {
  const { toast } = useToast();
  const { data: masterData, setData: setMasterData, getAllMasters } = useMasterData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);
  const [activeTab, setActiveTab] = useState<MasterPageTabKey>(TABS_CONFIG[0].value);
  const [itemToDelete, setItemToDelete] = useState<MasterItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allMasterItems = useMemo(() => getAllMasters(), [getAllMasters]);
  const prevAllMasterItemsRef = useRef<MasterItem[]>(allMasterItems);


  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated) {
      const prevItemsMap = new Map(prevAllMasterItemsRef.current.map(item => [item.id, item]));
      const currentItemsMap = new Map(allMasterItems.map(item => [item.id, item]));

      if (prevAllMasterItemsRef.current.length !== allMasterItems.length) {
          if (prevAllMasterItemsRef.current.length > allMasterItems.length) {
            const deletedItem = prevAllMasterItemsRef.current.find(item => !currentItemsMap.has(item.id));
            if (deletedItem) {
                toast({ title: `${deletedItem.type} deleted`, description: `${deletedItem.name} has been removed.`, variant: 'destructive' });
            }
          }
          dispatchSearchReindex();
      }
      
      prevAllMasterItemsRef.current = allMasterItems;
    }
  }, [allMasterItems, hydrated, toast]);

  const hydrateFixedItems = <T extends MasterItem>(currentItems: T[], fixedItems: readonly T[], type: MasterItemType) => {
    const itemsMap = new Map(currentItems.map(item => [item.id, item]));
    let updated = false;
    fixedItems.forEach(fixedItem => {
      if (!itemsMap.has(fixedItem.id) || JSON.stringify(itemsMap.get(fixedItem.id)) !== JSON.stringify(fixedItem)) {
        itemsMap.set(fixedItem.id, fixedItem);
        updated = true;
      }
    });
    if (updated) {
      setMasterData(type, Array.from(itemsMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  useEffect(() => {
    if (hydrated) {
      hydrateFixedItems(masterData.Warehouse, FIXED_WAREHOUSES, 'Warehouse');
      hydrateFixedItems(masterData.Expense, FIXED_EXPENSES, 'Expense');
    }
  }, [hydrated, masterData.Warehouse, masterData.Expense, setMasterData]);


  const getMasterDataState = useCallback((type: MasterItemType | 'All') => {
    const filterValid = (data: MasterItem[]) => data.filter(validateMasterItem);
    if (type === 'All') {
        return { data: allMasterItems, setData: () => {} };
    }
    return { 
        data: filterValid(masterData[type]), 
        setData: (value: MasterItem[] | ((prev: MasterItem[]) => MasterItem[])) => setMasterData(type, value)
    };
  }, [allMasterItems, masterData, setMasterData]);

  const handleAddOrUpdateMasterItem = useCallback((item: MasterItem) => {
    if (ALL_FIXED_IDS.includes(item.id) && editingItem?.id === item.id) {
       const fixedItemConfig = [...FIXED_WAREHOUSES, ...FIXED_EXPENSES].find(fw => fw.id === item.id);
       if (item.name !== fixedItemConfig?.name) {
          const { setData } = getMasterDataState(item.type);
          const updatedItem = { ...item, type: fixedItemConfig.type as MasterItemType };
          setData(prev => prev.map(i => i.id === item.id ? updatedItem : i).sort((a,b) => a.name.localeCompare(b.name)));
          toast({ title: `Fixed ${item.type} Updated`, description: `Name for ${item.name} updated.`});
          dispatchSearchReindex();
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
    dispatchSearchReindex();
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
      dispatchSearchReindex();
    }
  }, [itemToDelete, getMasterDataState, toast]);

  const openFormForNewItem = useCallback(() => {
    setEditingItem(null);
    setIsFormOpen(true);
  }, []);

  const addButtonLabel = useMemo(() => {
    if (activeTab === 'All') return "ADD NEW PARTY/ENTITY";
    const currentTabConfig = TABS_CONFIG.find(t => t.value === activeTab);
    const singularLabel = currentTabConfig?.label.endsWith('S') ? currentTabConfig.label.slice(0, -1) : currentTabConfig?.label;
    return `ADD NEW ${singularLabel || 'ITEM'}`;
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
  
  const searchDidYouMean = useMemo(() => {
    if (!searchQuery) return null;
    const names = getMasterDataState(activeTab).data.map(item => item.name);
    const suggestion = didYouMean(searchQuery, names, {
        threshold: 0.6,
        caseSensitive: false,
    });
    return Array.isArray(suggestion) ? suggestion[0] : suggestion;
  }, [searchQuery, activeTab, getMasterDataState]);
  
  const getFilteredDataForTab = (tabValue: MasterPageTabKey) => {
    const { data } = getMasterDataState(tabValue);
    if (!searchQuery) {
        return data.map(item => ({ item, matches: [], score: 1 }));
    }
    const fuse = new Fuse(data, fuseOptions);
    return fuse.search(searchQuery);
  };


  if (!hydrated) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <p className="text-lg text-muted-foreground">Loading master data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">MASTERS</h1>
        </div>
        <Button onClick={openFormForNewItem} size="lg" className={cn(
            "text-base py-2 px-5 shadow-md",
            addButtonDynamicClass
        )}>
            <PlusCircle className="mr-2 h-5 w-5" /> {addButtonLabel}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as MasterPageTabKey); setSearchQuery(''); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto rounded-lg overflow-hidden p-1 bg-muted gap-1">
          {TABS_CONFIG.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "py-2 text-sm font-medium flex-wrap !shadow-none data-[state=inactive]:opacity-90 transition-all rounded-md focus-visible:ring-offset-muted flex items-center justify-center",
                tab.colorClass,
                tab.value === 'Broker' && 'data-[state=active]:!text-black'
              )}
            >
              <tab.icon className="w-4 h-4 mr-1.5" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS_CONFIG.map(tab => {
            const filteredData = getFilteredDataForTab(tab.value);
            const totalCount = getMasterDataState(tab.value).data.length;
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-4">
                <Card className="shadow-lg">
                  <CardHeader className="sticky top-0 bg-card z-10 py-3 border-b">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                        <CardTitle className="text-xl text-primary">MANAGE {tab.label}</CardTitle>
                        <div className="w-full sm:w-auto sm:max-w-xs relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`SEARCH IN ${tab.label}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    </div>
                     {searchQuery && searchDidYouMean && (
                        <p className="text-sm text-muted-foreground mt-1">DID YOU MEAN: <button className="font-semibold text-primary" onClick={() => setSearchQuery(searchDidYouMean)}>{searchDidYouMean}</button>?</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-2">
                    <MasterList
                      data={filteredData}
                      itemType={tab.value as MasterItemType | 'All'}
                      isAllItemsTab={tab.value === "All"}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItemAttempt}
                      fixedItemIds={ALL_FIXED_IDS}
                      searchActive={!!searchQuery}
                    />
                  </CardContent>
                  <CardFooter className="py-2">
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? `SHOWING ${filteredData.length} OF ${totalCount} ITEMS` : `TOTAL ITEMS: ${totalCount}`}
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
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
