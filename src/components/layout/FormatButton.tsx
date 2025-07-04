
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  // AlertDialogDescription, // Intentionally removed as per user request
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Eraser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LOCAL_STORAGE_KEYS, LAST_BACKUP_TIMESTAMP_KEY } from '@/lib/backupRestoreUtils';
import { format } from 'date-fns';

// Define the keys for data stored in localStorage that need to be formatted
// These are the primary data arrays suitable for individual CSV export
const CSV_EXPORTABLE_KEYS_MAP: Record<string, string> = {
  [LOCAL_STORAGE_KEYS.purchases]: 'Purchases',
  [LOCAL_STORAGE_KEYS.sales]: 'Sales',
  [LOCAL_STORAGE_KEYS.receipts]: 'Receipts',
  [LOCAL_STORAGE_KEYS.payments]: 'Payments',
  [LOCAL_STORAGE_KEYS.locationTransfers]: 'LocationTransfers',
  [LOCAL_STORAGE_KEYS.purchaseReturns]: 'PurchaseReturns',
  [LOCAL_STORAGE_KEYS.saleReturns]: 'SaleReturns',
  [LOCAL_STORAGE_KEYS.customers]: 'Customers',
  [LOCAL_STORAGE_KEYS.suppliers]: 'Suppliers',
  [LOCAL_STORAGE_KEYS.agents]: 'Agents',
  [LOCAL_STORAGE_KEYS.transporters]: 'Transporters',
  [LOCAL_STORAGE_KEYS.warehouses]: 'Warehouses',
  [LOCAL_STORAGE_KEYS.brokers]: 'Brokers',
};

