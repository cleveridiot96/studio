
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
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
  },
  {
    title: 'Stock Report',
    href: '/stock-report',
    iconName: 'ClipboardList', // Changed icon
  },
  {
    title: 'Payments',
    href: '/payments',
    iconName: 'ArrowRightCircle',
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
  },
  {
    title: 'Ledger',
    href: '/ledger',
    iconName: 'BookUser',
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
  },
  {
    title: 'Backup/Restore',
    href: '/backup',
    iconName: 'DatabaseBackup',
  },
];
