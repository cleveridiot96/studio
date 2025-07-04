
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  iconColor?: string; // Added for individual icon colors
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
  openingBalance?: number;
  openingBalanceType?: 'Dr' | 'Cr'; // Dr: To Receive (Asset), Cr: To Pay (Liability)
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
  totalAmount: number; // (netWeight * rate)
  effectiveRate: number; // per KG, for purchases this is the same as rate. This will change upon transfer.
  locationId: string;
  locationName?: string;
}

export interface Sale {
  id: string;
  date: string; // ISO string date
  billNumber?: string; // Optional
  cutBill?: boolean; // Is this a "cut bill"?
  goodsValue: number; // Actual value of goods sold (netWeight * rate). Used for profit & as basis for billing.
  cutAmount?: number; // Amount to reduce from goodsValue if cutBill is true.
  billedAmount: number; // Amount on the invoice. If cutBill, this is goodsValue - cutAmount. Else, same as goodsValue.
  customerId: string;
  customerName?: string;
  brokerId?: string;
  brokerName?: string;
  lotNumber: string; // This is the "Vakkal" from existing inventory
  quantity: number; // Number of Bags
  netWeight: number; // in KG
  rate: number; // Sale price per KG (used to calculate goodsValue)
  transporterId?: string;
  transporterName?: string;
  transportCost?: number; // Fixed transport cost for this sale, affects profit
  brokerageType?: 'Fixed' | 'Percentage';
  brokerageValue?: number;
  extraBrokeragePerKg?: number; // "Mera ₹" or extra commission per kg
  calculatedBrokerageCommission?: number; // Percentage-based or fixed brokerage amount
  calculatedExtraBrokerage?: number; // Total amount from extraBrokeragePerKg
  notes?: string;
  calculatedProfit?: number; // Based on goodsValue - COGS - all expenses
}

export interface PurchaseReturn {
  id: string;
  date: string; // ISO string date
  originalPurchaseId: string;
  originalLotNumber: string;
  originalSupplierId: string;
  originalSupplierName?: string;
  quantityReturned: number;
  netWeightReturned: number;
  returnReason?: string;
  notes?: string;
  returnAmount: number; // Calculated based on original purchase rate
  originalPurchaseRate: number; // Store for reference
}

export interface SaleReturn {
  id: string;
  date: string; // ISO string date
  originalSaleId: string;
  originalBillNumber?: string;
  originalCustomerId: string;
  originalCustomerName?: string;
  originalLotNumber: string;
  quantityReturned: number;
  netWeightReturned: number;
  returnReason?: string;
  notes?: string;
  returnAmount: number; // Calculated based on original sale rate
  originalSaleRate: number; // Store for reference
  restockingFee?: number; // Optional
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
  partyType: MasterItemType; // Supplier, Agent, Transporter
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  referenceNo?: string;
  notes?: string;
}

export interface Receipt {
  id: string;
  date: string; // ISO string date
  partyId: string; // This will be brokerId if broker is paying, or customerId if customer pays directly
  partyName?: string; // For display in table
  partyType: MasterItemType; // Customer, Broker
  amount: number; // Actual amount received
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  referenceNo?: string;
  notes?: string;
  relatedSaleIds?: string[]; // Optional - to tag which invoices this receipt settles
  cashDiscount?: number; // Optional - amount of discount given at time of receipt
}

export interface LocationTransferItem {
  originalLotNumber: string; // The lot being transferred from
  newLotNumber: string; // The new identifier for the transferred stock, e.g. "LOT/10"
  bagsToTransfer: number;
  netWeightToTransfer: number;
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
  transportCharges?: number;
  packingCharges?: number;
  loadingCharges?: number;
  miscExpenses?: number;
  items: LocationTransferItem[]; // Use the updated item type
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
  description: string; // This will be our "Particulars"
  debit?: number;
  credit?: number;
  balance: number; // This is the running balance for the ledger view
  vchType?: string;
  refNo?: string;
  rate?: number;
  netWeight?: number;
  transactionAmount?: number;
  customerName?: string;
  supplierName?: string;
  cashDiscount?: number;
  relatedDocId: string; // To link back to original Sale/Purchase/Payment/Receipt ID
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
  commission?: number;
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
  saleAmount: number; // This should be the billedAmount
  purchaseCostForSalePortion: number;
  transportCostOnSale?: number;
  brokerageOnSale?: number; // This should now represent the total brokerage (percent + extra)
  netProfit: number; // Based on goodsValue
  goodsValueForProfitCalc: number; // The goodsValue used for profit calculation
}

export interface MonthlyProfitInfo {
  monthKey: string; // "yyyy-MM"
  monthYear: string; // "MMMM yyyy"
  totalProfit: number;
  totalSalesValue: number; // Sum of goodsValue
  totalCostOfGoods: number;
}
