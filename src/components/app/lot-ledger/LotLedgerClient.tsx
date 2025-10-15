
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import type { Purchase, Sale, LocationTransfer, PurchaseReturn, SaleReturn } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, Printer, ArrowDown, ArrowUp, ArrowRightLeft, Undo2, Redo2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';

const keys = {
  purchases: 'purchasesData',
  sales: 'salesData',
  locationTransfers: 'locationTransfersData',
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
};

interface LotHistoryEntry {
  date: string;
  type: 'PURCHASE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'SALE' | 'PURCHASE_RETURN' | 'SALE_RETURN';
  details: string;
  bags: number;
  weight: number;
  href: string;
}

const typeInfo = {
    PURCHASE: { Icon: ArrowDown, color: 'text-green-600', label: 'PURCHASE (IN)' },
    SALE: { Icon: ArrowUp, color: 'text-red-600', label: 'SALE (OUT)' },
    TRANSFER_IN: { Icon: ArrowDown, color: 'text-blue-600', label: 'TRANSFER (IN)' },
    TRANSFER_OUT: { Icon: ArrowUp, color: 'text-orange-600', label: 'TRANSFER (OUT)' },
    PURCHASE_RETURN: { Icon: Undo2, color: 'text-yellow-600', label: 'PURCHASE RETURN (OUT)' },
    SALE_RETURN: { Icon: Redo2, color: 'text-purple-600', label: 'SALE RETURN (IN)' },
};

export function LotLedgerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lotFromQuery = searchParams.get('lot');

  const [activeLot, setActiveLot] = useState(lotFromQuery || '');
  const [hydrated, setHydrated] = useState(false);

  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, []);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, []);
  const [locationTransfers] = useLocalStorageState<LocationTransfer[]>(keys.locationTransfers, []);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(keys.purchaseReturns, []);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(keys.saleReturns, []);

  useEffect(() => { setHydrated(true) }, []);
  
  useEffect(() => {
    if (lotFromQuery) {
      setActiveLot(lotFromQuery);
    }
  }, [lotFromQuery]);

  const handleLotSelect = (lot: string | undefined) => {
    const newLot = lot || '';
    setActiveLot(newLot);
    if (newLot) {
      router.push(`/lot-ledger?lot=${newLot}`);
    } else {
      router.push('/lot-ledger');
    }
  };

  const lotHistory = useMemo(() => {
    if (!activeLot || !hydrated) return [];
    
    const history: LotHistoryEntry[] = [];

    // 1. Purchase (Origin)
    purchases.forEach(p => {
      p.items.forEach(item => {
        if (item.lotNumber === activeLot) {
          history.push({
            date: p.date,
            type: 'PURCHASE',
            details: `FROM ${p.supplierName}`,
            bags: item.quantity,
            weight: item.netWeight,
            href: `/purchases#${p.id}`,
          });
        }
      });
    });

    // 2. Transfers
    locationTransfers.forEach(lt => {
      lt.items.forEach(item => {
        if (item.originalLotNumber === activeLot) {
          history.push({
            date: lt.date,
            type: 'TRANSFER_OUT',
            details: `TO ${lt.toWarehouseName} (NEW LOT: ${item.newLotNumber})`,
            bags: -item.bagsToTransfer,
            weight: -item.netWeightToTransfer,
            href: `/location-transfer#${lt.id}`,
          });
        }
        if (item.newLotNumber === activeLot) {
          history.push({
            date: lt.date,
            type: 'TRANSFER_IN',
            details: `FROM ${lt.fromWarehouseName} (ORIGINAL LOT: ${item.originalLotNumber})`,
            bags: item.bagsToTransfer,
            weight: item.netWeightToTransfer,
            href: `/location-transfer#${lt.id}`,
          });
        }
      });
    });

    // 3. Sales
    sales.forEach(s => {
      s.items.forEach(item => {
        if (item.lotNumber === activeLot) {
          history.push({
            date: s.date,
            type: 'SALE',
            details: `TO ${s.customerName}`,
            bags: -item.quantity,
            weight: -item.netWeight,
            href: `/sales#${s.id}`,
          });
        }
      });
    });

    // 4. Purchase Returns
    purchaseReturns.forEach(pr => {
      if (pr.originalLotNumber === activeLot) {
        history.push({
          date: pr.date,
          type: 'PURCHASE_RETURN',
          details: `TO SUPPLIER ${pr.originalSupplierName}`,
          bags: -pr.quantityReturned,
          weight: -pr.netWeightReturned,
          href: `/purchases#${pr.originalPurchaseId}`,
        });
      }
    });

    // 5. Sale Returns
    saleReturns.forEach(sr => {
      if (sr.originalLotNumber === activeLot) {
        history.push({
          date: sr.date,
          type: 'SALE_RETURN',
          details: `FROM CUSTOMER ${sr.originalCustomerName}`,
          bags: sr.quantityReturned,
          weight: sr.netWeightReturned,
          href: `/sales#${sr.originalSaleId}`,
        });
      }
    });

    return history.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [activeLot, hydrated, purchases, sales, locationTransfers, purchaseReturns, saleReturns]);
  
  const allSystemLots = useMemo(() => {
    if (!hydrated) return [];
    const lots = new Set<string>();
    purchases.forEach(p => p.items.forEach(i => lots.add(i.lotNumber)));
    locationTransfers.forEach(lt => {
      lt.items.forEach(item => {
        lots.add(item.originalLotNumber);
        lots.add(item.newLotNumber);
      });
    });
    return Array.from(lots).sort().map(lot => ({ value: lot, label: lot }));
  }, [hydrated, purchases, locationTransfers]);

  return (
    <div className="space-y-4 print-area">
      <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
      <Card className="shadow-md no-print">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold text-foreground">
            <Search className="mr-3 h-6 w-6" /> Vakkal / Lot Traceability Report
          </CardTitle>
          <CardDescription>Select a lot number to see its complete history from purchase to sale.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <MasterDataCombobox
              value={activeLot}
              onChange={handleLotSelect}
              options={allSystemLots}
              placeholder="SELECT OR SEARCH A LOT..."
              className="h-10 text-base"
            />
            <Button variant="outline" size="icon" onClick={() => window.print()} title="Print"><Printer className="h-5 w-5"/></Button>
          </div>
        </CardContent>
      </Card>

      {activeLot ? (
        <Card>
          <CardHeader>
            <CardTitle>History for Lot: <span className="text-primary uppercase">{activeLot}</span></CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Bags</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotHistory.length > 0 ? (
                    lotHistory.map((entry, index) => {
                      const Icon = typeInfo[entry.type].Icon;
                      const color = typeInfo[entry.type].color;
                      return (
                        <TableRow key={index} className="uppercase">
                          <TableCell>{format(parseISO(entry.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={color}>
                                <Icon className="mr-1.5 h-4 w-4"/>
                                {typeInfo[entry.type].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={entry.href} className="hover:underline text-blue-600" passHref>
                              {entry.details}
                            </Link>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${entry.bags > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.bags.toLocaleString('en-IN', { signDisplay: 'always' })}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${entry.weight > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.weight.toLocaleString('en-IN', { signDisplay: 'always', minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No history found for this lot number.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-10 text-muted-foreground no-print">
          <p>Please select a lot number to begin.</p>
        </div>
      )}
    </div>
  );
}
