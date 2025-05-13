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

export type MasterItemType = 'Supplier' | 'Agent' | 'Transporter' | 'Warehouse' | 'Customer' | 'Item';


// Example data types for features
export interface Purchase {
  id: string;
  date: string; // ISO string date
  lotNumber: string;
  supplierId: string;
  supplierName?: string; // For display in table
  agentId?: string;
  agentName?: string; // For display in table
  itemName: string; // For single item purchase
  quantity: number;
  netWeight: number;
  rate: number;
  totalAmount: number;
  warehouseId: string;
  warehouseName?: string; // For display
  transporterId?: string;
  transporterName?: string; // For display
}

export interface Sale {
  id: string;
  date: string; // ISO string date
  billNumber: string;
  customerId: string;
  customerName?: string; // For display in table
  itemName: string;
  quantity: number;
  price: number;
  totalAmount: number;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  location: string; // Could be warehouse name or ID
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
  id:string;
  date: Date;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
}

export interface Party { // For Ledger: Supplier, Agent, Transporter, Customer
  id: string;
  name: string;
  type: 'Supplier' | 'Agent' | 'Transporter' | 'Customer';
  outstandingBalance: number;
}

// Specific master types
export interface Supplier extends MasterItem {}
export interface Agent extends MasterItem {}
export interface Transporter extends MasterItem {}
export interface Warehouse extends MasterItem {}
export interface Customer extends MasterItem {}
export interface Item extends MasterItem { // For item master
  category?: string;
  unit?: string;
}
