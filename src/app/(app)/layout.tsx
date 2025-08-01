
"use client";

import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { navItems, APP_NAME, APP_ICON } from "@/lib/config/nav";
import Link from "next/link";
import { Menu, Home, Settings as SettingsIcon, Landmark, Calculator } from "lucide-react";
import { ClientSidebarMenu } from "@/components/layout/ClientSidebarMenu";
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontEnhancer } from "@/components/layout/FontEnhancer";
import { FormatButton } from "@/components/layout/FormatButton";
import { FinancialYearToggle } from "@/components/layout/FinancialYearToggle";
import { AppExitHandler } from '@/components/layout/AppExitHandler';
import React, { useEffect, useCallback, useState } from "react";
import SearchBar from '@/components/shared/SearchBar';
import { initSearchEngine } from '@/lib/searchEngine';
import { buildSearchData } from '@/lib/buildSearchData';
import type { Purchase, Sale, Payment, Receipt, MasterItem, LocationTransfer } from '@/lib/types';
import ErrorBoundary from "@/components/ErrorBoundary";
import { CalculatorDialog } from '@/components/shared/Calculator';
import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { motion } from "framer-motion";

const LOCAL_STORAGE_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  locationTransfers: 'locationTransfersData',
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  warehouses: 'masterWarehouses',
  brokers: 'masterBrokers',
};

const useSearchData = () => {
  const [searchData, setSearchData] = React.useState<any[]>([]);

  const reindexData = useCallback(() => {
    try {
      const purchases = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.purchases) || '[]') as Purchase[];
      const sales = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.sales) || '[]') as Sale[];
      const payments = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.payments) || '[]') as Payment[];
      const receipts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.receipts) || '[]') as Receipt[];
      const locationTransfers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.locationTransfers) || '[]') as LocationTransfer[];
      
      const masterCustomers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.customers) || '[]') as MasterItem[];
      const masterSuppliers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.suppliers) || '[]') as MasterItem[];
      const masterAgents = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.agents) || '[]') as MasterItem[];
      const masterTransporters = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.transporters) || '[]') as MasterItem[];
      const masterWarehouses = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.warehouses) || '[]') as MasterItem[];
      const masterBrokers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.brokers) || '[]') as MasterItem[];
      
      const allMasters = [
        ...masterCustomers, ...masterSuppliers, ...masterAgents,
        ...masterTransporters, ...masterWarehouses, ...masterBrokers
      ];

      const searchDataset = buildSearchData({
        sales, purchases, payments, receipts, masters: allMasters, locationTransfers
      });
      initSearchEngine(searchDataset);
      setSearchData(searchDataset); // Trigger re-render if needed
    } catch (error) {
      console.error("Error re-indexing search data:", error);
    }
  }, []);

  useEffect(() => {
    reindexData();
    window.addEventListener('reindex-search', reindexData);
    return () => {
      window.removeEventListener('reindex-search', reindexData);
    };
  }, [reindexData]);

  return searchData;
};

function AppHeaderContentInternal() {
  return (
    <>
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" aria-label="Home">
          <Home className="h-6 w-6 text-foreground" />
        </Button>
      </Link>
      <SearchBar />
      <FinancialYearToggle />
      <Link href="/balance-sheet">
        <Button variant="outline">
            <Landmark className="mr-2 h-4 w-4"/>
            Financial Summary
        </Button>
      </Link>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <SettingsIcon className="h-6 w-6 text-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 space-y-4" align="end">
          <FontEnhancer />
          <FormatButton />
        </PopoverContent>
      </Popover>
    </>
  );
}

function LoadingBarInternal() {
  const { isAppHydrating } = useSettings();
  if (!isAppHydrating) return null;
  return <div className="w-full h-1 bg-primary animate-pulse" />;
}

