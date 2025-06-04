
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar"; 

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
  const { state: sidebarState } = useSidebar(); 

  return (
    <SidebarMenu className="p-2 space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")) || (item.href === "/dashboard" && pathname === "/");
        const IconComponent = iconMap[item.iconName] || FallbackIcon;

        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.title}
                className={cn(
                  "relative flex items-center h-auto transition-transform duration-200 ease-in-out group transform hover:scale-[1.02]",
                  sidebarState === 'collapsed'
                    ? "w-12 h-12 justify-center rounded-lg" // Square button for collapsed
                    : "w-full justify-start px-3 py-2.5 rounded-md", // Full width for expanded
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg scale-[1.03]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {/* Icon Circle Div - consistent size, different bg/text based on state */}
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors",
                  sidebarState === 'expanded' && "mr-3", 
                  isActive && sidebarState === 'collapsed'
                    ? "bg-sidebar-primary-foreground text-sidebar-primary" // Collapsed Active
                    : isActive && sidebarState === 'expanded'
                      ? "bg-sidebar-primary-foreground text-sidebar-primary" // Expanded Active
                      : item.iconColor ? `${item.iconColor} text-white` : "bg-sidebar-accent text-sidebar-accent-foreground" // Inactive (collapsed or expanded)
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>

                {/* Text Span - hidden when collapsed */}
                <span className={cn(
                  "truncate text-sm", // Adjusted text size
                  sidebarState === 'collapsed' && "hidden",
                  isActive ? "font-semibold" : "font-medium" // Slightly bolder for active
                )}>
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

    