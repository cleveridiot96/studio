
import { PlaceholderContent } from "@/components/PlaceholderContent";
import { BookUser } from "lucide-react";

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Party Ledger</h1>
          <p className="text-lg text-muted-foreground">View outstanding balances and transaction history party-wise.</p>
        </div>
      </div>
      <PlaceholderContent
        title="Party-wise Transaction Ledger (T-Format & Bill-wise Details)"
        description="Select a party (Customer, Supplier, Agent, Broker, Transporter from Masters) to view their detailed transaction history. The report will be in a T-account format and also provide bill-wise details similar to Tally, showing Date, Ref. No., Opening Amount, Pending Amount, Due on, and Overdue by days for each transaction. Debits (Dr.) and Credits (Cr.) will be clearly shown, along with a running balance for the selected party. You'll be able to filter by date range and party type."
        icon={BookUser}
      />
      {/* TODO: Implement LedgerClient component with party selection (dropdown populated from Masters), date filters, and a T-format transaction table incorporating bill-wise details as shown in the example image. */}
      {/* <LedgerClient /> */}
    </div>
  );
}
