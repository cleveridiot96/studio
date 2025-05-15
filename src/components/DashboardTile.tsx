
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card'; // Removed CardHeader, CardContent
import type { LucideProps } from 'lucide-react';
import { 
  BarChart, DollarSign, Package, Users, LineChart, TrendingUp, ShoppingCart as DefaultShoppingCartIcon, TrendingDown, HelpCircle as FallbackIcon,
  ArrowLeftCircle as DefaultArrowLeftCircleIcon, 
  ArrowRightCircle as DefaultArrowRightCircleIcon, 
  BookOpen as DefaultBookOpenIcon, 
  BookUser as DefaultBookUserIcon, 
  Users2 as DefaultUsers2Icon, 
  DatabaseBackup as DefaultDatabaseBackupIcon, 
  LayoutGrid as DefaultLayoutGridIcon, 
  Boxes as DefaultBoxesIcon, 
  FileText as DefaultFileTextIcon, 
  Receipt as DefaultReceiptIcon,
  ArrowRightLeft, // Added for Location Transfer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';
import React from 'react';

// Icon mapping
const iconMap: Record<string, ComponentType<LucideProps>> = {
  BarChart, 
  DollarSign, 
  Package, 
  Users, 
  LineChart, 
  TrendingUp, 
  ShoppingCart: DefaultShoppingCartIcon,
  TrendingDown: TrendingDown,
  Receipt: DefaultReceiptIcon, 
  Boxes: DefaultBoxesIcon,
  FileText: DefaultFileTextIcon,
  ArrowRightCircle: DefaultArrowRightCircleIcon,
  ArrowLeftCircle: DefaultArrowLeftCircleIcon, 
  BookOpen: DefaultBookOpenIcon,
  BookUser: DefaultBookUserIcon,
  Users2: DefaultUsers2Icon,
  DatabaseBackup: DefaultDatabaseBackupIcon,
  LayoutGrid: DefaultLayoutGridIcon,
  ArrowRightLeft, // Added
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
        "rounded-xl p-6 flex flex-col items-center text-center justify-center h-full", // Centering content
        className // This will carry custom background and text color, e.g., "bg-purple-600 text-white"
      )}>
        <Icon className="h-12 w-12 mb-4" /> {/* Icon styling for better visibility and white text */}
        <CardTitle className="text-xl font-semibold mb-1">{title}</CardTitle>
        {description && <p className="text-sm opacity-90">{description}</p>}
      </Card>
    </Link>
  );
}

export const DashboardTile = React.memo(DashboardTileComponent);
