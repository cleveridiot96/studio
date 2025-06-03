
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
                  "w-full justify-center text-base group items-center px-4 py-2 h-auto", // Changed justify-start to justify-center
                  "transition-all duration-200 ease-in-out",
                  isActive
                    ? "rounded-full bg-primary shadow-md hover:scale-105" 
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full mr-3 shrink-0", 
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
