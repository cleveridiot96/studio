import { PlaceholderContent } from "@/components/PlaceholderContent";
import { Boxes } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-lg text-muted-foreground">Track your stock in real-time across locations.</p>
        </div>
      </div>
      <PlaceholderContent 
        title="Inventory Tracking" 
        description="Real-time stock tracking by location (e.g., Mumbai, Chiplun) and editable warehouse table features are planned."
        icon={Boxes}
      />
      {/* TODO: Implement InventoryClient component with table (potentially editable) */}
      {/* <InventoryClient /> */}
    </div>
  );
}
