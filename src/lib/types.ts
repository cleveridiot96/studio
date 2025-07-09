
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  iconColor?: string; // Background color for the icon's circle
  textColor?: string; // Optional text color for the icon
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
  commissionType?: 'Percentage' | 'Fixed'; // For Agents and Brokers
  type: MasterItemType;
  openingBalance?: number;
  openingBalanceType?: 'Dr' | 'Cr'; // Dr: To Receive (Asset), Cr: To Pay (Liability)
  [key: string]: any; // For additional fields
}

export type MasterItemType = 'Supplier' | 'Agent' | 'Transporter' | 'Warehouse' | 'Customer' | 'Broker' | 'Expense';

export interface PurchaseItem {
  lotNumber: string;
  quantity: number;
  netWeight: number;
  rate: number;
  goodsValue: number; // Calculated: netWeight * rate
  landedCostPerKg: number; 
}

export interface Purchase {
  id: string;
  date: string; // ISO string date
  
  supplierId: string;
  supplierName?: string;
  agentId?: string;
  agentName?: string;
  transporterId?: string;
  transporterName?: string;
  
  items: PurchaseItem[];

  // Aggregated values from items
  totalGoodsValue: number;
  totalQuantity: number;
  totalNetWeight: number;

  // Expenses for the entire purchase
  transportCharges?: number;
  packingCharges?: number;
  labourCharges?: number;
  commissionType?: 'Fixed' | 'Percentage';
  commission?: number;
  brokerageCharges?: number; // Calculated brokerage
  miscExpenses?: number;

  // Final calculated fields
  totalAmount: number; // totalGoodsValue + all expenses
  effectiveRate: number; // Average landed cost per kg for the whole purchase
  locationId: string; // All items in one purchase go to one location
  locationName?: string;
}

export interface CostBreakdown {
  baseRate: number;
  purchaseExpenses: number; // per kg
  transferExpenses: number; // per kg
}

export interface SaleItem {
  lotNumber: string;
  quantity: number;
  netWeight: number;
  rate: number; // This is the Sale Rate
  goodsValue: number; // Calculated: netWeight * rate
  
  // New fields for profit calculation
  purchaseRate: number; // The raw purchase rate for this lot.
  costOfGoodsSold: number; // The full landed cost for this portion of goods.
  itemGrossProfit: number;
  itemNetProfit: number; // Net profit for this item
  costBreakdown: CostBreakdown;
}

export interface Sale {
  id: string;
  date: string; // ISO string date
  billNumber?: string;
  isCB?: boolean;
  cbAmount?: number;

  customerId: string;
  customerName?: string;
  brokerId?: string;
  brokerName?: string;

  items: SaleItem[];

  // Aggregated values
  totalGoodsValue: number;
  billedAmount: number; // This is the final amount on the chitthi (totalGoodsValue - cbAmount)
  totalQuantity: number;
  totalNetWeight: number;
  
  // New profit fields
  totalCostOfGoodsSold: number; // Sum of items' costOfGoods
  totalGrossProfit: number; 
  totalCalculatedProfit: number; // This is the final Net Profit
  
  // Expenses for the entire sale
  transporterId?: string;
  transporterName?: string;
  transportCost?: number;
  packingCost?: number;
  labourCost?: number;
  miscExpenses?: number;
  commissionType?: 'Fixed' | 'Percentage';
  commission?: number;
  extraBrokeragePerKg?: number;
  
  // Calculated brokerage for the entire sale
  calculatedBrokerageCommission?: number;
  calculatedExtraBrokerage?: number;
  
  notes?: string;

