
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
  Tractor, 
  ArrowRightLeft, 
} from 'lucide-react';
import type { NavItem } from '@/lib/types';

export const APP_NAME = "Kisan Khata";
export const APP_ICON = Tractor;

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutGrid',
    iconColor: 'text-indigo-500', // A distinct color for Dashboard/Home
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
    iconColor: 'text-purple-600', // Matches dashboard tile
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
    iconColor: 'text-blue-600', // Matches dashboard tile
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
    iconColor: 'text-teal-600', // Matches dashboard tile
  },
  {
    title: 'Stock Report',
    href: '/stock-report',
    iconName: 'ClipboardList', 
    iconColor: 'text-orange-600', // Matches dashboard tile
  },
  {
    title: 'Payments',
    href: '/payments',
    iconName: 'ArrowRightCircle',
    iconColor: 'text-red-600', // Matches dashboard tile
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
    iconColor: 'text-green-600', // Matches dashboard tile (assuming the green for receipts)
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
    iconColor: 'text-pink-600', // Matches dashboard tile
  },
  {
    title: 'Ledger',
    href: '/ledger',
    iconName: 'BookUser',
    iconColor: 'text-gray-700', // Matches dashboard tile
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
    iconColor: 'text-sky-600', // Matches dashboard tile
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
    iconColor: 'text-cyan-600', // Matches dashboard tile
  },
  {
    title: 'Backup/Restore',
    href: '/backup',
    iconName: 'DatabaseBackup',
    iconColor: 'text-sky-500', // Matches dashboard "Backup Data" tile
  },
];
