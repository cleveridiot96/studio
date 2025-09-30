
"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, PurchaseReturn, SaleReturn } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Printer, Users, ChevronDown } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { useSettings } from "@/contexts/SettingsContext";
import { salesMigrator, purchaseMigrator } from '@/lib/dataMigrators';
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const keys = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  purchaseReturns: 'purchaseReturnsData',
  saleReturns: 'saleReturnsData',
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
  expenses: 'masterExpenses',
};

interface OutstandingParty {
  partyId: string;
  partyName: string;
  partyType: string;
  balance: number; // Positive for receivable, negative for payable
  bills: OutstandingBill[];
}

interface OutstandingBill {
  id: string;
  type: 'Sale' | 'Purchase';
  date: string;
  vakkal: string;
  totalAmount: number;
  paid: number;
  balance: number;
  daysOverdue: number;
  partyName: string; // Added for detailed view
}

const AgingReport = ({ data }: { data: OutstandingParty[] }) => {
  const [openBucket, setOpenBucket] = useState<string | null>(null);

  const agingBuckets = useMemo(() => {
    const buckets = {
      current: { label: 'Current (0-30 Days)', total: 0, count: 0, bills: [] as OutstandingBill[] },
      '31-60': { label: '31-60 Days', total: 0, count: 0, bills: [] as OutstandingBill[] },
      '61-90': { label: '61-90 Days', total: 0, count: 0, bills: [] as OutstandingBill[] },
      '90+': { label: '90+ Days', total: 0, count: 0, bills: [] as OutstandingBill[] },
    };

    data.forEach(party => {
      party.bills.forEach(bill => {
        if (bill.type === 'Sale' && bill.balance > 0) {
          const billWithParty = { ...bill, partyName: party.partyName };
          if (bill.daysOverdue <= 30) {
            buckets.current.total += bill.balance;
            buckets.current.count++;
            buckets.current.bills.push(billWithParty);
          } else if (bill.daysOverdue <= 60) {
            buckets['31-60'].total += bill.balance;
            buckets['31-60'].count++;
            buckets['31-60'].bills.push(billWithParty);
          } else if (bill.daysOverdue <= 90) {
            buckets['61-90'].total += bill.balance;
            buckets['61-90'].count++;
            buckets['61-90'].bills.push(billWithParty);
          } else {
            buckets['90+'].total += bill.balance;
            buckets['90+'].count++;
            buckets['90+'].bills.push(billWithParty);
          }
        }
      });
    });
    return buckets;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Receivables Aging Summary</CardTitle>
        <CardDescription>A summary of your outstanding receivables. Click a row to see detailed invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aging Bucket</TableHead>
              <TableHead className="text-right">Total Amount (₹)</TableHead>
              <TableHead className="text-right">No. of Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(agingBuckets).map(([key, bucket]) => (
              <Collapsible asChild key={key} open={openBucket === key} onOpenChange={(isOpen) => setOpenBucket(isOpen ? key : null)}>
                <>
                  <CollapsibleTrigger asChild>
                    <TableRow className={cn("font-medium cursor-pointer hover:bg-muted/50", bucket.label.includes('90+') && bucket.total > 0 && "text-destructive font-bold")}>
                      <TableCell className="flex items-center gap-2">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", openBucket === key && "rotate-180")} />
                        {bucket.label}
                      </TableCell>
                      <TableCell className="text-right">₹{bucket.total.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">{bucket.count}</TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  <CollapsibleContent asChild>
                    <tr className="bg-muted/20">
                      <td colSpan={3} className="p-0">
                        <div className="p-4">
                          <h4 className="font-semibold mb-2">Invoices for: {bucket.label}</h4>
                          {bucket.bills.length > 0 ? (
                            <ScrollArea className="h-48">
                              <Table size="sm">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Party</TableHead>
                                    <TableHead>Bill</TableHead>
                                    <TableHead className="text-right">Days Overdue</TableHead>
                                    <TableHead className="text-right">Balance (₹)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {bucket.bills.sort((a,b) => b.daysOverdue - a.daysOverdue).map(bill => (
                                    <TableRow key={bill.id}>
                                      <TableCell>{bill.partyName}</TableCell>
                                      <TableCell>{bill.vakkal}</TableCell>
                                      <TableCell className="text-right">{bill.daysOverdue}</TableCell>
                                      <TableCell className="text-right font-semibold">₹{bill.balance.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No invoices in this bucket.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


export function OutstandingClient() {
  const [hydrated, setHydrated] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState<string | undefined>();
  const { financialYear: currentFinancialYearString } = useSettings();
  const router = useRouter();

  useEffect(() => { setHydrated(true) }, []);

  const [purchases] = useLocalStorageState<Purchase[]>(keys.purchases, [], purchaseMigrator);
  const [sales] = useLocalStorageState<Sale[]>(keys.sales, [], salesMigrator);
  const [receipts] = useLocalStorageState<Receipt[]>(keys.receipts, []);
  const [payments] = useLocalStorageState<Payment[]>(keys.payments, []);
  const [purchaseReturns] = useLocalStorageState<PurchaseReturn[]>(keys.purchaseReturns, []);
  const [saleReturns] = useLocalStorageState<SaleReturn[]>(keys.saleReturns, []);
  
  const [customers] = useLocalStorageState<MasterItem[]>(keys.customers, []);
  const [suppliers] = useLocalStorageState<MasterItem[]>(keys.suppliers, []);
  const [agents] = useLocalStorageState<MasterItem[]>(keys.agents, []);
  const [brokers] = useLocalStorageState<MasterItem[]>(keys.brokers, []);

  const allMasters = useMemo(() => [...customers, ...suppliers, ...agents, ...brokers], [customers, suppliers, agents, brokers]);
  
  const outstandingData = useMemo((): OutstandingParty[] => {
    if (!hydrated) return [];
    
    const partyBalances = new Map<string, { party: MasterItem, balance: number, bills: OutstandingBill[] }>();

    // Initialize all parties
    allMasters.forEach(party => {
      partyBalances.set(party.id, {
        party: party,
        balance: party.openingBalanceType === 'Cr' ? -(party.openingBalance || 0) : (party.openingBalance || 0),
        bills: []
      });
    });

    const allTransactions = [
        ...purchases.map(p => ({ ...p, txType: 'Purchase' as const })),
        ...sales.map(s => ({ ...s, txType: 'Sale' as const })),
        ...receipts.map(r => ({ ...r, txType: 'Receipt' as const })),
        ...payments.map(p => ({ ...p, txType: 'Payment' as const })),
        ...purchaseReturns.map(pr => ({ ...pr, txType: 'PurchaseReturn' as const })),
        ...saleReturns.map(sr => ({ ...sr, txType: 'SaleReturn' as const }))
    ].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());


    const billPaidAmounts = new Map<string, number>();

    allTransactions.forEach(tx => {
        if (tx.txType === 'Receipt' || tx.txType === 'Payment') {
            (tx.againstBills || []).forEach(ab => {
                billPaidAmounts.set(ab.billId, (billPaidAmounts.get(ab.billId) || 0) + ab.amount);
            });
        }
    });
    
    allTransactions.forEach(tx => {
      let partyId: string | undefined;
      
      if (tx.txType === 'Sale') {
        partyId = tx.customerId; // Customer is always the primary party for a sale
        if(partyId && partyBalances.has(partyId)) {
          const partyData = partyBalances.get(partyId)!;
          partyData.balance += tx.billedAmount;
          const paid = billPaidAmounts.get(tx.id) || 0;
          if(tx.billedAmount - paid > 0.01) {
              partyData.bills.push({
                id: tx.id, type: 'Sale', date: tx.date, vakkal: tx.billNumber || tx.items.map(i => i.lotNumber).join(', '),
                totalAmount: tx.billedAmount, paid: paid, balance: tx.billedAmount - paid,
                daysOverdue: differenceInDays(new Date(), parseISO(tx.date)),
                partyName: partyData.party.name // Added for detail view
              });
          }
        }
        // If there's a broker, we might need separate logic for them.
        // For now, sales affect customer balance.
      } else if (tx.txType === 'Purchase') {
        partyId = tx.supplierId;
        if(partyId && partyBalances.has(partyId)) {
          const partyData = partyBalances.get(partyId)!;
          partyData.balance -= tx.totalAmount;
          const paid = billPaidAmounts.get(tx.id) || 0;
           if (tx.totalAmount - paid > 0.01) {
            partyData.bills.push({
              id: tx.id, type: 'Purchase', date: tx.date, vakkal: tx.items.map(i => i.lotNumber).join(', '),
              totalAmount: tx.totalAmount, paid: paid, balance: tx.totalAmount - paid,
              daysOverdue: differenceInDays(new Date(), parseISO(tx.date)),
              partyName: partyData.party.name // Added for detail view
            });
           }
        }
        // Handle agent if necessary
      } else if (tx.txType === 'Receipt') {
        partyId = tx.partyId;
        if(partyId && partyBalances.has(partyId)) {
          partyBalances.get(partyId)!.balance -= (tx.amount + (tx.cashDiscount || 0));
        }
      } else if (tx.txType === 'Payment') {
        partyId = tx.partyId;
        if(partyId && partyBalances.has(partyId)) {
          partyBalances.get(partyId)!.balance += tx.amount;
        }
      } else if (tx.txType === 'SaleReturn') {
         const originalSale = sales.find(s => s.id === tx.originalSaleId);
         if (originalSale) {
           partyId = originalSale.customerId;
           if(partyId && partyBalances.has(partyId)) {
             partyBalances.get(partyId)!.balance -= tx.returnAmount;
           }
         }
      } else if (tx.txType === 'PurchaseReturn') {
         const originalPurchase = purchases.find(p => p.id === tx.originalPurchaseId);
         if (originalPurchase) {
           partyId = originalPurchase.supplierId;
           if(partyId && partyBalances.has(partyId)) {
             partyBalances.get(partyId)!.balance += tx.returnAmount;
           }
         }
      }
    });

    return Array.from(partyBalances.values())
        .filter(p => Math.abs(p.balance) > 0.01)
        .map(p => ({
            partyId: p.party.id,
            partyName: p.party.name,
            partyType: p.party.type,
            balance: p.balance,
            bills: p.bills,
        }))
        .sort((a,b) => b.balance - a.balance);

  }, [hydrated, purchases, sales, receipts, payments, purchaseReturns, saleReturns, allMasters]);
  
  const partyOptions = useMemo(() => {
    return outstandingData
        .map(p => ({ value: p.partyId, label: `${p.partyName} (${p.partyType})` }))
        .sort((a,b) => a.label.localeCompare(b.label));
  }, [outstandingData]);

  const filteredData = useMemo(() => {
    if (!selectedPartyId) return outstandingData;
    return outstandingData.filter(item => item.partyId === selectedPartyId);
  }, [outstandingData, selectedPartyId]);
  
  const totalReceivable = useMemo(() => filteredData.filter(p => p.balance > 0).reduce((sum, p) => sum + p.balance, 0), [filteredData]);
  const totalPayable = useMemo(() => filteredData.filter(p => p.balance < 0).reduce((sum, p) => sum + p.balance, 0), [filteredData]);


  if(!hydrated) return <div className="flex justify-center items-center h-full"><Card><CardHeader><CardTitle>Loading Outstanding Balances...</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2"></div></div></CardContent></Card></div>;

  return (
    <div className="space-y-4 print-area p-4 flex flex-col h-full">
        <PrintHeaderSymbol className="hidden print:block text-center text-lg font-semibold mb-4" />
        
        <div className="no-print">
            <h1 className="text-3xl font-bold text-foreground mb-4 flex items-center gap-3"><Users/>OUTSTANDING DASHBOARD</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/receipts" className="block group">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader><CardTitle className="text-base text-green-700">TOTAL RECEIVABLES</CardTitle></CardHeader>
                  <CardContent className="text-2xl text-green-600 font-bold">₹{totalReceivable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</CardContent>
                </Card>
              </Link>
              <Link href="/payments" className="block group">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader><CardTitle className="text-base text-orange-600">TOTAL PAYABLES</CardTitle></CardHeader>
                  <CardContent className="text-2xl text-orange-600 font-bold">₹{Math.abs(totalPayable).toLocaleString('en-IN', {minimumFractionDigits: 2})}</CardContent>
                </Card>
              </Link>
              <Card>
                <CardHeader><CardTitle className="text-base text-primary">NET OUTSTANDING</CardTitle></CardHeader>
                <CardContent className="text-2xl font-bold">₹{(totalReceivable + totalPayable).toLocaleString('en-IN', {minimumFractionDigits: 2})}</CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center my-4 gap-2">
                <MasterDataCombobox 
                    value={selectedPartyId}
                    onChange={(value) => setSelectedPartyId(value)}
                    options={partyOptions}
                    placeholder="FILTER BY PARTY..."
                    className="w-full md:w-1/3"
                />
                <Button variant="outline" size="icon" onClick={() => window.print()} title="Print"><Printer className="h-5 w-5" /></Button>
            </div>
        </div>

        <div className="flex-grow">
          <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold">Party-wise Summary</AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="h-[60vh] border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PARTY NAME</TableHead>
                            <TableHead>TYPE</TableHead>
                            <TableHead className="text-right">BALANCE (₹)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No outstanding balances.</TableCell></TableRow>}
                        {filteredData.map(party => (
                            <TableRow key={party.partyId} onClick={() => router.push(`/accounts-ledger?partyId=${party.partyId}`)} className="cursor-pointer hover:bg-muted/50 uppercase">
                                <TableCell className="font-medium">{party.partyName}</TableCell>
                                <TableCell><Badge variant="outline">{party.partyType}</Badge></TableCell>
                                <TableCell className={cn("text-right font-bold", party.balance > 0 ? "text-green-600" : "text-red-600")}>
                                    {party.balance.toLocaleString('en-IN', {minimumFractionDigits:2})} {party.balance > 0 ? 'Dr' : 'Cr'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold">Receivables Aging Report</AccordionTrigger>
              <AccordionContent>
                <AgingReport data={outstandingData} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
    </div>
  )
}
