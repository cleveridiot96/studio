
import {
  LayoutGrid,
  ShoppingCart,
  Receipt,
  Boxes,
  ClipboardList, // Changed from TrendingDown
  ArrowRightCircle,
  ArrowLeftCircle,
  BookOpen,
  BookUser,
  Users2,
  DatabaseBackup,
  Tractor, // App icon
  ArrowRightLeft, // For Location Transfer
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

export const APP_NAME = "Kisan Khata";
export const APP_ICON = Tractor;

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutGrid',
    iconColor: 'text-blue-500',
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
    iconColor: 'text-green-500',
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
    iconColor: 'text-red-500',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
    iconColor: 'text-purple-500',
  },
  {
    title: 'Stock Report',
    href: '/stock-report',
    iconName: 'ClipboardList', // Changed icon
    iconColor: 'text-yellow-600', // Darker yellow for better visibility
  },
  {
    title: 'Payments',
    href: '/payments',
    iconName: 'ArrowRightCircle',
    iconColor: 'text-pink-500',
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
    iconColor: 'text-teal-500',
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
    iconColor: 'text-orange-500',
  },
  {
    title: 'Ledger',
    href: '/ledger',
    iconName: 'BookUser',
    iconColor: 'text-indigo-500',
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
    iconColor: 'text-cyan-500',
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
    iconColor: 'text-lime-500',
  },
  {
    title: 'Backup/Restore',
    href: '/backup',
    iconName: 'DatabaseBackup',
    iconColor: 'text-gray-500',
  },
];
