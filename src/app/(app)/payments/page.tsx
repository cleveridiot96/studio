import { PlaceholderContent } from "@/components/PlaceholderContent";
import { ArrowRightCircle } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-lg text-muted-foreground">Track payments made to suppliers and transporters.</p>
        </div>
      </div>
      <PlaceholderContent 
        title="Payment Tracking" 
        description="Functionality to track payments to suppliers and transporters is under development."
        icon={ArrowRightCircle}
      />
      {/* TODO: Implement PaymentsClient component with form and table */}
      {/* <PaymentsClient /> */}
    </div>
  );
}
