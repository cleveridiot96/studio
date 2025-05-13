import { PlaceholderContent } from "@/components/PlaceholderContent";
import { ShoppingCart } from "lucide-react";

export default function PurchasesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchases</h1>
          <p className="text-lg text-muted-foreground">Add and manage your purchase records.</p>
        </div>
        {/* Button to Add Purchase will be part of the client component */}
      </div>
      <PlaceholderContent 
        title="Purchase Management" 
        description="Functionality to add, edit, and view purchases, link with agents, transporters, and warehouses is coming soon."
        icon={ShoppingCart}
      />
      {/* TODO: Implement PurchasesClient component with form and table */}
      {/* <PurchasesClient /> */}
    </div>
  );
}
