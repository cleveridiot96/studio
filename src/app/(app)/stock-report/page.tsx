import { PlaceholderContent } from "@/components/PlaceholderContent";
import { FileText } from "lucide-react";

export default function StockReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stock Report</h1>
          <p className="text-lg text-muted-foreground">Analyze your current stock with detailed reports.</p>
        </div>
      </div>
      <PlaceholderContent 
        title="Stock Analysis Report" 
        description="Detailed analysis of current stock by lot number, warehouse, weight, etc., will be available here."
        icon={FileText}
      />
      {/* TODO: Implement StockReportClient component with filters and table */}
      {/* <StockReportClient /> */}
    </div>
  );
}
