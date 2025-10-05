
import type { NavItem } from '@/lib/types';
import type { CSSProperties } from 'react';

// Extend NavItem to include a style property
export interface StyledNavItem extends NavItem {
  style?: CSSProperties;
}

export const APP_NAME = "Vyapar Saathi";
export const APP_ICON = 'LineChart';

export const navItems: StyledNavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    iconName: 'LayoutGrid',
    description: "Main hub",
    style: { backgroundImage: 'linear-gradient(to right top, #ffd700, #fdbf00, #f9a800, #f59100, #ef7a00)', color: 'black' }
  },
  {
    title: 'Purchases',
    href: '/purchases',
    iconName: 'ShoppingCart',
    shortcut: 'Alt + P',
    description: "Manage incoming goods",
    style: { backgroundImage: 'linear-gradient(to right top, #4ade80, #3dc671, #36b463, #30a355, #299247)', color: 'white' }
  },
  {
    title: 'Sales',
    href: '/sales',
    iconName: 'Receipt',
    shortcut: 'Alt + S',
    description: "Create new sales",
    style: { backgroundImage: 'linear-gradient(to right top, #fb923c, #f97e29, #f76915, #f55300, #f33a00)', color: 'white' }
  },
  {
    title: 'Location Transfer',
    href: '/location-transfer',
    iconName: 'ArrowRightLeft',
    shortcut: 'Alt + L',
    description: "Move stock",
    style: { backgroundImage: 'linear-gradient(to right top, #3b82f6, #009bff, #00b1ff, #00c4ff, #00d5ff)', color: 'white' }
  },
  {
    title: 'Inventory',
    href: '/inventory',
    iconName: 'Boxes',
    shortcut: 'Alt + I',
    description: "View stock levels",
    style: { backgroundImage: 'linear-gradient(to right top, #22c55e, #539e4a, #6f793e, #7d573a, #7d3b3b)', color: 'white' }
  },
   {
    title: 'Outstanding',
    href: '/outstanding',
    iconName: 'ClipboardList',
    shortcut: 'Alt + O',
    description: "Receivables & Payables",
    style: { backgroundImage: 'linear-gradient(to right top, #9ca3af, #848c98, #6d7681, #57606b, #424b56)', color: 'white' }
  },
  {
    title: 'Stock Adjustments',
    href: '/stock-adjustments',
    iconName: 'SlidersHorizontal',
    description: "Manual adjustments",
    style: { backgroundImage: 'linear-gradient(to right top, #ffffff, #f9f9f9, #f2f2f2, #ececec, #e6e6e6)', color: 'black' }
  },
  {
    title: 'Stock Ledger',
    href: '/ledger',
    iconName: 'BookUser',
    shortcut: 'Alt + K',
    description: "Party-wise stock",
    style: { backgroundImage: 'linear-gradient(to right top, #d1d5db, #b7bcc1, #9ea3a8, #868b8f, #6f7377)', color: 'white' }
  },
  {
    title: 'Accounts Ledger',
    href: '/accounts-ledger',
    iconName: 'BookCopy',
    shortcut: 'Alt + A',
    description: "Party financial ledger",
    style: { backgroundImage: 'linear-gradient(to right top, #3b82f6, #2d65c3, #224991, #182e61, #0d1735)', color: 'white' }
  },
  {
    title: 'Lot Ledger',
    href: '/lot-ledger',
    iconName: 'Search',
    description: "Trace any vakkal",
    style: { backgroundImage: 'linear-gradient(to right top, #a855f7, #c47eed, #db9ff3, #efc0f9, #ffe2ff)', color: 'black' }
  },
  {
    title: 'Profit Analysis',
    href: '/profit-analysis',
    iconName: 'Rocket',
    shortcut: 'Alt + Shift + A',
    description: "Analyze profitability",
    style: { backgroundImage: 'linear-gradient(to right top, #facc15, #f5b911, #eea612, #e79315, #e08018)', color: 'black' }
  },
  {
    title: 'Financial Summary',
    href: '/balance-sheet',
    iconName: 'Landmark',
    description: "Business overview",
    style: { backgroundImage: 'linear-gradient(to right top, #ffd700, #fdbf00, #f9a800, #f59100, #ef7a00)', color: 'black' }
  },
  {
    title: 'Payments',
    href: '/payments',
    iconName: 'ArrowRightCircle',
    shortcut: 'Alt + Shift + P',
    description: "Record payments made",
    style: { backgroundImage: 'linear-gradient(to right top, #8b5cf6, #7349df, #5a36c8, #3f23b2, #1c0d9c)', color: 'white' }
  },
  {
    title: 'Receipts',
    href: '/receipts',
    iconName: 'ArrowLeftCircle',
    shortcut: 'Alt + R',
    description: "Record receipts",
    style: { backgroundImage: 'linear-gradient(to right top, #ec4899, #e5398a, #de287b, #d7126c, #d0005d)', color: 'white' }
  },
  {
    title: 'Cash Book',
    href: '/cashbook',
    iconName: 'BookOpen',
    shortcut: 'Alt + C',
    description: "Daily cash flow",
    style: { backgroundImage: 'linear-gradient(to right top, #fde047, #d9b83a, #b6922f, #946f26, #734e1e)', color: 'white' }
  },
  {
    title: 'Daybook',
    href: '/daybook',
    iconName: 'BookMarked',
    shortcut: 'Alt + D',
    description: "All daily entries",
    style: { backgroundImage: 'linear-gradient(to right top, #fefde8, #fcf6d6, #f9f0c5, #f7e9b4, #f5e2a3)', color: 'black' }
  },
  {
    title: 'Masters',
    href: '/masters',
    iconName: 'Users2',
    shortcut: 'Alt + M',
    description: "Manage all parties",
    style: { backgroundImage: 'linear-gradient(to right top, #2563eb, #0058d4, #004abf, #003aaa, #092a95)', color: 'white' }
  },
  {
    title: 'Backup Data',
    href: '#', // Action handled by onClick
    iconName: 'FileJson',
    shortcut: 'Alt + B',
    description: "Save your data",
    style: { backgroundImage: 'linear-gradient(to right top, #2dd4bf, #00c7c0, #00bac0, #00abbf, #009cbb)', color: 'white' }
  },
  {
    title: 'Restore Data',
    href: '#', // Action handled by onClick
    iconName: 'UploadCloud',
    shortcut: 'Alt + V',
    description: "Load from backup",
    style: { backgroundImage: 'linear-gradient(to right top, #d946ef, #c832db, #b71ac8, #a500b5, #9300a2)', color: 'white' }
  }
];
