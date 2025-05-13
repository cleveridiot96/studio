import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  iconName: string; 
  label?: string;
  disabled?: boolean;
  external?: boolean;
  items?: NavItem[]; 
}

// Generic type for master data items
export interface MasterItem {
  id: string;
  name: string;
  commission?: number; // For Agents and Brokers
  type: MasterItemType;
  // subtype?: MasterItemSubtype; // Removed for customer bifurcation
  [key: string]: any; // For additional fields
}

export type MasterItemType = 'Supplier' | 'Agent' | 'Transporter' | 'Warehouse' | 'Customer' | 'Broker';
// export type MasterItemSubtype = 'Retailer' | 'Wholesaler' | 'Corporate'; // Removed


// Example data types for features
export interface Purchase {
  id: string;
  date: string; // ISO string date
  lotNumber: string; // This is the "Vakkal"
  supplierId: string;
  supplierName?: string; // For display in table
  agentId?: string;
  agentName?: string; // For display in table
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // per KG
  expenses?: number; 
  transportRate?: number; 
  brokerId?: string;
  brokerName?: string;
  brokerageType?: 'Fixed' | 'Percentage';
  brokerageValue?: number; 
  calculatedBrokerageAmount?: number; 
  totalAmount: number; 
  locationId: string; 
  locationName?: string; 
  transporterId?: string;
  transporterName?: string; 
}

export interface Sale {
  id: string;
  date: string; // ISO string date
  billNumber: string;
  billAmount?: number; 
  customerId: string;
  customerName?: string; 
  lotNumber: string; // This is the "Vakkal" from existing inventory
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // Sale price per KG
  transporterId?: string;
  transporterName?: string;
  transportCost?: number;
  brokerId?: string;
  brokerName?: string;
  brokerageAmount?: number; 
  notes?: string;
  totalAmount: number; 
  profit?: number; 
}

export interface InventoryItem {
  id: string; // Corresponds to Purchase lotNumber (Vakkal)
  vakkalNumber: string; // Lot Number
  location: string; 
  quantity: number; // Current bags
  netWeight: number; // Current net weight in KG
  originalPurchaseRate?: number; // To help with profit calculation later
  purchaseDate?: string;
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

export interface Party { 
  id: string;
  name: string;
  type: MasterItemType;
  outstandingBalance: number;
}

// Specific master types
export interface Supplier extends MasterItem {}
export interface Agent extends MasterItem {
  commission: number; 
}
export interface Transporter extends MasterItem {}
export interface Warehouse extends MasterItem {} 
export interface Customer extends MasterItem {
  // subtype: MasterItemSubtype; // Removed
}
export interface Broker extends MasterItem {
  commission?: number; 
}
// Item interface removed as per new requirement
// export interface Item extends MasterItem { 
//   category?: string;
//   unit?: string;
// }

