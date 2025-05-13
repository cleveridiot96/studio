import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { navItems, APP_NAME, APP_ICON } from "@/lib/config/nav";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { ClientSidebarMenu } from "@/components/layout/ClientSidebarMenu"; // Updated import
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const AppIcon = APP_ICON;

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <Sidebar className="border-r border-sidebar-border shadow-lg"> {/* Sidebar bg is controlled by its own CSS vars */}
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
             <div className="flex items-center gap-3 group-data-[state=collapsed]:justify-center">
                <Avatar className="h-10 w-10 border-2 border-sidebar-primary">
                    <AvatarImage src="https://picsum.photos/100/100" alt="User" data-ai-hint="farmer person" />
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">KB</AvatarFallback>
                </Avatar>
                <div className="group-data-[state=collapsed]:hidden">
                    <p className="text-sm font-medium text-sidebar-foreground">Kisan Bhai</p>
                    <p className="text-xs text-sidebar-foreground/70">Admin</p>
                </div>
             </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex flex-col flex-1">
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 shadow-md">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden -ml-2"> {/* Mobile menu trigger visible on md and below */}
                <Menu className="h-7 w-7 text-foreground" />
              </SidebarTrigger>
               <SidebarTrigger className="hidden md:flex"> {/* Desktop menu trigger visible on md and up */}
                 <Menu className="h-7 w-7 text-foreground" />
              </SidebarTrigger>
            </div>
            {/* Page title can be dynamically set using a shared state or context if needed */}
            {/* <h2 className="text-xl font-semibold text-foreground hidden sm:block"> 
              Welcome
            </h2> */}
            <div>
              {/* Additional header actions like notifications, user menu dropdown */}
            </div>
          </header>
          <SidebarInset className="p-4 sm:p-6 lg:p-8 flex-1 overflow-auto">
            {children}
          </SidebarInset>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
