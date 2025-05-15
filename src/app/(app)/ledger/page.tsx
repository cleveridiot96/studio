
import { PlaceholderContent } from "@/components/PlaceholderContent";
import { BookUser } from "lucide-react";

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Party Ledger</h1>
          <p className="text-lg text-muted-foreground">View outstanding balances and transaction history party-wise in a T-format.</p>
        </div>
      </div>
      <PlaceholderContent
        title="Party Ledger (T-Format)"
        description="View detailed transaction history for each party (Customers, Suppliers, Agents, Brokers, Transporters) in a T-account format. Debits and Credits will be clearly shown, along with a running balance. This feature is under development."
        icon={BookUser}
      />
      {/* TODO: Implement LedgerClient component with party selection and T-format transaction table */}
      {/* <LedgerClient /> */}
    </div>
  );
}
