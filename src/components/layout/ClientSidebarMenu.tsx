
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"; // Import useSidebar
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


import {
  LayoutGrid,
  ShoppingCart,
  Receipt,
  Boxes,
  FileText,
  ArrowRightCircle,
  ArrowLeftCircle,
  BookOpen,
  BookUser,
  Users2,
  DatabaseBackup,
  TrendingDown,
  HelpCircle as FallbackIcon,
  ArrowRightLeft,
  ClipboardList,
  Rocket,
  BookCopy,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  LayoutGrid,
  ShoppingCart,
  Receipt,
  Boxes,
  FileText,
  ArrowRightCircle,
  ArrowLeftCircle,
  BookOpen,
  BookUser,
  Users2,
  DatabaseBackup,
  TrendingDown,
  ArrowRightLeft,
  ClipboardList,
  Rocket,
  BookCopy,
};

interface ClientSidebarMenuProps {
  navItems: NavItem[];
}

export function ClientSidebarMenu({ navItems }: ClientSidebarMenuProps) {
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar(); 

  return (
    <SidebarMenu className="p-2 space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)) || (item.href === "/dashboard" && pathname === "/");
        const IconComponent = iconMap[item.iconName] || FallbackIcon;

        const buttonContent = (
          <>
            <div className={cn( // Icon circle
                "flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors",
                sidebarState === 'expanded' && "mr-3",
                isActive 
                    ? "bg-sidebar-primary-foreground text-sidebar-primary"
                    : item.iconColor ? `${item.iconColor} ${item.textColor || 'text-white'}` : "bg-sidebar-accent text-sidebar-accent-foreground"
            )}>
              <IconComponent className="h-5 w-5" />
            </div>
            <span className={cn( // Text
                "truncate text-sm",
                // Use sr-only for collapsed state to hide text but keep it accessible
                sidebarState === 'collapsed' && "sr-only", 
                isActive ? "font-semibold" : "font-medium"
            )}>
              {item.title}
            </span>
          </>
        );

        return (
          <SidebarMenuItem key={item.href}>
             <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center transition-colors duration-150 ease-in-out group focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background",
                    "text-sidebar-foreground hover:text-sidebar-accent-foreground rounded-md",
                    sidebarState === 'collapsed'
                      ? "w-10 h-10 justify-center" // Centered square for the <a> tag (Link)
                      : "w-full justify-start px-2.5 py-2", // Expanded state styles
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "hover:bg-sidebar-accent"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {buttonContent}
                </Link>
              </TooltipTrigger>
              {sidebarState === 'collapsed' && (
                <TooltipContent side="right" align="center" className="ml-1">
                  <p>{item.title}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
