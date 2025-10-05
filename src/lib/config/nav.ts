import {
  LayoutGrid,
  ShoppingCart,
  Receipt,
  Boxes,
  ClipboardList,
  ArrowRightCircle,
  ArrowLeftCircle,
  BookOpen,
  BookUser,
  Users2,
  DatabaseBackup,
  LineChart,
  ArrowRightLeft,
  Rocket,
  BookCopy,
  DollarSign,
  BookMarked,
  Landmark,
  Search, // Added for Lot Ledger
  SlidersHorizontal,
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

export const APP_NAME = "Vyapar Saathi";
export const APP_ICON = LineChart;

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutGrid',
    iconColor: 'bg-yellow-500 text-black', // Gold
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
    iconColor: 'bg-green-600 text-white', // Green
    shortcut: 'Alt + P',
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
    iconColor: 'bg-orange-500 text-white', // Orange
    shortcut: 'Alt + S',
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
    iconColor: 'bg-blue-500 text-white', // Electric Blue
    shortcut: 'Alt + L',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
    iconColor: 'bg-green-800 text-white', // Green & Brown -> Dark Green
    shortcut: 'Alt + I',
  },
   {
    title: 'Outstanding',
    href: '/outstanding',
    iconName: 'ClipboardList',
    iconColor: 'bg-gray-400 text-black', // Grey/Silver
    shortcut: 'Alt + O',
  },
  {
    title: 'Stock Adjustments',
    href: '/stock-adjustments',
    iconName: 'SlidersHorizontal',
    iconColor: 'bg-gray-200 text-black', // White
  },
  {
    title: 'Stock Ledger',
    href: '/ledger',
    iconName: 'BookUser',
    iconColor: 'bg-gray-500 text-white', // Grey/Silver
    shortcut: 'Alt + K',
  },
  {
    title: 'Accounts Ledger',
    href: '/accounts-ledger',
    iconName: 'BookCopy',
    iconColor: 'bg-black text-white', // Black
    shortcut: 'Alt + A',
  },
  {
    title: 'Lot Ledger',
    href: '/lot-ledger',
    iconName: 'Search',
    iconColor: 'bg-purple-800 text-white', // Purple & White -> Purple
  },
  {
    title: 'Profit Analysis',
    href: '/profit-analysis',
    iconName: 'Rocket',
    iconColor: 'bg-yellow-400 text-black', // Yellow
    shortcut: 'Alt + Shift + A',
  },
  {
    title: 'Financial Summary',
    href: '/balance-sheet',
    iconName: 'Landmark',
    iconColor: 'bg-yellow-500 text-black', // Gold/Yellow
  },
  {
    title: 'Payments',
    href: '/payments',
    iconName: 'ArrowRightCircle',
    iconColor: 'bg-purple-700 text-white', // Dark Blue/Purple
    shortcut: 'Alt + Shift + P',
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
    iconColor: 'bg-pink-500 text-white', // Pink/Rose
    shortcut: 'Alt + R',
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
    iconColor: 'bg-yellow-700 text-white', // Brown & Yellow -> Brownish Yellow
    shortcut: 'Alt + C',
  },
  {
    title: 'Daybook',
    href: '/daybook',
    iconName: 'BookMarked',
    iconColor: 'bg-cream-100 text-black', // White/Cream
    shortcut: 'Alt + D',
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
    iconColor: 'bg-blue-800 text-white', // Royal Blue
    shortcut: 'Alt + M',
  },
  {
    title: 'Backup/Restore',
    href: '/backup',
    iconName: 'DatabaseBackup',
    iconColor: 'bg-teal-400 text-white', // Turquoise
    shortcut: 'Alt + B',
  },
];
