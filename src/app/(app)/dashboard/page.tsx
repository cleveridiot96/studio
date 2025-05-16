import DashboardClient from "@/components/app/dashboard/DashboardClient";
import { Separator } from "@/components/ui/separator";
import { DashboardTile } from "@/components/DashboardTile";

const quickActions = [
 {
    title: "Purchases",
 description: "Record and manage purchases",
    href: "/purchases",
 iconName: "ShoppingCart",
    className: "bg-purple-600 text-white",
  },
  {
    title: "Sales",
 description: "Create and manage sales",
    href: "/sales",
    iconName: "TrendingUp",
    className: "bg-blue-600 text-white",
  },
  {
    title: "Inventory",
 description: "View and manage stock",
    href: "/inventory",
    iconName: "Package",
    className: "bg-teal-600 text-white",
  },
  {
    title: "Stock Report",
 description: "Real-time stock analysis",
    href: "/stock-report",
    iconName: "TrendingDown",
    className: "bg-orange-600 text-white",
},
{
    title: "Location Transfer",
 description: "Transfer stock between locations",
    href: "/location-transfer",
    iconName: "ArrowRightLeft",
 className: "bg-orange-600 text-white",
},
{
    title: "Payments",
 description: "Record outgoing payments",
    href: "/payments",
 iconName: "DollarSign",
    className: "bg-red-600 text-white",
},
{
    title: "Receipts",
 description: "Manage incoming payments",
    href: "/receipts",
 iconName: "Receipt",
    className: "bg-green-600 text-white",
},
{
    title: "Master Data",
    description: "Manage people & companies",
 href: "/masters",
    iconName: "Users",
    className: "bg-blue-600 text-white",
},
{
    title: "Cash Book",
    description: "Track cash transactions",
    href: "/cashbook",
 iconName: "DollarSign",
    className: "bg-pink-600 text-white",
  },
  {
    title: "Party Ledger",
    description: "View party balances",
    href: "/ledger",
 iconName: "BookUser",
    className: "bg-gray-700 text-white",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <DashboardTile key={action.title} {...action} />
        ))}
      </div>
      <Separator />
      <DashboardClient />
    </div>
  );
}
