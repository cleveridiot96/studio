
"use client";

import { format } from 'date-fns';
import type { ChangeEvent } from 'react';

// Define the keys for data stored in localStorage
export const LOCAL_STORAGE_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData',
  payments: 'paymentsData',
  locationTransfers: 'locationTransfersData',
  purchaseReturns: 'purchaseReturnsData', // Added
  saleReturns: 'saleReturnsData',       // Added
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  warehouses: 'masterWarehouses',
  brokers: 'masterBrokers',
  settingsFontSize: 'appFontSize',
  settingsFinancialYear: 'appFinancialYear',
};
export const LAST_BACKUP_TIMESTAMP_KEY = 'lastBackupTimestamp';

interface ToastFn {
  (options: { title: string; description?: string; variant?: 'default' | 'destructive'; duration?: number }): void;
}

interface BackupRestoreParams {
  toast: ToastFn;
  setLastBackupTimestamp: (timestamp: number | null | ((prev: number | null) => number | null)) => void;
  lastBackupTimestampFromState: number | null; // To include in backup
}

export const exportDataToPortableFile = ({ toast, setLastBackupTimestamp, lastBackupTimestampFromState }: BackupRestoreParams) => {
  if (typeof window === 'undefined') return;
  try {
    const backupData: Record<string, any> = {};
    // Gather all specified LOCAL_STORAGE_KEYS values
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item !== null) {
        try {
          backupData[key] = JSON.parse(item);
        } catch (e) {
          backupData[key] = item;
        }
      }
    });

    // Also include lastBackupTimestamp itself if it exists from state
    if (lastBackupTimestampFromState !== null) {
        backupData[LAST_BACKUP_TIMESTAMP_KEY] = lastBackupTimestampFromState;
    }


    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    
    const now = new Date();
    const formattedDate = format(now, 'ddMMyy_HHmm');
    link.download = `KisanKhataSahayak_${formattedDate}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);

    const currentTimestamp = Date.now();
    setLastBackupTimestamp(currentTimestamp);

    toast({
      title: "Portable Export Successful",
      description: "Your data has been exported to a portable JSON file.",
    });
  } catch (error) {
    console.error("Portable Export failed:", error);
    toast({
      title: "Portable Export Failed",
      description: "An error occurred while creating the portable JSON backup.",
      variant: "destructive",
    });
  }
};

export const restoreDataFromFile = (
  event: ChangeEvent<HTMLInputElement>,
  { toast, setLastBackupTimestamp }: Omit<BackupRestoreParams, 'lastBackupTimestampFromState'>
) => {
  if (typeof window === 'undefined') return;
  const file = event.target.files?.[0];
  if (!file) {
    toast({ title: "No file selected", description: "Please select a backup file to restore.", variant: "destructive" });
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const jsonString = e.target?.result as string;
      const restoredData = JSON.parse(jsonString);

      let restoreSuccess = false;
      for (const keyInBackup in restoredData) {
        const appKeyMatch = Object.values(LOCAL_STORAGE_KEYS).find(k => k === keyInBackup);
        
        if (appKeyMatch || keyInBackup === LAST_BACKUP_TIMESTAMP_KEY) {
           const targetKey = keyInBackup;
           if (typeof restoredData[targetKey] === 'string') {
              localStorage.setItem(targetKey, restoredData[targetKey]);
           } else {
              localStorage.setItem(targetKey, JSON.stringify(restoredData[targetKey]));
           }
          restoreSuccess = true;
          if (targetKey === LAST_BACKUP_TIMESTAMP_KEY && typeof restoredData[targetKey] === 'number') {
              setLastBackupTimestamp(restoredData[targetKey]);
          }
        }
      }
      
      if(restoreSuccess){
        toast({
          title: "Restore Successful",
          description: "Data has been restored from the backup file. Please refresh the application.",
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
          toast({
          title: "Restore Failed",
          description: "The backup file does not seem to contain valid application data for the defined keys.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Restore failed:", error);
      toast({
        title: "Restore Failed",
        description: "The selected file is not a valid backup file or is corrupted.",
        variant: "destructive",
      });
    } finally {
      if(event.target) event.target.value = ""; // Reset file input
    }
  };
  reader.readAsText(file);
};
