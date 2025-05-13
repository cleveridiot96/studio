import { PlaceholderContent } from "@/components/PlaceholderContent";
import { Receipt } from "lucide-react";

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales</h1>
          <p className="text-lg text-muted-foreground">Generate sales bills and track sales records.</p>
        </div>
        {/* Button to Create Sale will be part of the client component */}
      </div>
      <PlaceholderContent 
        title="Sales Management" 
        description="Features for generating sales bills, auto-updating inventory, and printing receipts are under development."
        icon={Receipt}
      />
      {/* TODO: Implement SalesClient component with form and table */}
      {/* <SalesClient /> */}
    </div>
  );
}
