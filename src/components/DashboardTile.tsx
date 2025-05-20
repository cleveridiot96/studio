
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';
import { 
  BarChart, DollarSign, Package, Users, LineChart, TrendingUp, ShoppingCart as DefaultShoppingCartIcon, TrendingDown, HelpCircle as FallbackIcon,
  ArrowLeftCircle, Treasure, // Import Treasure icon
  ArrowRightCircle, // Import Treasure icon
  BookOpen, 
  BookUser, 
  Users2, 
  DatabaseBackup, 
  LayoutGrid, 
  Boxes, 
  FileText, // Ensured FileText is imported
  Receipt, // Ensured Receipt is here
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';
import React from 'react';

// Icon mapping
const iconMap: Record<string, ComponentType<LucideProps>> = {
  BarChart, 
  DollarSign, 
  Package, // Used for Inventory tile
  Users, // Used for Master Data tile (originally Users2)
  LineChart, 
  TrendingUp, 
  ShoppingCart: DefaultShoppingCartIcon,
  TrendingDown, 
  Receipt, // Used for Sales tile
  Boxes, // Generic, not currently used directly by a specific tile but available
  FileText, // Added FileText to map
  ArrowRightCircle, // Used for Payments tile
  ArrowLeftCircle, // Used for Receipts tile
  BookOpen, // Used for Cash Book tile
  BookUser, // Used for Ledger tile
  Users2, // Available, Master Data uses Users for simplicity now
  DatabaseBackup,
  LayoutGrid, // Used for Dashboard tile 
  ArrowRightLeft, // Used for Location Transfer tile // Add Treasure to map
};


interface DashboardTileProps {
  title: string;
  iconName: string; 
  href: string;
  description?: string;
  className?: string; // Will carry background and text color classes
}

const DashboardTileComponent: React.FC<DashboardTileProps> = ({ title, iconName, href, description, className }) => {
  const Icon = iconMap[iconName] || FallbackIcon;
  return (
    <Link href={href} className="block group h-full">
      <Card className={cn(
        "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
        "rounded-xl p-6 flex flex-col items-center text-center justify-center h-full min-h-[180px]", // Added min-h
        className 
      )}>
        <Icon className="h-10 w-10 mb-3" /> {/* Adjusted icon size and margin */}
        <CardTitle className="text-xl font-semibold mb-1">{title}</CardTitle> {/* Increased title font */}
        {description && <p className="text-sm opacity-90">{description}</p>}
      </Card>
    </Link>
  );
}

export const DashboardTile = React.memo(DashboardTileComponent);
