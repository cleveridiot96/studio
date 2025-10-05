
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
import { LowStockWarning } from '@/components/app/dashboard/LowStockWarning';
import { navItems } from '@/lib/config/nav';

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
    ...navItems.filter(item => item.href !== '/dashboard' && item.href !== '/backup'), // Exclude dashboard & backup from its own page
    {
      title: "Backup Data",
      description: "Save your application data",
      iconName: "FileJson",
      className: "bg-sky-500 hover:bg-sky-600 text-white",
      action: handleExportClick,
      shortcut: "Alt + B",
    },
    {
      title: "Restore Data",
      description: "Load data from a backup file",
      iconName: "UploadCloud",
      className: "bg-emerald-500 hover:bg-emerald-600 text-white",
      action: handleRestoreTriggerClick,
      shortcut: "Alt + V",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <PrintHeaderSymbol className="text-center text-lg font-semibold text-foreground mb-2" />
      <div className="text-left">
        <h1 className="text-2xl font-bold text-foreground uppercase">Dashboard Central Hub</h1>
      </div>
      <LowStockWarning />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickActions.map((action) => (
           <DashboardTile
            key={action.title}
            title={action.title}
            description={action.description}
            href={action.href}
            iconName={action.iconName}
            className={action.className || (action as any).iconColor}
            onClick={(action as any).action}
            shortcut={action.shortcut}
          />
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
