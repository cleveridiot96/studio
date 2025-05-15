
import { PlaceholderContent } from "@/components/PlaceholderContent";
import { BookOpen } from "lucide-react";

export default function CashBookPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cash Book</h1>
          <p className="text-lg text-muted-foreground">Track your daily cash inflow and outflow in a T-format.</p>
        </div>
      </div>
      <PlaceholderContent
        title="Cash Book (T-Format)"
        description="This section will display your cash transactions in a classic T-account format. Receipts (Dr.) will be on the left, and Payments (Cr.) will be on the right, with running balances. This feature is currently under development."
        icon={BookOpen}
      />
      {/* TODO: Implement CashBookClient component with T-format table and summary */}
      {/* <CashBookClient /> */}
    </div>
  );
}
