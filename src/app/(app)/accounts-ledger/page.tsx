import { PlaceholderContent } from "@/components/PlaceholderContent";
import { BookCopy } from "lucide-react";

export default function AccountsLedgerPage() {
  return (
    <PlaceholderContent 
      title="Accounts Ledger" 
      description="This module will provide a detailed view of financial transactions (debits/credits) for each party. It is currently under development." 
      icon={BookCopy}
    />
  );
}
