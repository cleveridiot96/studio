
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
import React from "react";

function AppHeaderContent() {
  // This component is rendered by AppLayout, which is "use client"
  return (
    <>
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" aria-label="Home">
          <Home className="h-6 w-6 text-foreground" />
        </Button>
      </Link>
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

// LoadingBar is a client component because it uses client-side hooks (useState, useEffect)
// and consumes a client-side context (useSettings).
function LoadingBar() {
  // "use client"; // Not strictly needed here as AppLayout (its parent) is already "use client"
  // and this function is defined within that client component's scope.
  // However, for clarity if it were a separate file, it would have "use client" at the top.
  
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Inner component to ensure useSettings is only called after isMounted is true.
  const BarContent = () => {
    const { isAppHydrating } = useSettings();
    if (!isAppHydrating) return null;
    return <div className="w-full h-1 bg-primary animate-pulse" />;
  };

  if (!isMounted) {
    return null; // Don't render anything on the server or before client mount.
  }

  return <BarContent />; // Render the content that uses the hook only when mounted.
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  // "use client"; // This is already at the top of the file
  const [isAppLayoutMounted, setIsAppLayoutMounted] = React.useState(false);
  React.useEffect(() => {
    setIsAppLayoutMounted(true);
  }, []);

  const AppIcon = APP_ICON;

  return (
    <SettingsProvider>
      <SidebarProvider defaultOpen={false} collapsible="icon">
        <AppExitHandler />
        <div className="flex h-screen bg-background">
          <Sidebar className="border-r border-sidebar-border shadow-lg overflow-y-auto" collapsible="icon">
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

          <div className="flex flex-col flex-1 h-full">
            <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 shadow-md">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden -ml-2">
                  <Menu className="h-7 w-7 text-foreground" />
                </SidebarTrigger>
                <SidebarTrigger className="hidden md:flex">
                  <Menu className="h-7 w-7 text-foreground" />
                </SidebarTrigger>
              </div>
              <div className="flex items-center gap-2">
                {isAppLayoutMounted && <AppHeaderContent />}{" "} {/* Ensure header content also waits for mount if it uses client hooks implicitly */}
              </div>
            </header>
            {isAppLayoutMounted && <LoadingBar />} 
            <SidebarInset className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full">
              {children}
            </SidebarInset>
          </div>
        </div>
        <Toaster />
      </SidebarProvider>
    </SettingsProvider>
  );
}
