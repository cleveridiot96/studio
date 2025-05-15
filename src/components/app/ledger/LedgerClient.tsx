
"use client";
import * as React from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import type { MasterItem, Purchase, Sale, Payment, Receipt, MasterItemType } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { addDays, format, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { BookUser } from "lucide-react";

const MASTERS_KEYS = {
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  brokers: 'masterBrokers',
};
const TRANSACTIONS_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  payments: 'paymentsData',
  receipts: 'receiptsData',
};

interface LedgerTransaction {
  date: string; // YYYY-MM-DD
  type: string; // e.g., 'Purchase', 'Sale', 'Payment', 'Receipt'
  refNo?: string; // Bill No, Inv No, etc.
  particulars: string;
  debit?: number;
  credit?: number;
  relatedDocId: string; // ID of the original purchase/sale/payment/receipt
}

interface LedgerEntryWithBalance extends LedgerTransaction {
  balance: number;
  // For Tally-style bill-wise details (future enhancement)
  // openingAmount?: number;
  // pendingAmount?: number;
  // dueDate?: string;
  // overdueDays?: number;
}

export function LedgerClient() {
  const [allMasters, setAllMasters] = React.useState<MasterItem[]>([]);
  const [purchases] = useLocalStorageState<Purchase[]>(TRANSACTIONS_KEYS.purchases, []);
  const [sales] = useLocalStorageState<Sale[]>(TRANSACTIONS_KEYS.sales, []);
  const [payments] = useLocalStorageState<Payment[]>(TRANSACTIONS_KEYS.payments, []);
  const [receipts] = useLocalStorageState<Receipt[]>(TRANSACTIONS_KEYS.receipts, []);

  const [selectedPartyId, setSelectedPartyId] = React.useState<string | undefined>();
  const [selectedPartyType, setSelectedPartyType] = React.useState<MasterItemType | undefined>();

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -90)), // Default to last 90 days
    to: endOfDay(new Date()),
  });

  React.useEffect(() => {
    const loadedMasters: MasterItem[] = [];
    Object.values(MASTERS_KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        loadedMasters.push(...JSON.parse(data));
      }
    });
    setAllMasters(loadedMasters.sort((a,b) => a.name.localeCompare(b.name)));
  }, []);

  const ledgerTransactions = React.useMemo(() => {
    if (!selectedPartyId) return { entries: [], openingBalance: 0, closingBalance: 0 }; // Ensure consistent object structure

    const partyTransactions: LedgerTransaction[] = [];
    const party = allMasters.find(m => m.id === selectedPartyId);
    if (!party) return { entries: [], openingBalance: 0, closingBalance: 0 }; // Ensure consistent object structure

    // Purchases: Party is Supplier (Credit), Agent (Debit for commission earned by agent, payable by us), Transporter (Debit for cost), Broker (Debit for cost)
    purchases.forEach(p => {
      if (p.supplierId === selectedPartyId) {
        partyTransactions.push({ relatedDocId: p.id, date: p.date, type: 'Purchase', refNo: p.lotNumber, particulars: `Goods purchased (Lot: ${p.lotNumber})`, credit: p.totalAmount });
      }
      if (p.agentId === selectedPartyId && p.agentName) { // Agent Commission is a payable for us
         // This logic needs refinement based on how agent commission is accounted as payable
         // For now, assuming agent ledger shows credit for commission DUE TO them from us
        const commission = (p.totalAmount * (party.commission || 0) / 100); // Example calc, actual might differ
        if (commission > 0) partyTransactions.push({ relatedDocId: p.id, date: p.date, type: 'Agent Comm.', refNo: p.lotNumber, particulars: `Commission on Lot ${p.lotNumber}`, credit: commission });
      }
      if (p.transporterId === selectedPartyId && p.transportRate) {
        partyTransactions.push({ relatedDocId: p.id, date: p.date, type: 'Transport Exp.', refNo: p.lotNumber, particulars: `Transport for Lot ${p.lotNumber}`, credit: p.transportRate });
      }
      if (p.brokerId === selectedPartyId && p.calculatedBrokerageAmount) {
         partyTransactions.push({ relatedDocId: p.id, date: p.date, type: 'Brokerage Exp.', refNo: p.lotNumber, particulars: `Brokerage for Lot ${p.lotNumber}`, credit: p.calculatedBrokerageAmount });
      }
    });

    // Sales: Party is Customer (Debit), Broker (Credit for commission earned by broker)
    sales.forEach(s => {
      if (s.customerId === selectedPartyId) {
        partyTransactions.push({ relatedDocId: s.id, date: s.date, type: 'Sale', refNo: s.billNumber, particulars: `Goods sold (Bill: ${s.billNumber}, Lot: ${s.lotNumber})`, debit: s.totalAmount });
      }
      if (s.brokerId === selectedPartyId && s.brokerageAmount && party.commission) { // Broker commission is income for broker
        const saleBrokerage = s.brokerageType === 'Percentage' ? (s.totalAmount * (s.brokerageAmount/100)) : s.brokerageAmount;
        if (saleBrokerage > 0) partyTransactions.push({ relatedDocId: s.id, date: s.date, type: 'Brokerage Inc.', refNo: s.billNumber, particulars: `Brokerage on Sale ${s.billNumber}`, debit: saleBrokerage });
      }
       if (s.transporterId === selectedPartyId && s.transportCost) { // Transport cost on sale, if paid by us to transporter for customer
        partyTransactions.push({ relatedDocId: s.id, date: s.date, type: 'Transport Exp.', refNo: s.billNumber, particulars: `Transport for Sale ${s.billNumber}`, credit: s.transportCost });
      }
    });

    // Payments: Party is Supplier/Agent/Broker/Transporter (Debit to their account)
    payments.forEach(pm => {
      if (pm.partyId === selectedPartyId) {
        partyTransactions.push({ relatedDocId: pm.id, date: pm.date, type: 'Payment', refNo: pm.referenceNo, particulars: `Payment via ${pm.paymentMethod} ${pm.notes ? '- '+pm.notes : ''}`, debit: pm.amount });
      }
    });

    // Receipts: Party is Customer/Broker (Credit to their account)
    receipts.forEach(rc => {
      if (rc.partyId === selectedPartyId) {
        partyTransactions.push({ relatedDocId: rc.id, date: rc.date, type: 'Receipt', refNo: rc.referenceNo, particulars: `Receipt via ${rc.paymentMethod} ${rc.notes ? '- '+rc.notes : ''}`, credit: rc.amount });
      }
    });
    
    // Filter by date range
    const dateFilteredTransactions = partyTransactions.filter(t => {
        const transactionDate = parseISO(t.date);
        return isWithinInterval(transactionDate, { start: startOfDay(dateRange?.from || new Date(0)), end: endOfDay(dateRange?.to || new Date()) });
    });


    // Sort and calculate running balance
    dateFilteredTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let balance = 0;
    // Calculate opening balance before the start of the selected date range
    partyTransactions.forEach(t => {
        if (new Date(t.date) < startOfDay(dateRange?.from || new Date(0) )) {
            balance += (t.debit || 0) - (t.credit || 0);
        }
    });
    const openingBalanceForPeriod = balance;


    const entriesWithBalance: LedgerEntryWithBalance[] = dateFilteredTransactions.map(t => {
      balance += (t.debit || 0) - (t.credit || 0);
      return { ...t, balance };
    });

    return { entries: entriesWithBalance, openingBalance: openingBalanceForPeriod, closingBalance: balance };

  }, [selectedPartyId, allMasters, purchases, sales, payments, receipts, dateRange]);

  const handlePartySelect = (value: string) => {
    const party = allMasters.find(p => p.id === value);
    setSelectedPartyId(value);
    setSelectedPartyType(party?.type);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Party Ledger</h1>
          <p className="text-lg text-muted-foreground">View outstanding balances and transaction history party-wise.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Select onValueChange={handlePartySelect} value={selectedPartyId}>
                <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select Party..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Customers</SelectLabel>
                        {allMasters.filter(m => m.type === 'Customer').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectGroup>
                    <SelectGroup>
                        <SelectLabel>Suppliers</SelectLabel>
                        {allMasters.filter(m => m.type === 'Supplier').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectGroup>
                    <SelectGroup>
                        <SelectLabel>Agents</SelectLabel>
                        {allMasters.filter(m => m.type === 'Agent').map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectGroup>
                     <SelectGroup>
                        <SelectLabel>Brokers</SelectLabel>
                        {allMasters.filter(m => m.type === 'Broker').map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectGroup>
                     <SelectGroup>
                        <SelectLabel>Transporters</SelectLabel>
                        {allMasters.filter(m => m.type === 'Transporter').map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectGroup>
                </SelectContent>
            </Select>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-full md:w-auto"/>
        </div>
      </div>

      {selectedPartyId ? (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-primary flex items-center">
                <BookUser className="mr-3 h-7 w-7" /> Ledger: {allMasters.find(p=>p.id === selectedPartyId)?.name} ({selectedPartyType})
            </CardTitle>
            <CardDescription>
                Transactions from {dateRange?.from ? format(dateRange.from, "PPP") : "start"} to {dateRange?.to ? format(dateRange.to, "PPP") : "end"}.
                Opening Balance for period: ₹{ledgerTransactions?.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Vch Type</TableHead>
                    <TableHead>Ref. No.</TableHead>
                    <TableHead className="text-right">Debit (₹)</TableHead>
                    <TableHead className="text-right">Credit (₹)</TableHead>
                    <TableHead className="text-right">Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerTransactions && ledgerTransactions.entries.length > 0 ? (
                    ledgerTransactions.entries.map((entry, index) => (
                      <TableRow key={`${entry.relatedDocId}-${index}`}>
                        <TableCell>{format(parseISO(entry.date), "dd-MM-yy")}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.particulars}</TableCell>
                        <TableCell>{entry.type}</TableCell>
                        <TableCell>{entry.refNo || 'N/A'}</TableCell>
                        <TableCell className="text-right">{entry.debit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</TableCell>
                        <TableCell className="text-right">{entry.credit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}</TableCell>
                        <TableCell className={`text-right font-semibold ${entry.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {Math.abs(entry.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {entry.balance < 0 ? 'Cr' : 'Dr'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-32">
                        No transactions for this party in the selected period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {ledgerTransactions && ledgerTransactions.entries.length > 0 && (
                    <TableFooter>
                        <TableRow className="bg-muted/80 font-bold">
                            <TableCell colSpan={6} className="text-right">Closing Balance:</TableCell>
                            <TableCell className={`text-right ${ledgerTransactions.closingBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {Math.abs(ledgerTransactions.closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {ledgerTransactions.closingBalance < 0 ? 'Cr' : 'Dr'}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                )}
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20 min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <BookUser className="h-16 w-16 text-accent mb-4 mx-auto" />
            <p className="text-xl text-muted-foreground">Please select a party to view their ledger.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

