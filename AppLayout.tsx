"use client";

import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { navItems, APP_NAME, APP_ICON } from "@/lib/config/nav";
import Link from "next/link";
import { Menu, Home, Settings as SettingsIcon } from "lucide-react";
import { ClientSidebarMenu } from "@/components/layout/ClientSidebarMenu";
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontEnhancer } from "@/components/layout/FontEnhancer";
import { FormatButton } from "@/components/layout/FormatButton";
import { FinancialYearToggle } from "@/components/layout/FinancialYearToggle";
import { AppExitHandler } from '@/components/layout/AppExitHandler';
import React, { useEffect } from "react";
import SearchBar from '@/components/shared/SearchBar';
import { initSearchEngine } from '@/lib/searchEngine';
import { buildSearchData } from '@/lib/buildSearchData';
import type { Purchase, Sale, Payment, Receipt, MasterItem, LocationTransfer } from '@/lib/types';

// Define the keys for data stored in localStorage
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


function AppHeaderContent() {
  return (
    <>
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" aria-label="Home">
          <Home className="h-6 w-6 text-foreground" />
        </Button>
      </Link>
      <SearchBar />
      <FinancialYearToggle />
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

function LoadingBar() {
  "use client";
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const BarContent = () => {
    const { isAppHydrating } = useSettings();
    if (!isAppHydrating) return null;
    return <div className="w-full h-1 bg-primary animate-pulse" />;
  };

  if (!isMounted) {
    return null;
  }
  return <BarContent />;
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isAppLayoutMounted, setIsAppLayoutMounted] = React.useState(false);

  useEffect(() => {
    setIsAppLayoutMounted(true);
    // Initialize search engine on client mount
    if (typeof window !== 'undefined') {
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
      } catch (error) {
        console.error("Error initializing search engine:", error);
        // Handle the error appropriately, e.g., display a message to the user
        // or load with empty data sets.
      }
    }
  }, []);

  const AppIcon = APP_ICON;

  return (
    <SettingsProvider>
      <SidebarProvider defaultOpen={false} collapsible="icon">
        <AppExitHandler />
        <div className="flex flex-col h-screen bg-background">
          <Sidebar className="border-r border-sidebar-border shadow-lg overflow-y-auto print:hidden" collapsible="icon">
            <SidebarHeader className="p-4 border-b border-sidebar-border">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <AppIcon className="w-9 h-9 text-sidebar-primary group-hover:animate-pulse" />
                <h1 className="text-2xl font-bold text-sidebar-foreground group-data-[state=collapsed]:hidden">
                  {APP_NAME}
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent className="py-2 overflow-y-auto">
              <ClientSidebarMenu navItems={navItems} />
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-sidebar-border">
              {/* User profile section removed */}
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-col flex-1 min-h-0">
            <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 shadow-md print:hidden">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden -ml-2">
                  <Menu className="h-7 w-7 text-foreground" />
                </SidebarTrigger>
                <SidebarTrigger className="hidden md:flex">
                  <Menu className="h-7 w-7 text-foreground" />
                </SidebarTrigger>
              </div>
              <div className="flex items-center gap-2 flex-1 justify-center">
                {isAppLayoutMounted && <AppHeaderContent />}
              </div>
            </header>
            {isAppLayoutMounted && <LoadingBar />}
            <SidebarInset className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full print:p-0 print:m-0 print:overflow-visible flex flex-col">
 <div className="flex flex-col flex-1 w-full">{children}</div>
            </SidebarInset>
          </div>
        </div>
        <Toaster />
      </SidebarProvider>
    </SettingsProvider>
  );
}