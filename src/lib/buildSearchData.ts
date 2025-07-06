
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
      type: 'sale',
      title: `Sale: ${s.billNumber || s.id} to ${s.customerName || s.customerId}`,
      searchableText: `sale sales bill ${s.billNumber || ''} ${s.customerName || s.customerId} ${s.brokerName || ''} ${itemLots} ${s.billedAmount} ${s.date} ${s.notes || ''}`,
      href: `/sales#${s.id}`, 
      date: s.date,
    });
  });

  purchases.forEach((p) => {
    const itemLots = p.items.map(i => i.lotNumber).join(' ');
    searchableItems.push({
      id: p.id,
      type: 'purchase',
      title: `Purchase: ${itemLots} from ${p.supplierName || p.supplierId}`,
      searchableText: `purchase purchases lot vakkal ${p.supplierName || p.supplierId} ${itemLots} ${p.totalAmount} ${p.date} ${p.agentName || ''} ${p.transporterName || ''} ${p.locationName || ''}`,
      href: `/purchases#${p.id}`,
      date: p.date,
    });
  });

  payments.forEach((pm) => {
    searchableItems.push({
      id: pm.id,
      type: 'payment',
      title: `Payment: To ${pm.partyName || pm.partyId} (₹${pm.amount})`,
      searchableText: `payment payments ${pm.partyName || pm.partyId} ${pm.partyType} ${pm.amount} ${pm.paymentMethod} ${pm.date} ${pm.notes || ''}`,
      href: `/payments#${pm.id}`,
      date: pm.date,
    });
  });

  receipts.forEach((r) => {
    searchableItems.push({
      id: r.id,
      type: 'receipt',
      title: `Receipt: From ${r.partyName || r.partyId} (₹${r.amount})`,
      searchableText: `receipt receipts ${r.partyName || r.partyId} ${r.partyType} ${r.amount} ${r.paymentMethod} ${r.date} ${r.notes || ''}`,
      href: `/receipts#${r.id}`,
      date: r.date,
    });
  });

  masters.forEach((m) => {
    searchableItems.push({
      id: m.id,
      type: m.type.toLowerCase(), // e.g., 'customer', 'supplier'
      title: `${m.type}: ${m.name}`,
      searchableText: `master party ${m.type} ${m.name} ${m.id} ${m.commission || ''}`,
      href: `/ledger?partyId=${m.id}`, // Updated href to point to ledger
    });
  });

  locationTransfers.forEach((lt) => {
    const itemsDesc = lt.items.map(item => `${item.originalLotNumber} ${item.newLotNumber} ${item.bagsToTransfer} bags`).join(', ');
    searchableItems.push({
      id: lt.id,
      type: 'location transfer',
      title: `Transfer on ${format(parseISO(lt.date), 'dd-MM-yy')}: ${lt.fromWarehouseName} to ${lt.toWarehouseName}`,
      searchableText: `location transfer from to ${lt.fromWarehouseName || lt.fromWarehouseId} ${lt.toWarehouseName || lt.toWarehouseId} ${itemsDesc} ${lt.transporterName || ''} ${lt.date} ${lt.notes || ''}`,
      href: `/location-transfer#${lt.id}`,
      date: lt.date,
    });
  });
  
  console.log("Built search data with", searchableItems.length, "items for Fuse.js.");
  return searchableItems;
};
