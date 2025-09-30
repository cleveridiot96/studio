
"use client";

import React, { useRef, type ChangeEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { DashboardTile } from "@/components/DashboardTile";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { exportDataToPortableFile, restoreDataFromFile, LAST_BACKUP_TIMESTAMP_KEY } from "@/lib/backupRestoreUtils";
import { PrintHeaderSymbol } from '@/components/shared/PrintHeaderSymbol';
import { ProfitAnalysisClient } from '@/components/app/profit-analysis/ProfitAnalysisClient';
import { OutstandingSummary } from '@/components/app/dashboard/OutstandingSummary';

export default function DashboardPage() {
  const { toast } = useToast();
  const [lastBackupTimestamp, setLastBackupTimestamp] = useLocalStorageState<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleExportClick = useCallback(() => {
    exportDataToPortableFile({ toast, setLastBackupTimestamp, lastBackupTimestampFromState: lastBackupTimestamp });
  }, [toast, setLastBackupTimestamp, lastBackupTimestamp]);


  const handleRestoreTriggerClick = useCallback(() => {
    restoreFileInputRef.current?.click();
  }, []);

  const handleRestoreFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    restoreDataFromFile(event, { toast, setLastBackupTimestamp });
  }, [toast, setLastBackupTimestamp]);
  
  // Custom event listeners for global shortcuts
  useEffect(() => {
    window.addEventListener('trigger-backup', handleExportClick);
    window.addEventListener('trigger-restore', handleRestoreTriggerClick);
    return () => {
      window.removeEventListener('trigger-backup', handleExportClick);
      window.removeEventListener('trigger-restore', handleRestoreTriggerClick);
    };
  }, [handleExportClick, handleRestoreTriggerClick]);


  const quickActions = [
    {
      title: "Purchases",
      description: "Record and manage purchases",
      href: "/purchases",
      iconName: "ShoppingCart",
      className: "from-purple-500 to-purple-700 text-white",
      shortcut: "Alt + P",
    },
    {
      title: "Sales",
      description: "Create and manage sales",
      href: "/sales",
      iconName: "Receipt",
      className: "from-blue-500 to-blue-700 text-white",
      shortcut: "Alt + S",
    },
    {
      title: "Location Transfer",
      description: "Transfer stock between locations",
      href: "/location-transfer",
      iconName: "ArrowRightLeft",
      className: "from-cyan-500 to-cyan-700 text-white",
      shortcut: "Alt + L",
    },
    {
      title: "Inventory",
      description: "View and manage stock",
      href: "/inventory",
      iconName: "Package",
      className: "from-teal-500 to-teal-700 text-white",
      shortcut: "Alt + I",
    },
    {
      title: "Stock Ledger",
      description: "View party stock ledgers",
      href: "/ledger",
      iconName: "BookUser",
      className: "from-red-700 to-red-900 text-white",
      shortcut: "Alt + K",
    },
    {
      title: "Accounts Ledger",
      description: "View party financial statements",
      href: "/accounts-ledger",
      iconName: "BookCopy",
      className: "from-[#1beec7] to-[#14b8a6] text-black",
      shortcut: "Alt + A",
    },
     {
      title: "Cash Book",
      description: "Track cash transactions",
      href: "/cashbook",
      iconName: "BookOpen",
      className: "from-pink-500 to-pink-700 text-white",
      shortcut: "Alt + C",
    },
     {
      title: "Daybook",
      description: "View all daily transactions",
      href: "/daybook",
      iconName: "BookMarked",
      className: "from-[#ffa5ab] to-[#fb7185] text-white",
      shortcut: "Alt + D",
    },
    {
      title: "Outstanding",
      description: "Receivables & Payables",
      href: "/outstanding",
      iconName: "ClipboardList",
      className: "from-yellow-400 to-yellow-600 text-black",
      shortcut: "Alt + O",
    },
    {
      title: "Profit Analysis",
      description: "View profit/loss reports",
      href: "/profit-analysis",
      iconName: "Rocket",
      className: "from-green-400 to-green-600 text-white",
      shortcut: "Alt + Shift + A",
    },
    {
      title: "Masters",
      description: "Manage people & companies",
      href: "/masters",
      iconName: "Users2",
      className: "from-sky-500 to-sky-700 text-white",
      shortcut: "Alt + M",
    },
    {
      title: "Backup Data",
      description: "Save your application data",
      iconName: "FileJson",
      className: "from-sky-400 to-sky-600 text-white",
      action: handleExportClick,
      shortcut: "Alt + B",
    },
    {
      title: "Restore Data",
      description: "Load data from a backup file",
      iconName: "UploadCloud",
      className: "from-emerald-400 to-emerald-600 text-white",
      action: handleRestoreTriggerClick,
      shortcut: "Alt + V",
    },
     {
      title: "Payments",
      description: "Record outgoing payments",
      href: "/payments",
      iconName: "ArrowRightCircle",
      className: "from-red-500 to-red-700 text-white",
      shortcut: "Alt + Shift + P",
    },
    {
      title: "Receipts",
      description: "Record incoming payments",
      href: "/receipts",
      iconName: "ArrowLeftCircle",
      className: "from-green-500 to-green-700 text-white",
      shortcut: "Alt + R",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <PrintHeaderSymbol className="text-center text-lg font-semibold text-foreground mb-2" />
      <div className="text-left">
        <h1 className="text-2xl font-bold text-foreground uppercase">Dashboard Central Hub</h1>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
      <Separator className="my-2"/>
      <OutstandingSummary />
      <Separator className="my-6"/>
      <ProfitAnalysisClient/>
    </div>
  );
}
