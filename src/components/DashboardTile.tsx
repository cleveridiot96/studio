
"use client";

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
  Receipt,
  ArrowRightLeft,
  Rocket, // For Profit Analysis
  FileJson,
  UploadCloud,
  BookCopy,
  ClipboardList,
  BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';
import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  BookCopy,
  ClipboardList,
  BookMarked,
};

interface DashboardTileProps {
  title: string;
  iconName: string;
  href?: string;
  description?: string;
  className?: string;
  onClick?: () => void;
  shortcut?: string;
}

const DashboardTileComponent: React.FC<DashboardTileProps> = ({ title, iconName, href, description, className, onClick, shortcut }) => {
  const Icon = iconMap[iconName] || FallbackIcon;

  const cardContent = (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="h-full w-full"
    >
        <Card className={cn(
          "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
          "rounded-xl p-3 flex flex-col items-center text-center justify-center h-full min-h-[120px]",
          className
        )}>
          <Icon className="h-7 w-7 mb-2" />
          <CardTitle className="text-base font-semibold mb-1 uppercase">{title}</CardTitle>
          {description && <p className="text-xs opacity-80 uppercase">{description}</p>}
        </Card>
    </motion.div>
  );

  const tile = (
      <>
        {onClick ? (
          <button onClick={onClick} className="block group h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl">
            {cardContent}
          </button>
        ) : href ? (
          <Link href={href} className="block group h-full">
            {cardContent}
          </Link>
        ) : (
          <div className="block group h-full">{cardContent}</div>
        )}
      </>
  );

  return (
    <TooltipProvider delayDuration={750}>
      <Tooltip>
        <TooltipTrigger asChild>{tile}</TooltipTrigger>
        <TooltipContent>
            <p className="font-semibold">{title}</p>
            {shortcut && (
                <p className="text-muted-foreground">Shortcut: <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">{shortcut}</kbd></p>
            )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const DashboardTile = React.memo(DashboardTileComponent);