  // For outstanding balance calculation
  paidAmount?: number;
  balanceAmount?: number;
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
  originalSaleRate: number; // Store for reference
  quantityReturned: number;
  netWeightReturned: number;
  returnReason?: string;
  notes?: string;
  returnAmount: number; // Calculated based on original sale rate
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

export interface AllocatedBill {
  billId: string;
  amount: number;
  billDate?: string;
  billTotal?: number;
  billVakkal?: string;
}
export interface Payment {
  id: string;
  date: string; // ISO string date
  partyId: string;
  partyName?: string; // For display in table
  partyType: MasterItemType; // Supplier, Agent, Transporter
  amount: number;
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  notes?: string;
  source?: string;
  transactionType: 'Against Bill' | 'On Account';
  againstBills?: AllocatedBill[];
}

export interface Receipt {
  id: string;
  date: string; // ISO string date
  partyId: string; // This will be brokerId if broker is paying, or customerId if customer pays directly
  partyName?: string; // For display in table
  partyType: MasterItemType; // Customer, Broker
  amount: number; // Actual amount received
  paymentMethod: 'Cash' | 'Bank' | 'UPI';
  notes?: string;
  transactionType: 'Against Bill' | 'On Account';
  againstBills?: AllocatedBill[];
  cashDiscount?: number; // Optional - amount of discount given at time of receipt
  source?: string;
}

export interface LocationTransferItem {
  originalLotNumber: string; // The lot being transferred from
  newLotNumber: string; // The new identifier for the transferred stock, e.g. "LOT/10"
  bagsToTransfer: number;
  netWeightToTransfer: number;
  grossWeightToTransfer: number;
  preTransferLandedCost?: number;
}

export interface ExpenseItem {
  account: string; // This will be the name of the expense, e.g., "Transport Charges"
  amount: number;
  paymentMode: 'Cash' | 'Bank' | 'Pending';
  party?: string; // Optional party name, free text for now
}

export interface LedgerEntry {
  id: string; // uuid
  date: string; // ISO string
  type: 'Expense' | 'Payment' | 'Receipt' | 'Purchase' | 'Sale' | 'Opening Balance';
  account: string; // e.g., "Transport Charges", "Broker Commission", "Sales"
  debit: number;
  credit: number;
  paymentMode?: 'Cash' | 'Bank' | 'Pending' | 'Auto-adjusted';
  party?: string; // Party Name
  partyId?: string; // Link to master item
  relatedVoucher?: string; // e.g., "CHITTI-234" or Purchase/Sale ID
  linkedTo?: {
    voucherType: 'Transfer' | 'Purchase' | 'Sales';
    voucherId: string;
  };
  remarks?: string;
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
  totalNetWeight?: number;
  totalGrossWeight?: number;
  totalExpenses?: number; // Sum of all expenses in the array
  perKgExpense?: number;
  expenses?: ExpenseItem[]; // The new flexible expense array
}


export interface CashBookEntry {
  id: string;
  date: string; // ISO string date
  description: string;
  inflow?: number;
  outflow?: number;
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
  commissionType?: 'Percentage' | 'Fixed';
}
export interface Transporter extends MasterItem {}
export interface Warehouse extends MasterItem {} // Represents a Location
export interface Customer extends MasterItem {}
export interface Broker extends MasterItem {
  commission?: number;
  commissionType?: 'Percentage' | 'Fixed';
}

// For Profit Analysis
export interface TransactionalProfitInfo {
  saleId: string;
  date: string;
  billNumber?: string;
  customerName?: string;
  lotNumber: string;
  saleNetWeightKg: number;
  // Rates
  basePurchaseRate: number;
  landedCostPerKg: number;
  saleRatePerKg: number;
  // Values
  goodsValue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  netProfit: number;
  // Breakdown
  costBreakdown: CostBreakdown;
  saleExpenses: {
    transport: number;
    packing: number;
    labour: number;
    misc: number;
    brokerage: number;
    extraBrokerage: number;
    total: number;
  }
}

export interface MonthlyProfitInfo {
  monthKey: string; // "yyyy-MM"
  monthYear: string; // "MMMM yyyy"
  totalProfit: number;
  totalSalesValue: number; // Sum of goodsValue
  totalCostOfGoods: number;
}
