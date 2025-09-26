
import type { Sale, Purchase, Payment, Receipt, MasterItem, LocationTransfer } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export interface SearchableItem {
  id: string;
  type: string; // e.g., 'sale', 'purchase', 'customer', 'supplier', 'payment', 'receipt', 'location transfer'
  title: string; // User-friendly display for search result
  searchableText: string; // Concatenated string of Fuse.js to search
  href: string; // Path to navigate to on click
  date?: string; // Optional date for sorting or display
}

interface BuildSearchDataInput {
  sales: Sale[];
  purchases: Purchase[];
  payments: Payment[];
  receipts: Receipt[];
  masters: MasterItem[];
  locationTransfers: LocationTransfer[];
}

export const buildSearchData = ({
  sales,
  purchases,
  payments,
  receipts,
  masters,
  locationTransfers,
}: BuildSearchDataInput): SearchableItem[] => {
  const searchableItems: SearchableItem[] = [];

  sales.forEach((s) => {
    const itemLots = s.items.map(i => i.lotNumber).join(' ');
    searchableItems.push({
      id: s.id,
      type: 'SALE',
      title: `SALE: ${s.billNumber || s.id} TO ${s.customerName || s.customerId}`,
      searchableText: `SALE SALES BILL ${s.billNumber || ''} ${s.customerName || s.customerId} ${s.brokerName || ''} ${itemLots} ${s.billedAmount} ${s.date} ${s.notes || ''} ${s.items.map(i => i.rate).join(' ')}`,
      href: `/sales#${s.id}`, 
      date: s.date,
    });
  });

  purchases.forEach((p) => {
    const itemLots = p.items.map(i => i.lotNumber).join(' ');
    searchableItems.push({
      id: p.id,
      type: 'PURCHASE',
      title: `PURCHASE: ${itemLots} FROM ${p.supplierName || p.supplierId}`,
      searchableText: `PURCHASE PURCHASES LOT VAKKAL ${p.supplierName || p.supplierId} ${itemLots} ${p.totalAmount} ${p.date} ${p.agentName || ''} ${p.transporterName || ''} ${p.locationName || ''} ${p.items.map(i => i.rate).join(' ')}`,
      href: `/purchases#${p.id}`,
      date: p.date,
    });
  });

  payments.forEach((pm) => {
    searchableItems.push({
      id: pm.id,
      type: 'PAYMENT',
      title: `PAYMENT: TO ${pm.partyName || pm.partyId} (₹${pm.amount})`,
      searchableText: `PAYMENT PAYMENTS ${pm.partyName || pm.partyId} ${pm.partyType} ${pm.amount} ${pm.paymentMethod} ${pm.date} ${pm.notes || ''}`,
      href: `/payments#${pm.id}`,
      date: pm.date,
    });
  });

  receipts.forEach((r) => {
    searchableItems.push({
      id: r.id,
      type: 'RECEIPT',
      title: `RECEIPT: FROM ${r.partyName || r.partyId} (₹${r.amount})`,
      searchableText: `RECEIPT RECEIPTS ${r.partyName || r.partyId} ${r.partyType} ${r.amount} ${r.paymentMethod} ${r.date} ${r.notes || ''} ${r.cashDiscount || ''}`,
      href: `/receipts#${r.id}`,
      date: r.date,
    });
  });

  masters.forEach((m) => {
    searchableItems.push({
      id: m.id,
      type: m.type.toUpperCase(), // e.g., 'CUSTOMER', 'SUPPLIER'
      title: `${m.type}: ${m.name}`,
      searchableText: `MASTER PARTY ${m.type} ${m.name} ${m.id} ${m.commission || ''} ${m.openingBalance || ''}`,
      href: `/ledger?partyId=${m.id}`, // Updated href to point to ledger
    });
  });

  locationTransfers.forEach((lt) => {
    const itemsDesc = lt.items.map(item => `${item.originalLotNumber} ${item.newLotNumber} ${item.bagsToTransfer} bags`).join(', ');
    searchableItems.push({
      id: lt.id,
      type: 'LOCATION TRANSFER',
      title: `TRANSFER ON ${format(parseISO(lt.date), 'dd-MM-yy')}: ${lt.fromWarehouseName} TO ${lt.toWarehouseName}`,
      searchableText: `LOCATION TRANSFER FROM TO ${lt.fromWarehouseName || lt.fromWarehouseId} ${lt.toWarehouseName || lt.toWarehouseId} ${itemsDesc} ${lt.transporterName || ''} ${lt.date} ${lt.notes || ''} ${lt.expenses?.map(e => e.account + ' ' + e.amount).join(' ')}`,
      href: `/location-transfer#${lt.id}`,
      date: lt.date,
    });
  });
  
  return searchableItems;
};
