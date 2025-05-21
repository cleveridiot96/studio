
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';
import {
  BarChart3,
  DollarSign,
  Package,
  Users,
  LineChart,
  TrendingUp,
  ShoppingCart as DefaultShoppingCartIcon,
  TrendingDown,
  HelpCircle as FallbackIcon,
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
  Rocket, // For Profit Analysis
  FileJson,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';
import React from 'react';

// Icon mapping
const iconMap: Record<string, ComponentType<LucideProps>> = {
  BarChart3,
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
  Rocket,
  FileJson,
  UploadCloud,
};


interface DashboardTileProps {
  title: string;
  iconName: string;
  href?: string; // Make href optional
  description?: string;
  className?: string;
  onClick?: () => void; // Add onClick prop
}

const DashboardTileComponent: React.FC<DashboardTileProps> = ({ title, iconName, href, description, className, onClick }) => {
  const Icon = iconMap[iconName] || FallbackIcon;

  const cardContent = (
    <Card className={cn(
      "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
      "rounded-xl p-4 flex flex-col items-center text-center justify-center h-full min-h-[150px]",
      className
    )}>
      <Icon className="h-8 w-8 mb-2" />
      <CardTitle className="text-lg font-semibold mb-1">{title}</CardTitle>
      {description && <p className="text-sm opacity-90">{description}</p>}
    </Card>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="block group h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl">
        {cardContent}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} className="block group h-full">
        {cardContent}
      </Link>
    );
  }

  // Fallback if neither onClick nor href is provided (though one should always be)
  return <div className="block group h-full">{cardContent}</div>;
}

export const DashboardTile = React.memo(DashboardTileComponent);
