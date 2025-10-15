"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent } from "@/components/ui/sidebar";
import { navItems } from "@/lib/config/nav";
import { Menu } from "lucide-react";
import { ClientSidebarMenu } from "@/components/layout/ClientSidebarMenu";
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { AppExitHandler } from '@/components/layout/AppExitHandler';
import SearchBar from '@/components/shared/SearchBar';
import { initSearchEngine } from '@/lib/searchEngine';
import { buildSearchData } from '@/lib/buildSearchData';
import type { Purchase, Sale, Payment, Receipt, LocationTransfer } from '@/lib/types';
import ErrorBoundary from "@/components/ErrorBoundary";
import { MasterDataProvider, useMasterData } from '@/contexts/MasterDataContext';
import { TransactionsProvider, useTransactions } from '@/hooks/useTransactions';
import { AppHeaderContentInternal } from "@/components/layout/AppHeaderContentInternal";
import { useHydrated } from "@/hooks/useHydrated";

const AUTH_KEYS = {
    IS_SETUP_COMPLETE: 'kisan_khata_is_setup_complete',
};

function SearchDataProvider({ children }: { children: React.ReactNode }) {
  const { getAllMasters } = useMasterData();
  const { sales, purchases, payments, receipts, locationTransfers } = useTransactions();

  useEffect(() => {
    const reindexData = () => {
      try {
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
  }, [getAllMasters, sales, purchases, payments, receipts, locationTransfers]);

  return <>{children}</>;
}


function LoadingBarInternal() {
  const { isAppHydrating } = useSettings();
  if (!isAppHydrating) return null;
  return <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />;
}

function AppLayoutInternal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isTyping =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;
    
    if (isTyping) return;

    if (event.altKey && event.key.toLowerCase() === 'n' && (window.location.pathname.includes('/masters'))) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('open-master-form'));
        return;
    }

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
    <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar className="border-r border-sidebar-border shadow-lg print:hidden" collapsible="icon">
          <SidebarHeader className="flex h-14 items-center justify-center p-2 border-b border-sidebar-border">
              <SidebarTrigger>
                <Menu className="h-6 w-6 text-sidebar-foreground" />
              </SidebarTrigger>
          </SidebarHeader>
          <SidebarContent className="py-2">
            <ClientSidebarMenu navItems={navItems} />
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
            <div className="flex flex-col flex-1 min-h-0 relative">
              <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 sm:px-4 shadow-sm print:hidden">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="md:hidden -ml-2">
                    <Menu className="h-6 w-6 text-foreground" />
                  </SidebarTrigger>
                </div>
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <AppHeaderContentInternal />
                </div>
              </header>
              <LoadingBarInternal />
              <main className="flex-1 overflow-y-auto p-2 sm:p-2 w-full print:p-0 print:m-0 print:overflow-visible">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
        </SidebarInset>
    </div>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
    const isHydrated = useHydrated();
    const router = useRouter();
    const [isSetupComplete] = useLocalStorageState(AUTH_KEYS.IS_SETUP_COMPLETE, false);
    
    useEffect(() => {
        if (isHydrated && !isSetupComplete) {
            router.replace('/setup');
        }
    }, [isSetupComplete, router, isHydrated]);

    if (!isHydrated || !isSetupComplete) {
        return (
             <div className="flex h-screen w-screen items-center justify-center bg-background">
                <p className="text-muted-foreground">Checking application setup...</p>
            </div>
        );
    }

    return (
        <SettingsProvider>
          <MasterDataProvider>
            <TransactionsProvider>
              <SidebarProvider defaultOpen={false} collapsible="icon">
                  <AppExitHandler />
                  <SearchDataProvider>
                    <AppLayoutInternal>{children}</AppLayoutInternal>
                  </SearchDataProvider>
                  <Toaster />
              </SidebarProvider>
            </TransactionsProvider>
          </MasterDataProvider>
        </SettingsProvider>
    );
}