// Helper function to convert an array of objects to CSV and trigger download
function convertToCSVAndDownload(dataArray: any[], fileNamePrefix: string): void {
  if (!dataArray || dataArray.length === 0) {
    console.info(`FormatButton: No data to convert to CSV for ${fileNamePrefix}`);
    return;
  }

  try {
    const headers = Object.keys(dataArray[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...dataArray.map(row =>
        headers
          .map(fieldName => {
            let fieldValue = row[fieldName];
            if (fieldValue === null || fieldValue === undefined) {
              fieldValue = '';
            } else if (typeof fieldValue === 'object') {
              try {
                fieldValue = JSON.stringify(fieldValue);
              } catch (e) {
                fieldValue = '[Object]';
              }
            }
            const stringValue = String(fieldValue);
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    const now = new Date();
    const formattedDate = format(now, 'ddMMyy_HHmm');
    link.download = `${fileNamePrefix}_FormatBackup_${formattedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    console.info(`FormatButton: CSV download initiated for ${fileNamePrefix}`);
  } catch (error) {
    console.error(`FormatButton: Failed to generate CSV for ${fileNamePrefix}`, error);
  }
}


export function FormatButton() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { toast } = useToast();

  const handleFormatData = () => {
    if (typeof window === 'undefined') {
        console.warn("FormatButton: localStorage is not available.");
        toast({
            title: 'Formatting Unavailable',
            description: "localStorage is not accessible in this environment.",
            variant: 'destructive',
        });
        return;
    }

    console.info("FormatButton: Starting data format process with backups...");
    try {
      const allDataForJsonBackup: Record<string, any> = {};
      const timestamp = Date.now();
      const formattedDateForFile = format(new Date(timestamp), 'ddMMyy_HHmm');

      console.info("FormatButton: Gathering all data for JSON backup...");
      const allKeysToBackupAndClear = [...Object.values(LOCAL_STORAGE_KEYS), LAST_BACKUP_TIMESTAMP_KEY];
      
      allKeysToBackupAndClear.forEach(key => {
        const item = localStorage.getItem(key);
        if (item !== null) {
          try {
            allDataForJsonBackup[key] = JSON.parse(item);
            console.info(`FormatButton: Gathered for JSON backup (parsed): ${key}`);
          } catch (e) {
            allDataForJsonBackup[key] = item; 
            console.info(`FormatButton: Gathered for JSON backup (as string): ${key}`);
          }
        } else {
          console.info(`FormatButton: Key ${key} not found in localStorage for JSON backup.`);
        }
      });

      if (Object.keys(allDataForJsonBackup).length > 0) {
        const jsonString = JSON.stringify(allDataForJsonBackup, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = `StockMarketTracker_FormatBackup_AllData_${formattedDateForFile}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
        console.info(`FormatButton: JSON backup (AllData) download initiated.`);
      } else {
        console.info("FormatButton: No data found for JSON backup.");
      }

      console.info("FormatButton: Initiating CSV backups for primary data types...");
      Object.entries(CSV_EXPORTABLE_KEYS_MAP).forEach(([storageKey, fileNamePrefix]) => {
        const item = localStorage.getItem(storageKey);
        if (item !== null) {
          try {
            const dataArray = JSON.parse(item);
            if (Array.isArray(dataArray) && dataArray.length > 0) {
              console.info(`FormatButton: Preparing CSV for ${fileNamePrefix} (${storageKey}) with ${dataArray.length} items.`);
              convertToCSVAndDownload(dataArray, fileNamePrefix);
            } else {
              console.info(`FormatButton: Data for ${fileNamePrefix} (${storageKey}) is not an array or is empty, skipping CSV.`);
            }
          } catch (e) {
            console.error(`FormatButton: Error parsing data for CSV export of ${fileNamePrefix} (${storageKey}):`, e);
          }
        } else {
           console.info(`FormatButton: Key ${storageKey} not found for CSV export of ${fileNamePrefix}.`);
        }
      });
      
      console.info("FormatButton: Attempting to remove application data keys from localStorage...");
      console.log("FormatButton: Keys to remove:", allKeysToBackupAndClear);

      // Log state before removal
      console.log("--- LocalStorage state BEFORE explicit removal ---");
      allKeysToBackupAndClear.forEach(key => {
        console.log(`FormatButton: BEFORE - Key: ${key}, Value: ${localStorage.getItem(key)?.substring(0, 50) || 'null'}`);
      });

      // Loop removal (should be sufficient)
      allKeysToBackupAndClear.forEach(key => {
        localStorage.removeItem(key);
        // console.info(`FormatButton: Attempted removal of (loop): ${key}`);
      });

      // Explicit removal for master data keys as a failsafe
      const masterKeysExplicit = [
        'masterCustomers', 'masterSuppliers', 'masterAgents', 
        'masterTransporters', 'masterWarehouses', 'masterBrokers'
      ];
      masterKeysExplicit.forEach(key => {
        localStorage.removeItem(key);
        // console.info(`FormatButton: Attempted explicit removal of: ${key}`);
      });
      
      // Log state after removal
      console.log("--- LocalStorage state AFTER explicit removal ---");
      allKeysToBackupAndClear.forEach(key => {
        console.log(`FormatButton: AFTER - Key: ${key}, Value: ${localStorage.getItem(key)?.substring(0, 50) || 'null'}`);
      });
      masterKeysExplicit.forEach(key => { // Also check the explicitly removed keys again
          console.log(`FormatButton: AFTER (explicit check) - Key: ${key}, Value: ${localStorage.getItem(key)?.substring(0, 50) || 'null'}`);
      });
      
      console.info("FormatButton: Data formatting actions complete. Toasting and preparing to reload...");
      toast({
        title: 'Application Data Formatted',
        description: "JSON and CSV backup downloads initiated. All application data and settings have been wiped. The application will reload automatically.",
        variant: 'destructive',
        duration: 9000, 
      });
      
      setTimeout(() => {
        console.info("FormatButton: Reloading application...");
        window.location.reload();
      }, 3000); 

    } catch (error) {
      console.error("FormatButton: Formatting process failed:", error);
      toast({
        title: "Formatting Process Failed",
        description: "An error occurred. Check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmOpen(false);
    }
  };

  return (
    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Eraser className="mr-2 h-4 w-4" />
          Format Application
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          {/* AlertDialogDescription removed as per user request */}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleFormatData} className="bg-destructive hover:bg-destructive/80">
            Yes, Backup & Format Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
