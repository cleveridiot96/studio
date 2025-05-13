import { PlaceholderContent } from "@/components/PlaceholderContent";
import { BookUser } from "lucide-react";

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ledger</h1>
          <p className="text-lg text-muted-foreground">View outstanding balances party-wise.</p>
        </div>
      </div>
      <PlaceholderContent 
        title="Ledger Accounts" 
        description="Viewing outstanding balances for suppliers, agents, and transporters is under development."
        icon={BookUser}
      />
      {/* TODO: Implement LedgerClient component with party selection and transaction table */}
      {/* <LedgerClient /> */}
    </div>
  );
}
