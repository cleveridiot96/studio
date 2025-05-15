
import { DashboardTile } from "@/components/DashboardTile";

// Define the tiles for the "Quick Actions" section
// These are manually defined to match the desired appearance and order
const quickActionTiles = [
  { 
    title: "Purchases", 
    description: "Record and manage purchases", 
    iconName: "ShoppingCart", 
    href: "/purchases", 
    className: "bg-purple-600 hover:bg-purple-700 text-white" 
  },
  { 
    title: "Sales", 
    description: "Create and manage sales", 
    iconName: "Receipt", 
    href: "/sales", 
    className: "bg-blue-600 hover:bg-blue-700 text-white" 
  },
  { 
    title: "Inventory", 
    description: "View and manage stock", 
    iconName: "Boxes", 
    href: "/inventory", 
    className: "bg-teal-500 hover:bg-teal-600 text-white" 
  },
  { 
    title: "Stock Report", 
    description: "Real-time stock analysis", 
    iconName: "FileText", 
    href: "/stock-report", 
    className: "bg-orange-500 hover:bg-orange-600 text-white" 
  },
  { 
    title: "Location Transfer", 
    description: "Transfer stock between locations", 
    iconName: "ArrowRightLeft", 
    href: "/location-transfer", 
    className: "bg-indigo-500 hover:bg-indigo-600 text-white" 
  },
  { 
    title: "Payments", 
    description: "Record outgoing payments", 
    iconName: "ArrowRightCircle", 
    href: "/payments", 
    className: "bg-red-600 hover:bg-red-700 text-white" 
  },
  { 
    title: "Receipts", 
    description: "Manage incoming payments", 
    iconName: "ArrowLeftCircle", 
    href: "/receipts", 
    className: "bg-green-600 hover:bg-green-700 text-white" 
  },
  { 
    title: "Master Data", 
    description: "Manage people & companies", 
    iconName: "Users2", 
    href: "/masters", 
    className: "bg-sky-600 hover:bg-sky-700 text-white" 
  },
  { 
    title: "Cash Book", 
    description: "Track cash transactions", 
    iconName: "BookOpen", 
    href: "/cashbook", 
    className: "bg-pink-600 hover:bg-pink-700 text-white" 
  },
  { 
    title: "Party Ledger", 
    description: "View party balances", 
    iconName: "BookUser", 
    href: "/ledger", 
    className: "bg-slate-700 hover:bg-slate-800 text-white" 
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Quick Actions</h1>
      </header>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {quickActionTiles.map((tile) => (
            <DashboardTile
              key={tile.href}
              title={tile.title}
              iconName={tile.iconName}
              href={tile.href}
              description={tile.description}
              className={tile.className}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
