
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

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
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

// Map icon names to components
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
};

interface ClientSidebarMenuProps {
  navItems: NavItem[];
}

export function ClientSidebarMenu({ navItems }: ClientSidebarMenuProps) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) || (item.href === "/dashboard" && pathname === "/dashboard");
        const IconComponent = iconMap[item.iconName] || FallbackIcon;

        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.title}
                className={cn(
                  "w-full justify-start text-base py-3 h-auto group", 
                  "transition-all duration-200 ease-in-out", 
                  isActive
                    ? "rounded-full bg-primary px-4 py-2 shadow-md hover:scale-105" 
                    : ""
                )}
              >
                <IconComponent className={cn(
                  "h-6 w-6 mr-3 shrink-0", // Increased icon size to h-6 w-6
                  isActive
                    ? "text-primary-foreground" 
                    : item.iconColor || "text-sidebar-foreground group-hover:text-sidebar-accent-foreground" 
                )} />
                <span className={cn(
                  "text-sidebar-foreground group-data-[state=collapsed]:hidden",
                  isActive
                    ? "text-primary-foreground font-semibold" 
                    : "group-hover:text-sidebar-accent-foreground"
                )}
                >
                  {item.title}
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
