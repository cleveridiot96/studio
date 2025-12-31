

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
import { navItems, type StyledNavItem } from '@/lib/config/nav';
import { useSettings } from '@/contexts/SettingsContext';
import { WarehouseSummary } from '@/components/app/dashboard/WarehouseSummary';
import { useAppData } from '@/contexts/AppDataContext';

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { financialYear } = useSettings();
  const { saveDataToFile } = useAppData();

  const handleSaveClick = useCallback(async () => {
    await saveDataToFile();
    toast({ title: "Success", description: "Your data has been saved." });
  }, [saveDataToFile, toast]);

  return (
    <div className="flex flex-col gap-6">
      <PrintHeaderSymbol className="text-center text-lg font-semibold text-foreground mb-2" />
      <div className="text-left">
        <h1 className="text-2xl font-bold text-foreground uppercase">Dashboard (FY {financialYear})</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardTile
          title="Save Data"
          description="Save all your data to a file"
          iconName="Save"
          onClick={handleSaveClick}
          isSaveButton={true}
          shortcut="Ctrl+S"
        />
        {navItems.map((action) => {
          const styledAction = action as StyledNavItem;
          return (
            <DashboardTile
              key={action.title}
              title={action.title}
              description={action.description}
              href={action.href !== '#' ? action.href : undefined}
              iconName={action.iconName}
              className={styledAction.style?.color as string || 'text-foreground'} // Pass text color
              style={styledAction.style} // Pass background style
              shortcut={action.shortcut}
            />
          );
        })}
      </div>
      
      <WarehouseSummary />
      <OutstandingSummary />
      <ProfitAnalysisClient/>
    </div>
  );
}
