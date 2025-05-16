
import DashboardClient from "@/components/app/dashboard/DashboardClient";
import { Separator } from "@/components/ui/separator";
import { DashboardTile } from "@/components/DashboardTile";

const quickActions = [
 {
    title: "Purchases",
    description: "Record and manage purchases",
    href: "/purchases",
    iconName: "ShoppingCart",
    className: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  {
    title: "Sales",
    description: "Create and manage sales",
    href: "/sales",
    iconName: "Receipt", // Updated to match Sales nav item
    className: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    title: "Inventory",
    description: "View and manage stock",
    href: "/inventory",
    iconName: "Package", // Package is a common icon for inventory
    className: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  {
    title: "Stock Report",
    description: "Real-time stock analysis",
    href: "/stock-report",
    iconName: "TrendingDown", // Changed icon
    className: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  {
    title: "Location Transfer",
    description: "Transfer stock between locations",
    href: "/location-transfer",
    iconName: "ArrowRightLeft",
    className: "bg-cyan-600 hover:bg-cyan-700 text-white", // Different color
  },
  {
    title: "Payments",
    description: "Record outgoing payments",
    href: "/payments",
    iconName: "ArrowRightCircle", // Consistent with nav
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
  {
    title: "Receipts",
    description: "Manage incoming payments",
    href: "/receipts",
    iconName: "ArrowLeftCircle", // Consistent with nav
    className: "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    title: "Master Data",
    description: "Manage people & companies",
    href: "/masters",
    iconName: "Users", // Consistent with nav Users2
    className: "bg-sky-600 hover:bg-sky-700 text-white", // Different color
  },
  {
    title: "Cash Book",
    description: "Track cash transactions",
    href: "/cashbook",
    iconName: "BookOpen", // Consistent with nav
    className: "bg-pink-600 hover:bg-pink-700 text-white",
  },
  {
    title: "Party Ledger",
    description: "View party balances",
    href: "/ledger",
    iconName: "BookUser", // Consistent with nav
    className: "bg-gray-700 hover:bg-gray-800 text-white",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
       <div className="text-left"> {/* Changed from text-center */}
        <h1 className="text-3xl font-bold text-foreground">Quick Actions</h1>
        {/* <p className="text-lg text-muted-foreground mt-1">Access key modules of the application.</p> Removed as per user request */}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> {/* Adjusted grid columns */}
        {quickActions.map((action) => (
          <DashboardTile key={action.title} {...action} />
        ))}
      </div>
      {/* DashboardClient placeholder can be re-enabled or replaced with actual summary components later */}
      {/* <Separator /> */}
      {/* <DashboardClient /> */}
    </div>
  );
}
