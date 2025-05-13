import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  iconName: string; // Changed from icon: LucideIcon
  label?: string;
  disabled?: boolean;
  external?: boolean;
  items?: NavItem[]; // For sub-menus, if needed
}

// Generic type for master data items
export interface MasterItem {
  id: string;
  name: string;
  [key: string]: any; // For additional fields
}

// Example data types for features
export interface Purchase {
  id: string;
  date: Date;
  itemName: string;
  quantity: number;
  price: number;
  supplier: string;
  agent?: string;
  transporter?: string;
  warehouse: string;
}

export interface Sale {
  id: string;
  date: Date;
  billNumber: string;
  customerName: string;
  itemName: string;
  quantity: number;
  price: number;
  totalAmount: number;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  location: string;
  quantity: number;
  lotNumber?: string;
  weight?: number;
}

export interface Payment {
  id: string;
  date: Date;
  payeeName: string; // Supplier or Transporter
  payeeType: 'Supplier' | 'Transporter';
  amount: number;
  paymentMethod: string;
}

export interface Receipt {
  id: string;
  date: Date;
  payerName: string; // Customer
  amount: number;
  paymentMethod: string;
}

export interface CashBookEntry {
  id: string;
  date: Date;
  description: string;
  inflow?: number;
  outflow?: number;
  balance: number;
}

export interface LedgerEntry {
  id: string;
  date: Date;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
}

export interface Party { // For Ledger: Supplier, Agent, Transporter
  id: string;
  name: string;
  type: 'Supplier' | 'Agent' | 'Transporter' | 'Customer';
  outstandingBalance: number;
}
