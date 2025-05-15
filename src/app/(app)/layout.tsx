
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { navItems, APP_NAME, APP_ICON } from "@/lib/config/nav";
import Link from "next/link";
import { Menu, Home, Settings as SettingsIcon } from "lucide-react";
import { ClientSidebarMenu } from "@/components/layout/ClientSidebarMenu";
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontEnhancer } from "@/components/layout/FontEnhancer";
import { FormatButton } from "@/components/layout/FormatButton";
import { FinancialYearToggle } from "@/components/layout/FinancialYearToggle";
import { AppExitHandler } from '@/components/layout/AppExitHandler';


function AppHeaderContent() {
  // This component is created to use useSettings hook as AppLayout is a Server Component.
  // Alternatively, pass settings down as props.
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


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const AppIcon = APP_ICON;

  return (
    <SettingsProvider>
      <SidebarProvider defaultOpen={false}> {/* Changed defaultOpen to false */}
        <AppExitHandler />
        <div className="flex min-h-screen bg-background">
          <Sidebar className="border-r border-sidebar-border shadow-lg">
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
              {/* User profile section removed as per user request */}
            </SidebarFooter>
          </Sidebar>
          
          <div className="flex flex-col flex-1">
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
                <AppHeaderContent />
              </div>
            </header>
            <SidebarInset className="p-4 sm:p-6 lg:p-8 flex-1 overflow-auto">
              {children}
            </SidebarInset>
          </div>
        </div>
        <Toaster />
      </SidebarProvider>
    </SettingsProvider>
  );
}
