
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
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

export const APP_NAME = "Kisan Khata Sahayak";
export const APP_ICON = LineChart;

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutGrid',
    iconColor: 'bg-indigo-500',
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
    iconColor: 'bg-purple-600',
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
    iconColor: 'bg-blue-600',
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
    iconColor: 'bg-cyan-600',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
    iconColor: 'bg-teal-600',
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
    iconColor: 'bg-red-600',
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
    iconColor: 'bg-green-600',
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
    iconColor: 'bg-pink-600',
  },
  {
    title: 'Daybook',
    href: '/daybook',
    iconName: 'BookMarked',
    iconColor: 'bg-[#ffa5ab]',
    textColor: 'text-white',
  },
  {
    title: 'Profit Analysis',
    href: '/profit-analysis',
    iconName: 'Rocket',
    iconColor: 'bg-green-500',
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
    iconColor: 'bg-sky-600',
  },
  {
    title: 'Backup/Restore',
    href: '/backup',
    iconName: 'DatabaseBackup',
    iconColor: 'bg-sky-500',
  },
];

    