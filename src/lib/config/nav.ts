
import type { NavItem } from '@/lib/types';

export const APP_NAME = "Vyapar Saathi";
export const APP_ICON = 'LineChart';

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutGrid',
    iconColor: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white',
    description: "Main hub"
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
    iconColor: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
    shortcut: 'Alt + P',
    description: "Manage incoming goods"
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
    iconColor: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white',
    shortcut: 'Alt + S',
    description: "Create new sales"
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
    iconColor: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white',
    shortcut: 'Alt + L',
    description: "Move stock"
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
    iconColor: 'bg-gradient-to-br from-green-700 via-yellow-800 to-green-700 text-white', // Green & Brown
    shortcut: 'Alt + I',
    description: "View stock levels"
  },
   {
    title: 'Outstanding',
    href: '/outstanding',
    iconName: 'ClipboardList',
    iconColor: 'bg-gradient-to-br from-gray-400 to-gray-600 text-white',
    shortcut: 'Alt + O',
    description: "Receivables & Payables"
  },
  {
    title: 'Stock Adjustments',
    href: '/stock-adjustments',
    iconName: 'SlidersHorizontal',
    iconColor: 'bg-gradient-to-br from-slate-100 to-gray-300 text-black',
    description: "Manual adjustments"
  },
  {
    title: 'Stock Ledger',
    href: '/ledger',
    iconName: 'BookUser',
    iconColor: 'bg-gradient-to-br from-gray-500 to-slate-600 text-white',
    shortcut: 'Alt + K',
    description: "Party-wise stock"
  },
  {
    title: 'Accounts Ledger',
    href: '/accounts-ledger',
    iconName: 'BookCopy',
    iconColor: 'bg-gradient-to-br from-slate-800 to-black text-white',
    shortcut: 'Alt + A',
    description: "Party financial ledger"
  },
  {
    title: 'Lot Ledger',
    href: '/lot-ledger',
    iconName: 'Search',
    iconColor: 'bg-gradient-to-br from-purple-500 via-white to-purple-400 text-purple-800',
    description: "Trace any vakkal"
  },
  {
    title: 'Profit Analysis',
    href: '/profit-analysis',
    iconName: 'Rocket',
    iconColor: 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-black',
    shortcut: 'Alt + Shift + A',
    description: "Analyze profitability"
  },
  {
    title: 'Financial Summary',
    href: '/balance-sheet',
    iconName: 'Landmark',
    iconColor: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black',
    description: "Business overview"
  },
  {
    title: 'Payments',
    href: '/payments',
    iconName: 'ArrowRightCircle',
    iconColor: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white',
    shortcut: 'Alt + Shift + P',
    description: "Record payments made"
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
    iconColor: 'bg-gradient-to-br from-pink-500 to-rose-500 text-white',
    shortcut: 'Alt + R',
    description: "Record receipts"
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
    iconColor: 'bg-gradient-to-br from-yellow-700 via-amber-800 to-yellow-700 text-white', // Brown and Yellow
    shortcut: 'Alt + C',
    description: "Daily cash flow"
  },
  {
    title: 'Daybook',
    href: '/daybook',
    iconName: 'BookMarked',
    iconColor: 'bg-gradient-to-br from-stone-100 to-gray-200 text-black', // White/Cream
    shortcut: 'Alt + D',
    description: "All daily entries"
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
    iconColor: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white',
    shortcut: 'Alt + M',
    description: "Manage all parties"
  },
  {
    title: 'Backup Data',
    href: '#', // Action handled by onClick
    iconName: 'FileJson',
    iconColor: 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white',
    shortcut: 'Alt + B',
    description: "Save your data"
  },
  {
    title: 'Restore Data',
    href: '#', // Action handled by onClick
    iconName: 'UploadCloud',
    iconColor: 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white',
    shortcut: 'Alt + V',
    description: "Load from backup"
  }
];