const DraggableFab = ({ onOpen }: { onOpen: () => void }) => {
    const [position, setPosition] = useLocalStorageState({ x: 0, y: 0 }, 'calculatorFabPosition');
    const fabRef = React.useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== 'undefined') {
            setPosition(prev => ({
                x: prev.x === 0 ? window.innerWidth - 88 : prev.x,
                y: prev.y === 0 ? window.innerHeight - 88 : prev.y
            }));
        }
    }, [setPosition]);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'draggable-calculator-fab',
    });
    
    if (!isMounted) return null;
    
    const style = transform ? {
        transform: `translate3d(${position.x + transform.x}px, ${position.y + transform.y}px, 0)`,
    } : {
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    };
    
    return (
        <motion.div
            ref={setNodeRef as any}
            style={style}
            {...attributes}
            {...listeners}
            className="fixed top-0 left-0 z-50 print:hidden"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
        >
            <Button
                ref={fabRef as any}
                size="icon"
                className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                onClick={onOpen}
            >
                <Calculator className="h-8 w-8" />
            </Button>
        </motion.div>
    );
};


function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const AppIcon = APP_ICON;
  useSearchData(); 

  const [calculatorPosition, setCalculatorPosition] = useLocalStorageState({ x: 0, y: 0 }, 'calculatorPosition');
  const [isMounted, setIsMounted] = useState(false);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (active.id === 'draggable-calculator') {
        setCalculatorPosition(prev => ({ x: prev.x + delta.x, y: prev.y + delta.y }));
    }
  };

  useEffect(() => {
      setIsMounted(true);
      if (typeof window !== 'undefined') {
        setCalculatorPosition(prev => ({
            x: prev.x === 0 ? window.innerWidth / 2 - 160 : prev.x, // Center it initially
            y: prev.y === 0 ? 100 : prev.y
        }));
      }
  }, [setCalculatorPosition]);

  return (
    <DndContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 bg-background">
          <Sidebar className="border-r border-sidebar-border shadow-lg print:hidden" collapsible="icon">
            <SidebarHeader className="p-4 border-b border-sidebar-border">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <AppIcon className="w-9 h-9 text-sidebar-primary group-hover:animate-pulse" />
                <h1 className="text-2xl font-bold text-sidebar-foreground group-data-[state=collapsed]:hidden">
                  {APP_NAME}
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent className="py-2">
              <ClientSidebarMenu navItems={navItems} />
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-sidebar-border">
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-col flex-1 min-h-0 relative">
            <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 shadow-md print:hidden">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden -ml-2">
                  <Menu className="h-7 w-7 text-foreground" />
                </SidebarTrigger>
                <SidebarTrigger className="hidden md:flex">
                  <Menu className="h-7 w-7 text-foreground" />
                </SidebarTrigger>
              </div>
              <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
                <AppHeaderContentInternal />
              </div>
            </header>
            <LoadingBarInternal />
            <SidebarInset className="flex-1 overflow-y-auto p-2 w-full print:p-0 print:m-0 print:overflow-visible flex flex-col">
              <ErrorBoundary>
                <div className="flex flex-col flex-1 w-full min-w-0">
                    {children}
                </div>
              </ErrorBoundary>
            </SidebarInset>
           
            {isMounted && (
                <>
                    <DraggableFab onOpen={() => setIsCalculatorOpen(true)} />
                    <CalculatorDialog
                        isOpen={isCalculatorOpen}
                        onOpenChange={setIsCalculatorOpen}
                        position={calculatorPosition}
                    />
                </>
            )}
          </div>
        </div>
    </DndContext>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isAppLayoutMounted, setIsAppLayoutMounted] = React.useState(false);
    
    useEffect(() => {
        setIsAppLayoutMounted(true);
    }, []);

    if (!isAppLayoutMounted) {
        return null;
    }

    return (
        <SettingsProvider>
            <SidebarProvider defaultOpen={true} collapsible="icon">
                <AppExitHandler />
                <AppLayoutInternal>{children}</AppLayoutInternal>
                <Toaster />
            </SidebarProvider>
        </SettingsProvider>
    );
}

