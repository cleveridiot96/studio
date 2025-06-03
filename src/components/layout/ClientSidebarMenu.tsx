
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar"; // Import useSidebar

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
  const { state: sidebarState } = useSidebar(); // Get sidebar state

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
                  // Base styles for the <a> tag
                  "w-full relative text-base group flex items-center py-2 h-auto transition-colors duration-200 ease-in-out",
                  // Conditional horizontal alignment for the <a> tag's content (the <button>)
                  sidebarState === 'collapsed' ? "justify-center" : "justify-start px-2",
                  isActive
                    ? "bg-primary shadow-md hover:scale-105 rounded-md"
                    : "hover:bg-sidebar-accent/50 rounded-md"
                )}
              >
                {/* Icon Circle Div - always present */}
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                  // Margin for expanded state to create space for text
                  sidebarState === 'expanded' && "mr-2.5", // Use state directly
                  isActive ? "bg-primary-foreground" : item.iconColor || "bg-sidebar-accent"
                )}>
                  <IconComponent className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-white"
                  )} />
                </div>

                {/* Text Span - hidden when collapsed */}
                <span className={cn(
                  sidebarState === 'collapsed' && "hidden", // Use state directly
                  isActive ? "text-primary-foreground font-semibold" : "text-slate-50 group-hover:text-sidebar-accent-foreground"
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
