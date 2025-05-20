
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';
import { 
  BarChart, DollarSign, Package, Users, LineChart, TrendingUp, ShoppingCart as DefaultShoppingCartIcon, TrendingDown, HelpCircle as FallbackIcon,
  ArrowLeftCircle, 
  ArrowRightCircle, 
  BookOpen, 
  BookUser, 
  Users2, 
  DatabaseBackup, 
  LayoutGrid, 
  Boxes, 
  FileText, 
  Receipt, 
  ArrowRightLeft,
  // TreasureChest removed as it does not exist in lucide-react
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
  TrendingDown, 
  Receipt, 
  Boxes, 
  FileText, 
  ArrowRightCircle, 
  ArrowLeftCircle, 
  BookOpen, 
  BookUser, 
  Users2, 
  DatabaseBackup,
  LayoutGrid,  
  ArrowRightLeft,
  // TreasureChest mapping removed
};


interface DashboardTileProps {
  title: string;
  iconName: string; 
  href: string;
  description?: string;
  className?: string; 
}

const DashboardTileComponent: React.FC<DashboardTileProps> = ({ title, iconName, href, description, className }) => {
  const Icon = iconMap[iconName] || FallbackIcon;
  return (
    <Link href={href} className="block group h-full">
      <Card className={cn(
        "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
        "rounded-xl p-6 flex flex-col items-center text-center justify-center h-full min-h-[180px]", 
        className 
      )}>
        <Icon className="h-10 w-10 mb-3" /> 
        <CardTitle className="text-xl font-semibold mb-1">{title}</CardTitle> 
        {description && <p className="text-sm opacity-90">{description}</p>}
      </Card>
    </Link>
  );
}

export const DashboardTile = React.memo(DashboardTileComponent);
