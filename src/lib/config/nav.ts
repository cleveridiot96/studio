
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
  Rocket, // Added for consistency with dashboard if it exists
  BookCopy,
  DollarSign, // Added for Expenses
  BookMarked,
  Landmark,
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

export const APP_NAME = "Kisan Khata Sahayak";
export const APP_ICON = LineChart;

// Icon colors will now represent background colors for the icon's circle
export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutGrid',
    iconColor: 'bg-indigo-500', // A distinct color for Dashboard/Home
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
    iconColor: 'bg-purple-600', // Matches dashboard tile
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
    iconColor: 'bg-blue-600', // Matches dashboard tile
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
    iconColor: 'bg-cyan-600', // Matches dashboard tile
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
    iconColor: 'bg-teal-600', // Matches dashboard tile
  },
   {
    title: 'Outstanding',
    href: '/outstanding',
    iconName: 'ClipboardList',
    iconColor: 'bg-yellow-500',
    textColor: 'text-black',
  },
  {
    title: 'Stock Ledger',
    href: '/ledger',
    iconName: 'BookUser',
    iconColor: 'bg-red-800',
  },
  {
    title: 'Accounts Ledger',
    href: '/accounts-ledger',
    iconName: 'BookCopy',
    iconColor: 'bg-[#1beec7]',
    textColor: 'text-black',
  },
  {
    title: 'Financial Summary',
    href: '/balance-sheet',
    iconName: 'Landmark',
    iconColor: 'bg-blue-700',
  },
  {
    title: 'Payments',
    href: '/payments',
    iconName: 'ArrowRightCircle',
    iconColor: 'bg-red-600', // Matches dashboard tile
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
    iconColor: 'bg-green-600', // Matches dashboard tile
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
    iconColor: 'bg-pink-600', // Matches dashboard tile
  },
  {
    title: 'Daybook',
    href: '/daybook',
    iconName: 'BookMarked',
    iconColor: 'bg-slate-600',
  },
  {
    title: 'Profit Analysis', // Adding Profit Analysis to nav if it exists on dashboard
    href: '/profit-analysis',
    iconName: 'Rocket',
    iconColor: 'bg-green-500', // Matches dashboard tile
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
    iconColor: 'bg-sky-600', // Matches dashboard tile
  },
  {
    title: 'Backup/Restore',
    href: '/backup',
    iconName: 'DatabaseBackup',
    iconColor: 'bg-sky-500', // Matches dashboard "Backup Data" tile
  },
];
