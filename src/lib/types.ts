
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
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // per KG
  expenses?: number; // Other misc expenses added to cost
  transportRatePerKg?: number; // Transport cost per KG
  transporterId?: string;
  transporterName?: string;
  transportRate?: number; // Calculated: transportRatePerKg * (quantity * 50kg assumed per bag or actual weight)
  // Broker fields removed from Purchase as per previous request
  totalAmount: number; // (netWeight * rate) + expenses + transportRate
  locationId: string;
  locationName?: string;
}

export interface Sale {
  id: string;
  date: string; // ISO string date
  billNumber?: string; // Optional
  billAmount?: number; // Optional override for final bill amount. If not provided, totalAmount is used.
  cutBill?: boolean; // Optional
  customerId: string;
  customerName?: string;
  lotNumber: string; // This is the "Vakkal" from existing inventory
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // Sale price per KG
  transporterId?: string;
  transporterName?: string;
  transportCost?: number; // Fixed transport cost for this sale, affects profit
  brokerId?: string;
  brokerName?: string;
  brokerageType?: 'Fixed' | 'Percentage'; // For broker commission calculation
  brokerageValue?: number; // If fixed, this is the amount. If percentage, this is the % value.
  calculatedBrokerageCommission?: number; // The actual brokerage commission amount
  notes?: string;
  totalAmount: number; // Final amount for the customer = (billAmount if provided and > 0) OR (netWeight * rate)
  calculatedProfit?: number; // (totalAmount based on sale rate) - (cost of goods sold for this sale portion) - (transportCost || 0) - (calculatedBrokerageCommission || 0)
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

export interface LocationTransferItem {
  lotNumber: string;
  bagsToTransfer: number;
  netWeightToTransfer: number; // Calculated based on bags or average weight
}

export interface LocationTransfer {
  id: string;
  date: string; // ISO string date
  fromWarehouseId: string;
  fromWarehouseName?: string;
  toWarehouseId: string;
  toWarehouseName?: string;
  transporterId?: string;
  transporterName?: string;
  items: LocationTransferItem[];
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
  commission?: number;
}
export interface Transporter extends MasterItem {}
export interface Warehouse extends MasterItem {} // Represents a Location
export interface Customer extends MasterItem {}
export interface Broker extends MasterItem {
  commission?: number; // Assumed to be percentage for auto-population
  brokerageType?: 'Fixed' | 'Percentage'; // Default brokerage type from master
}

export interface BrokerData {
  name: string;
  commissionRate: number; // Percentage
}

// For Profit Analysis Page
export interface TransactionalProfitInfo {
  saleId: string;
  date: string;
  billNumber?: string;
  customerName?: string;
  lotNumber: string;
  saleQuantityBags: number;
  saleNetWeightKg: number;
  saleRatePerKg: number;
  saleAmount: number; // (saleNetWeightKg * saleRatePerKg)
  purchaseCostForSalePortion: number;
  transportCostOnSale?: number;
  brokerageOnSale?: number;
  netProfit: number;
}

export interface MonthlyProfitInfo {
  monthKey: string; // "yyyy-MM"
  monthYear: string; // e.g., "May 2024"
  totalProfit: number;
  totalSalesValue: number;
  totalCostOfGoods: number;
}
