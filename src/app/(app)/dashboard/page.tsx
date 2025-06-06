
"use client";

import React, { useRef, type ChangeEvent } from 'react';
import DashboardClient from "@/components/app/dashboard/DashboardClient";
import { Separator } from "@/components/ui/separator";
import { DashboardTile } from "@/components/DashboardTile";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { exportDataToPortableFile, restoreDataFromFile, LAST_BACKUP_TIMESTAMP_KEY } from "@/lib/backupRestoreUtils";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol'; // Import the new component

export default function DashboardPage() {
  const { toast } = useToast();
  const [lastBackupTimestamp, setLastBackupTimestamp] = useLocalStorageState<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportClick = () => {
    exportDataToPortableFile({ toast, setLastBackupTimestamp, lastBackupTimestampFromState: lastBackupTimestamp });
  };

  const handleRestoreTriggerClick = () => {
    restoreFileInputRef.current?.click();
  };

  const handleRestoreFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    restoreDataFromFile(event, { toast, setLastBackupTimestamp });
  };

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
      title: "Backup Data",
      description: "Save your application data",
      iconName: "FileJson",
      className: "bg-sky-500 hover:bg-sky-600 text-white",
      action: handleExportClick,
    },
    {
      title: "Restore Data",
      description: "Load data from a backup file",
      iconName: "UploadCloud",
      className: "bg-emerald-500 hover:bg-emerald-600 text-white",
      action: handleRestoreTriggerClick,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PrintHeaderSymbol className="text-center text-lg font-semibold text-foreground mb-2" /> {/* Added here */}
      <div className="text-left">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Central Hub</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickActions.map((action) => (
          <DashboardTile key={action.title} {...action} onClick={action.action} />
        ))}
      </div>
      <input
        type="file"
        ref={restoreFileInputRef}
        accept=".json"
        onChange={handleRestoreFileChange}
        className="hidden"
        id="dashboard-restore-input"
      />
      <Separator className="my-4"/>
      <DashboardClient />
    </div>
  );
}
