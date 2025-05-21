import type { Sale, Purchase, Payment, Receipt, MasterItem, LocationTransfer } from '@/lib/types';
import { format } from 'date-fns';

export interface SearchableItem {
  id: string;
  type: string; // e.g., 'sale', 'purchase', 'customer', 'supplier', 'payment', 'receipt', 'location transfer'
  title: string; // User-friendly display for search result
  searchableText: string; // Concatenated string of relevant fields for Fuse.js to search
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
    searchableItems.push({
      id: s.id,
      type: 'sale',
      title: `Sale: ${s.billNumber || s.id} to ${s.customerName || s.customerId}`,
      searchableText: `sale ${s.billNumber || ''} ${s.customerName || s.customerId} ${s.lotNumber} ${s.totalAmount} ${s.date} ${s.notes || ''}`,
      href: `/sales#${s.id}`, // Simple href for now
      date: s.date,
    });
  });

  purchases.forEach((p) => {
    searchableItems.push({
      id: p.id,
      type: 'purchase',
      title: `Purchase: ${p.lotNumber} from ${p.supplierName || p.supplierId}`,
      searchableText: `purchase ${p.supplierName || p.supplierId} ${p.lotNumber} ${p.totalAmount} ${p.date} ${p.agentName || ''} ${p.transporterName || ''} ${p.locationName || ''}`,
      href: `/purchases#${p.id}`,
      date: p.date,
    });
  });

  payments.forEach((pm) => {
    searchableItems.push({
      id: pm.id,
      type: 'payment',
      title: `Payment: To ${pm.partyName || pm.partyId} (₹${pm.amount})`,
      searchableText: `payment ${pm.partyName || pm.partyId} ${pm.partyType} ${pm.amount} ${pm.paymentMethod} ${pm.referenceNo || ''} ${pm.date} ${pm.notes || ''}`,
      href: `/payments#${pm.id}`,
      date: pm.date,
    });
  });

  receipts.forEach((r) => {
    searchableItems.push({
      id: r.id,
      type: 'receipt',
      title: `Receipt: From ${r.partyName || r.partyId} (₹${r.amount})`,
      searchableText: `receipt ${r.partyName || r.partyId} ${r.partyType} ${r.amount} ${r.paymentMethod} ${r.referenceNo || ''} ${r.date} ${r.notes || ''}`,
      href: `/receipts#${r.id}`,
      date: r.date,
    });
  });

  masters.forEach((m) => {
    searchableItems.push({
      id: m.id,
      type: m.type.toLowerCase(), // e.g., 'customer', 'supplier'
      title: `${m.type}: ${m.name}`,
      searchableText: `master ${m.type} ${m.name} ${m.id} ${m.commission || ''}`,
      href: `/masters#${m.id}`, // Could be improved: /masters?type=${m.type}&id=${m.id}
    });
  });

  locationTransfers.forEach((lt) => {
    const itemsDesc = lt.items.map(item => `${item.lotNumber} ${item.bagsToTransfer} bags`).join(', ');
    searchableItems.push({
      id: lt.id,
      type: 'location transfer',
      title: `Transfer on ${format(new Date(lt.date), 'dd-MM-yy')}: ${lt.fromWarehouseName} to ${lt.toWarehouseName}`,
      searchableText: `location transfer ${lt.fromWarehouseName} ${lt.toWarehouseName} ${itemsDesc} ${lt.transporterName || ''} ${lt.date} ${lt.notes || ''}`,
      href: `/location-transfer#${lt.id}`,
      date: lt.date,
    });
  });
  
  console.log("Built search data with", searchableItems.length, "items.");
  return searchableItems;
};
