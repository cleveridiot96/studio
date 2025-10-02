
"use client";

import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { navItems, APP_NAME, APP_ICON } from "@/lib/config/nav";
import Link from "next/link";
import { Menu, Home, Settings as SettingsIcon, Landmark, CalculatorIcon } from "lucide-react";
import { ClientSidebarMenu } from "@/components/layout/ClientSidebarMenu";
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontEnhancer } from "@/components/layout/FontEnhancer";
import { FormatButton } from "@/components/layout/FormatButton";
import { FinancialYearToggle } from "@/components/layout/FinancialYearToggle";
import { AppExitHandler } from '@/components/layout/AppExitHandler';
import React, { useEffect, useCallback, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/shared/SearchBar';
import { initSearchEngine } from '@/lib/searchEngine';
import { buildSearchData } from '@/lib/buildSearchData';
import type { Purchase, Sale, Payment, Receipt, MasterItem, LocationTransfer } from '@/lib/types';
import ErrorBoundary from "@/components/ErrorBoundary";
import { Calculator } from '@/components/shared/Calculator';
import { MasterDataProvider, useMasterData } from '@/contexts/MasterDataContext';

const LOCAL_STORAGE_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  locationTransfers: 'locationTransfersData',
};


function SearchDataProvider({ children }: { children: React.ReactNode }) {
  const { getAllMasters } = useMasterData();

  useEffect(() => {
    const reindexData = () => {
      try {
        const purchases = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.purchases) || '[]') as Purchase[];
        const sales = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.sales) || '[]') as Sale[];
        const payments = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.payments) || '[]') as Payment[];
        const receipts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.receipts) || '[]') as Receipt[];
        const locationTransfers = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.locationTransfers) || '[]') as LocationTransfer[];
        
        const allMasters = getAllMasters();

        const searchDataset = buildSearchData({
          sales, purchases, payments, receipts, masters: allMasters, locationTransfers
        });
        initSearchEngine(searchDataset);
      } catch (error) {
        console.error("Error re-indexing search data:", error);
      }
    };

    reindexData();
    window.addEventListener('reindex-search', reindexData);
    return () => {
      window.removeEventListener('reindex-search', reindexData);
    };
  }, [getAllMasters]);

  return <>{children}</>;
}


function AppHeaderContentInternal() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  return (
    <>
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" aria-label="Home">
          <Home className="h-5 w-5 text-foreground" />
        </Button>
      </Link>
      <SearchBar />
      <FinancialYearToggle />
      <Link href="/balance-sheet">
        <Button variant="outline">
            <Landmark className="mr-2 h-4 w-4"/>
            FINANCIAL SUMMARY
        </Button>
      </Link>
      <Button variant="ghost" size="icon" aria-label="Open Calculator" onClick={() => setIsCalculatorOpen(true)}>
        <CalculatorIcon className="h-5 w-5 text-foreground" />
      </Button>
      <Calculator isVisible={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <SettingsIcon className="h-5 w-5 text-foreground" />
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

function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const AppIcon = APP_ICON;
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isTyping =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;
    
    if (isTyping) return;
    if (!event.altKey) return;

    const key = event.key.toLowerCase();
    
    if (event.shiftKey) {
        switch(key) {
            case 'p': event.preventDefault(); router.push('/payments'); break;
            case 'a': event.preventDefault(); router.push('/profit-analysis'); break;
            default: break;
        }
        return;
    }
    
    if (event.ctrlKey || event.metaKey) return;

    switch (key) {
      case 'p': event.preventDefault(); router.push('/purchases'); break;
      case 's': event.preventDefault(); router.push('/sales'); break;
      case 'l': event.preventDefault(); router.push('/location-transfer'); break;
      case 'r': event.preventDefault(); router.push('/receipts'); break;
      case 'i': event.preventDefault(); router.push('/inventory'); break;
      case 'k': event.preventDefault(); router.push('/ledger'); break;
      case 'a': event.preventDefault(); router.push('/accounts-ledger'); break;
      case 'c': event.preventDefault(); router.push('/cashbook'); break;
      case 'd': event.preventDefault(); router.push('/daybook'); break;
      case 'o': event.preventDefault(); router.push('/outstanding'); break;
      case 'm': event.preventDefault(); router.push('/masters'); break;
      case 'b': 
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('trigger-backup'));
        break;
      case 'v': 
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('trigger-restore'));
        break;
      default: break;
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);


  return (
    <>
        <div className="flex flex-1 bg-background">
          <Sidebar className="border-r border-sidebar-border shadow-lg print:hidden" collapsible="icon">
            <SidebarHeader className="p-2 border-b border-sidebar-border">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <AppIcon className="w-8 h-8 text-sidebar-primary group-hover:animate-pulse" />
                <h1 className="text-xl font-bold text-sidebar-foreground group-data-[state=collapsed]:hidden">
                  {APP_NAME}
                </h1>
              </Link>
            </SidebarHeader>
            <SidebarContent className="py-2">
              <ClientSidebarMenu navItems={navItems} />
            </SidebarContent>
            <SidebarFooter className="p-2 border-t border-sidebar-border">
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-col flex-1 min-h-0 relative">
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 sm:px-4 shadow-sm print:hidden">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden -ml-2">
                  <Menu className="h-6 w-6 text-foreground" />
                </SidebarTrigger>
                <SidebarTrigger className="hidden md:flex">
                  <Menu className="h-6 w-6 text-foreground" />
                </SidebarTrigger>
              </div>
              <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
                <AppHeaderContentInternal />
              </div>
            </header>
            <LoadingBarInternal />
            <SidebarInset className="flex-1 overflow-y-auto p-2 sm:p-2 w-full print:p-0 print:m-0 print:overflow-visible flex flex-col">
              <ErrorBoundary>
                <div className="flex flex-col flex-1 w-full min-w-0">
                    {children}
                </div>
              </ErrorBoundary>
            </SidebarInset>
          </div>
        </div>
    </>
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
          <MasterDataProvider>
            <SidebarProvider defaultOpen={false} collapsible="icon">
                <AppExitHandler />
                <SearchDataProvider>
                  <AppLayoutInternal>{children}</AppLayoutInternal>
                </SearchDataProvider>
                <Toaster />
            </SidebarProvider>
          </MasterDataProvider>
        </SettingsProvider>
    );
}
