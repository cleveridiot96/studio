
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
import type { ComponentType, CSSProperties } from 'react';
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

const tailwindColorMap: Record<string, string> = {
  'from-purple-500': '#a855f7', 'to-purple-700': '#6d28d9',
  'from-blue-500': '#3b82f6', 'to-blue-700': '#1d4ed8',
  'from-cyan-500': '#06b6d4', 'to-cyan-700': '#0e7490',
  'from-teal-500': '#14b8a6', 'to-teal-700': '#0f766e',
  'from-red-700': '#b91c1c', 'to-red-900': '#7f1d1d',
  'from-[#1beec7]': '#1beec7', 'to-[#14b8a6]': '#14b8a6',
  'from-pink-500': '#ec4899', 'to-pink-700': '#be185d',
  'from-[#ffa5ab]': '#ffa5ab', 'to-[#fb7185]': '#fb7185',
  'from-yellow-400': '#facc15', 'to-yellow-600': '#ca8a04',
  'from-green-400': '#4ade80', 'to-green-600': '#16a34a',
  'from-sky-500': '#0ea5e9', 'to-sky-700': '#0369a1',
  'from-sky-400': '#38bdf8', 'to-sky-600': '#0284c7',
  'from-emerald-400': '#34d399', 'to-emerald-600': '#059669',
  'from-red-500': '#ef4444', 'to-red-700': '#b91c1c',
  'from-green-500': '#22c55e', 'to-green-700': '#15803d',
};

const getGradientColorsFromClassName = (className?: string): { from: string, to: string } => {
    if (!className) return { from: '#3b82f6', to: '#1d4ed8' }; // Default blue

    const fromClass = className.split(' ').find(c => c.startsWith('from-'));
    const toClass = className.split(' ').find(c => c.startsWith('to-'));
    
    const fromColor = fromClass ? tailwindColorMap[fromClass] || '#3b82f6' : '#3b82f6';
    const toColor = toClass ? tailwindColorMap[toClass] || '#1d4ed8' : '#1d4ed8';

    return { from: fromColor, to: toColor };
}


const DashboardTileComponent: React.FC<DashboardTileProps> = ({ title, iconName, href, description, className, onClick, shortcut }) => {
  const Icon = iconMap[iconName] || FallbackIcon;
  const { from, to } = getGradientColorsFromClassName(className);

  const cardStyle: CSSProperties = {
    '--gradient-from': from,
    '--gradient-to': to,
  } as CSSProperties;

  const cardContent = (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="h-full w-full"
    >
        <Card style={cardStyle} className={cn(
          "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
          "rounded-xl p-3 flex flex-col items-center text-center justify-center h-full min-h-[120px] text-white",
          "liquid-gradient-background", // Use the generic liquid gradient class
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
