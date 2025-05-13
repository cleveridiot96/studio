import { PlaceholderContent } from "@/components/PlaceholderContent";
import { ArrowLeftCircle } from "lucide-react";

export default function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Receipts</h1>
          <p className="text-lg text-muted-foreground">Manage incoming payments from customers.</p>
        </div>
      </div>
      <PlaceholderContent 
        title="Receipt Management" 
        description="Features for managing incoming payments from customers are being developed."
        icon={ArrowLeftCircle}
      />
      {/* TODO: Implement ReceiptsClient component with form and table */}
      {/* <ReceiptsClient /> */}
    </div>
  );
}
