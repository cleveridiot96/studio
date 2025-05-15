
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  Receipt as DefaultReceiptIcon 
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
};


interface DashboardTileProps {
  title: string;
  value: string | number;
  iconName: string; 
  href: string;
  description?: string;
  className?: string;
  valueClassName?: string;
}

const DashboardTileComponent: React.FC<DashboardTileProps> = ({ title, value, iconName, href, description, className, valueClassName }) => {
  const Icon = iconMap[iconName] || FallbackIcon;
  return (
    <Link href={href} className="block group">
      <Card className={cn(
        "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
        "bg-card text-card-foreground border-border rounded-xl overflow-hidden",
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4 sm:px-6">
          <CardTitle className="text-2xl font-semibold text-primary">{title}</CardTitle>
          <Icon className="h-10 w-10 text-accent opacity-80 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="pb-4 px-4 sm:px-6">
          <div className={cn("text-6xl font-bold text-foreground group-hover:text-primary transition-colors", valueClassName)}>
            {value}
          </div>
          {description && <p className="text-sm text-muted-foreground pt-1">{description}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

export const DashboardTile = React.memo(DashboardTileComponent);
