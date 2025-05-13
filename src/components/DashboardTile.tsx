import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';
import { 
  BarChart, DollarSign, Package, Users, LineChart, TrendingUp, ShoppingCart as DefaultShoppingCartIcon, TrendingDown as DefaultTrendingDownIcon, HelpCircle as FallbackIcon,
  ArrowLeftCircle as DefaultArrowLeftCircleIcon, // Added import for ArrowLeftCircle
  ArrowRightCircle as DefaultArrowRightCircleIcon, // Added import for ArrowRightCircle for completeness
  BookOpen as DefaultBookOpenIcon, // Added import for BookOpen
  BookUser as DefaultBookUserIcon, // Added import for BookUser
  Users2 as DefaultUsers2Icon, // Added import for Users2
  DatabaseBackup as DefaultDatabaseBackupIcon, // Added import for DatabaseBackup
  LayoutGrid as DefaultLayoutGridIcon, // Added import for LayoutGrid
  Boxes as DefaultBoxesIcon, // Added import for Boxes
  FileText as DefaultFileTextIcon, // Added import for FileText
  Receipt as DefaultReceiptIcon // Added import for Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';

// Icon mapping
const iconMap: Record<string, ComponentType<LucideProps>> = {
  BarChart, // Already directly imported and used
  DollarSign, // Already directly imported and used
  Package, // Already directly imported and used
  Users, // Already directly imported and used
  LineChart, // Already directly imported and used
  TrendingUp, // Already directly imported and used
  ShoppingCart: DefaultShoppingCartIcon,
  TrendingDown: DefaultTrendingDownIcon,
  Receipt: DefaultReceiptIcon, 
  Boxes: DefaultBoxesIcon,
  FileText: DefaultFileTextIcon,
  ArrowRightCircle: DefaultArrowRightCircleIcon,
  ArrowLeftCircle: DefaultArrowLeftCircleIcon, // Corrected mapping
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

export function DashboardTile({ title, value, iconName, href, description, className, valueClassName }: DashboardTileProps) {
  const Icon = iconMap[iconName] || FallbackIcon;
  return (
    <Link href={href} className="block group">
      <Card className={cn(
        "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
        "bg-card text-card-foreground border-border rounded-xl overflow-hidden",
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4 sm:px-6">
          <CardTitle className="text-xl font-semibold text-primary">{title}</CardTitle>
          <Icon className="h-8 w-8 text-accent opacity-80 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="pb-4 px-4 sm:px-6">
          <div className={cn("text-5xl font-bold text-foreground group-hover:text-primary transition-colors", valueClassName)}>
            {value}
          </div>
          {description && <p className="text-sm text-muted-foreground pt-1">{description}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

