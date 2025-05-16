'use client';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Placeholder components for each section
const SalesSummaryCard = () => (
  <Card className="p-4 bg-green-100">
    <h3 className="text-lg font-semibold mb-2">Sales Summary</h3>
    <p>Total Amount: ₹0</p>
    <p>Bags: 0</p>
    <p>Net Weight: 0 kg</p>
  </Card>
);

const PurchaseSummaryCard = () => (
  <Card className="p-4 bg-blue-100">
    <h3 className="text-lg font-semibold mb-2">Purchase Summary</h3>
    <p>Total Amount: ₹0</p>
    <p>Bags: 0</p>
    <p>Net Weight: 0 kg</p>
  </Card>
);

const StockCard = () => (
  <Card className="p-4 bg-yellow-100">
    <h3 className="text-lg font-semibold mb-2">Stock</h3>
    <p>Total Bags: 0</p>
    <div className="grid grid-cols-3 gap-2 mt-2">
      <div>Mumbai: 0</div>
      <div>Chiplun: 0</div>
      <div>Sawantwadi: 0</div>
    </div>
  </Card>
);

const ProfitAnalysisTable = () => (
  <Card className="p-4">
    <h3 className="text-lg font-semibold mb-4 text-center">Profit Analysis</h3>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <h4 className="text-md font-semibold mb-2">Profit & Loss Statement</h4>
        <Table>
          <TableCaption>Transaction-wise</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Purchase</TableHead>
              <TableHead>Sale</TableHead>
              <TableHead>Qty (kg)</TableHead>
              <TableHead>Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center">No transaction data available</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div>
        <h4 className="text-md font-semibold mb-2">Month-wise</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2} className="text-center">No monthly data available</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
    <div className="mt-4 text-right text-lg font-semibold">
      Total Profit/Loss: ₹0.00
    </div>
  </Card>
);


const DashboardClient = () => {
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SalesSummaryCard />
        <PurchaseSummaryCard />
        <StockCard />
      </div>
      <ProfitAnalysisTable />
    </div>
  );
};

export default DashboardClient;