import { DashboardTile } from "@/components/DashboardTile";
import { navItems } from "@/lib/config/nav";
import { BarChart, DollarSign, Package, Users, LineChart, TrendingUp } from "lucide-react";

// Mock data - replace with actual data fetching
const summaryData = {
  totalPurchases: "₹1.2M",
  totalSales: "₹2.5M",
  inventoryValue: "₹800K",
  outstandingReceivables: "₹300K",
  outstandingPayables: "₹150K",
  activeCustomers: 78,
};

// Helper function to map nav items to dashboard tiles
const getDashboardTiles = () => {
  const tileMappings: { [key: string]: { icon: any, valueKey?: keyof typeof summaryData, description?: string, value?: string } } = {
    '/purchases': { icon: BarChart, valueKey: 'totalPurchases', description: 'Total Purchases YTD' },
    '/sales': { icon: DollarSign, valueKey: 'totalSales', description: 'Total Sales YTD' },
    '/inventory': { icon: Package, valueKey: 'inventoryValue', description: 'Current Inventory Value' },
    '/ledger': { icon: Users, valueKey: 'activeCustomers', description: 'Active Parties' }, // Placeholder, ledger is complex
    '/stock-report': { icon: LineChart, value: 'View Report', description: 'Analyze Stock Details' },
    '/payments': { icon: TrendingUp, valueKey: 'outstandingPayables', description: 'Total Payments Due' },
    // Add more as needed
  };

  return navItems.filter(item => item.href !== '/dashboard' && tileMappings[item.href]).map(item => {
    const mapping = tileMappings[item.href];
    return {
      title: item.title,
      // @ts-ignore
      value: mapping.valueKey ? summaryData[mapping.valueKey] : mapping.value || 'N/A',
      icon: mapping.icon,
      href: item.href,
      description: mapping.description,
    };
  });
};


export default function DashboardPage() {
  const dashboardTiles = getDashboardTiles();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Welcome to Kisan Khata</h1>
        <p className="text-lg text-muted-foreground mt-1">
          Your agricultural business at a glance.
        </p>
      </header>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Quick Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardTile title="Total Sales" value={summaryData.totalSales} icon={DollarSign} href="/sales" description="Year-to-Date" className="bg-green-50 dark:bg-green-900/30 border-green-500/50" valueClassName="text-green-600 dark:text-green-400"/>
          <DashboardTile title="Total Purchases" value={summaryData.totalPurchases} icon={ShoppingCart} href="/purchases" description="Year-to-Date" className="bg-blue-50 dark:bg-blue-900/30 border-blue-500/50" valueClassName="text-blue-600 dark:text-blue-400"/>
          <DashboardTile title="Inventory Value" value={summaryData.inventoryValue} icon={Package} href="/inventory" description="Current Stock Value" className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500/50" valueClassName="text-yellow-600 dark:text-yellow-400"/>
          <DashboardTile title="Receivables" value={summaryData.outstandingReceivables} icon={TrendingUp} href="/receipts" description="Outstanding from Customers" className="bg-purple-50 dark:bg-purple-900/30 border-purple-500/50" valueClassName="text-purple-600 dark:text-purple-400"/>
          <DashboardTile title="Payables" value={summaryData.outstandingPayables} icon={TrendingDown} href="/payments" description="Outstanding to Suppliers" className="bg-red-50 dark:bg-red-900/30 border-red-500/50" valueClassName="text-red-600 dark:text-red-400"/>
           <DashboardTile title="Active Parties" value={summaryData.activeCustomers} icon={Users} href="/ledger" description="Customers & Suppliers" className="bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500/50" valueClassName="text-indigo-600 dark:text-indigo-400"/>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-foreground mb-4">Manage Your Business</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {dashboardTiles.map((tile) => (
            <DashboardTile
              key={tile.href}
              title={tile.title}
              value={tile.value.toString()}
              icon={tile.icon}
              href={tile.href}
              description={tile.description}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// Dummy icons if not already imported
const ShoppingCart = BarChart; 
const TrendingDown = TrendingUp;
