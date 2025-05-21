
import DashboardClient from "@/components/app/dashboard/DashboardClient";
import { Separator } from "@/components/ui/separator";
import BackupRestoreTile from "@/components/BackupRestoreTile";
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
    iconName: "Receipt",
    className: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    title: "Inventory",
    description: "View and manage stock",
    href: "/inventory",
    iconName: "Package",
    className: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  {
    title: "Stock Report",
    description: "Real-time stock analysis",
    href: "/stock-report",
    iconName: "FileText",
    className: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  {
    title: "Location Transfer",
    description: "Transfer stock between locations",
    href: "/location-transfer",
    iconName: "ArrowRightLeft",
    className: "bg-cyan-600 hover:bg-cyan-700 text-white",
  },
  {
    title: "Payments",
    description: "Record outgoing payments",
    href: "/payments",
    iconName: "ArrowRightCircle",
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
  {
    title: "Receipts",
    description: "Manage incoming payments",
    href: "/receipts",
    iconName: "ArrowLeftCircle",
    className: "bg-green-600 hover:bg-green-700 text-white",
  },
  {
    title: "Master Data",
    description: "Manage people & companies",
    href: "/masters",
    iconName: "Users",
    className: "bg-sky-600 hover:bg-sky-700 text-white",
  },
  {
    title: "Cash Book",
    description: "Track cash transactions",
    href: "/cashbook",
    iconName: "BookOpen",
    className: "bg-pink-600 hover:bg-pink-700 text-white",
  },
  {
    title: "Party Ledger",
    description: "View party balances",
    href: "/ledger",
    iconName: "BookUser",
    className: "bg-gray-700 hover:bg-gray-800 text-white",
  },
  {
    title: "Profit Analysis",
    description: "View profit/loss reports",
    href: "/profit-analysis",
    iconName: "Rocket", 
    className: "bg-green-500 hover:bg-green-600 text-white",
  },
  {
    type: 'backup-restore',
    backupLink: '/backup',
    restoreLink: '/restore',
    backupLabel: 'Backup',
    restoreLabel: 'Restore',
    backupColor: 'bg-blue-500 hover:bg-blue-600',
    restoreColor: 'bg-green-500 hover:bg-green-600',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
       <div className="text-left">
        <h1 className="text-3xl font-bold text-foreground">Quick Actions</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickActions.map((action) => {
          if (action.type === 'backup-restore') {
            return (
              <BackupRestoreTile
                key="backup-restore" // Use a unique key for this specific tile
                backupLink={action.backupLink}
                restoreLink={action.restoreLink}
                backupLabel={action.backupLabel}
                restoreLabel={action.restoreLabel}
                backupColor={action.backupColor}
                restoreColor={action.restoreColor}
              />
            );
          }
          return <DashboardTile key={action.title} {...action} />;
        })}
      </div>
      <Separator className="my-4"/>
      <DashboardClient />
    </div>
  );
}
