
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
  // bifurcation?: string; // Removed as per user request
  [key: string]: any; // For additional fields
}

export type MasterItemType = 'Supplier' | 'Agent' | 'Transporter' | 'Warehouse' | 'Customer' | 'Broker';

// Example data types for features
export interface Purchase {
  id: string;
  date: string; // ISO string date
  lotNumber: string; // This is the "Vakkal"
  supplierId: string;
  supplierName?: string; // For display in table
  agentId?: string;
  agentName?: string; // For display in table
  // itemName: string; // Removed as per user request
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // per KG
  expenses?: number;
  transportRate?: number;
  transporterId?: string;
  transporterName?: string;
  brokerId?: string;
  brokerName?: string;
  brokerageType?: 'Fixed' | 'Percentage';
  brokerageValue?: number;
  calculatedBrokerageAmount?: number;
  totalAmount: number;
  locationId: string;
  locationName?: string;
}

export interface Sale {
  id: string;
  date: string; // ISO string date
  billNumber: string;
  billAmount?: number;
  customerId: string;
  customerName?: string;
  lotNumber: string; // This is the "Vakkal" from existing inventory
  // itemName: string; // Removed as per user request
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // Sale price per KG
  transporterId?: string;
  transporterName?: string;
  transportCost?: number;
  brokerId?: string;
  brokerName?: string;
  brokerageType?: 'Fixed' | 'Percentage'; // Added to match purchase form
  brokerageAmount?: number; // This is the value (e.g. 2 for 2% or 500 for fixed)
  // calculatedBrokerageAmount is not directly stored on Sale, but can be derived
  notes?: string;
  totalAmount: number; // Typically billAmount (rate * netWeight)
  profit?: number;
}

export interface InventoryItem {
  id: string; // Corresponds to Purchase lotNumber (Vakkal)
  vakkalNumber: string; // Lot Number
  locationId: string;
  locationName?: string;
  quantity: number; // Current bags
  netWeight: number; // Current net weight in KG
  originalPurchaseRate?: number; // To help with profit calculation later
  purchaseDate?: string;
}

export interface Payment {
  id: string;
  date: string; // ISO string date
  partyId: string;
  partyName?: string; // For display in table
  partyType: MasterItemType; // Supplier, Agent, Transporter, Broker
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  referenceNo?: string;
  notes?: string;
}

export interface Receipt {
  id: string;
  date: string; // ISO string date
  partyId: string;
  partyName?: string; // For display in table
  partyType: MasterItemType; // Customer, Broker
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  referenceNo?: string;
  notes?: string;
}

export interface CashBookEntry {
  id: string;
  date: string; // ISO string date
  description: string;
  inflow?: number;
  outflow?: number;
  balance: number;
}

export interface LedgerEntry {
  id:string;
  date: string; // ISO string date
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
  commission?: number; // Made optional to align with MasterItem
}
export interface Transporter extends MasterItem {}
export interface Warehouse extends MasterItem {}
export interface Customer extends MasterItem {}
export interface Broker extends MasterItem {
  commission?: number; // Made optional to align with MasterItem
}

    