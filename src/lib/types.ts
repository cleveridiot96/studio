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
  commission?: number; // For Agents and Brokers
  type: MasterItemType;
  [key: string]: any; // For additional fields
}

export type MasterItemType = 'Supplier' | 'Agent' | 'Transporter' | 'Warehouse' | 'Customer' | 'Broker' | 'Item';


// Example data types for features
export interface Purchase {
  id: string;
  date: string; // ISO string date
  lotNumber: string;
  supplierId: string;
  supplierName?: string; // For display in table
  agentId?: string;
  agentName?: string; // For display in table
  itemName: string; // For single item purchase - Assuming this is the commodity
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // per KG
  expenses?: number; // Packaging, labour etc.
  transportRate?: number; // Cost per kg or fixed for the lot
  brokerId?: string;
  brokerName?: string;
  brokerageType?: 'Fixed' | 'Percentage';
  brokerageValue?: number; // Actual amount or percentage rate
  calculatedBrokerageAmount?: number; // Stored calculated amount
  totalAmount: number; // Net Weight * Rate + Expenses + Transport Cost (if applicable per unit) - will need clarification on exact formula
  locationId: string; // Using warehouseId as locationId
  locationName?: string; // Using warehouseName as locationName
  transporterId?: string;
  transporterName?: string; // For display
}

export interface Sale {
  id: string;
  date: string; // ISO string date
  billNumber: string;
  billAmount?: number; // Optional, auto-calculated from Net Weight * Rate
  customerId: string;
  customerName?: string; // For display in table
  lotNumber: string; // From existing inventory - for now text input
  itemName: string; // Commodity name, likely fetched from lot
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // Sale price per KG
  transporterId?: string;
  transporterName?: string;
  transportCost?: number;
  brokerId?: string;
  brokerName?: string;
  brokerageAmount?: number; // Manual or auto-calculated
  notes?: string;
  totalAmount: number; // Net Weight * Rate
  profit?: number; // Conceptual: Sale Amount - Purchase Cost - Transport - Brokerage
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
  partyId: string;
  partyName?: string;
  partyType: MasterItemType;
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  referenceNo?: string;
  notes?: string;
}

export interface Receipt {
  id: string;
  date: Date;
  partyId: string;
  partyName?: string;
  partyType: MasterItemType;
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  referenceNo?: string;
  notes?: string;
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

export interface Party { // For Ledger: Supplier, Agent, Transporter, Customer, Broker
  id: string;
  name: string;
  type: MasterItemType;
  outstandingBalance: number;
}

// Specific master types
export interface Supplier extends MasterItem {}
export interface Agent extends MasterItem {
  commission: number; // Percentage
}
export interface Transporter extends MasterItem {}
export interface Warehouse extends MasterItem {} // Used as Location
export interface Customer extends MasterItem {}
export interface Broker extends MasterItem {
  commission?: number; // Percentage, if default brokerage is percentage based
}
export interface Item extends MasterItem { // For item master (commodities)
  category?: string;
  unit?: string;
}