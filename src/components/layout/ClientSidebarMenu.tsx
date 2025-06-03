
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
  Rocket,
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
  Rocket,
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
                  "w-full relative text-base group items-center py-2 h-auto", // Removed justify-center, px-4. Added relative.
                  "transition-all duration-200 ease-in-out",
                  isActive
                    ? "bg-primary shadow-md hover:scale-105 rounded-md" // Changed from rounded-full
                    : "hover:bg-sidebar-accent/50 rounded-md" // Ensured rounded-md for consistency
                )}
              >
                <div className={cn(
                  "absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2", // Centering the icon circle
                  "flex items-center justify-center h-8 w-8 rounded-full shrink-0", // Removed mr-3
                  isActive ? "bg-primary-foreground" : item.iconColor || "bg-sidebar-accent"
                )}>
                  <IconComponent className={cn(
                    "h-5 w-5", 
                    isActive
                      ? "text-primary" 
                      : "text-white" 
                  )} />
                </div>
                <span className={cn(
                  "group-data-[state=collapsed]:hidden",
                  "pl-[calc(50%_+_1rem_+_4px)] pr-3 text-left", // Padding to clear centered icon + gap, and right padding for text
                  isActive
                    ? "text-primary-foreground font-semibold"
                    : "text-slate-50 group-hover:text-sidebar-accent-foreground"
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
