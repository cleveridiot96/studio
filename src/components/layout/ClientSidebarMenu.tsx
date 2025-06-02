
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
  FileText, // Kept for DashboardTile compatibility, though Stock Report nav item changes
  ArrowRightCircle,
  ArrowLeftCircle,
  BookOpen,
  BookUser,
  Users2,
  DatabaseBackup,
  TrendingDown, // Kept if used elsewhere, or if previous icon for Stock Report on dashboard
  HelpCircle as FallbackIcon, // Default/fallback icon
  ArrowRightLeft,
  ClipboardList, // Added new icon for Stock Report in sidebar
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
  ClipboardList, // Mapped the new icon
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
                  "w-full justify-start text-base py-3 h-auto group", // Increased font size and padding, allow height to adjust
                  "transition-all duration-200 ease-in-out", // Smooth transitions
                  isActive
                    ? "rounded-full bg-primary px-4 py-2 shadow-md hover:scale-105" // Active styles with pop-up effect
                    : ""
                )}
              >
                <IconComponent className={cn(
                  "h-5 w-5 mr-3 shrink-0",
                  isActive
                    ? "text-primary-foreground" // Active: use primary foreground for contrast on primary background
                    : item.iconColor || "text-sidebar-foreground group-hover:text-sidebar-accent-foreground" // Not active: use defined iconColor, or fallback
                )} />
                <span className={cn(
                  "text-sidebar-foreground group-data-[state=collapsed]:hidden",
                  isActive
                    ? "text-primary-foreground font-semibold" // Text color and weight for active state
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
