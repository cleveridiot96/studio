
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  // AlertDialogDescription, // Removed
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
  [LOCAL_STORAGE_KEYS.customers]: 'Customers',
  [LOCAL_STORAGE_KEYS.suppliers]: 'Suppliers',
  [LOCAL_STORAGE_KEYS.agents]: 'Agents',
  [LOCAL_STORAGE_KEYS.transporters]: 'Transporters',
  [LOCAL_STORAGE_KEYS.warehouses]: 'Warehouses',
  [LOCAL_STORAGE_KEYS.brokers]: 'Brokers',
  // Note: PurchaseReturns and SaleReturns might also be candidates if they are added to LOCAL_STORAGE_KEYS
  // 'purchaseReturnsData': 'PurchaseReturns', // Example if added
  // 'saleReturnsData': 'SaleReturns',       // Example if added
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
              // For complex objects/arrays within a cell, stringify them.
              // This keeps the CSV structure simple.
              try {
                fieldValue = JSON.stringify(fieldValue);
              } catch (e) {
                fieldValue = '[Object]'; // Fallback for circular refs or unserializable objects
              }
            }
            const stringValue = String(fieldValue);
            // Escape double quotes and ensure the value is wrapped in quotes if it contains commas or newlines.
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
    // Potentially notify user here if a specific CSV fails, though the main toast covers general process
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

      // 1. Gather all data for JSON backup
      console.info("FormatButton: Gathering all data for JSON backup...");
      const allKeysToBackup = [...Object.values(LOCAL_STORAGE_KEYS), LAST_BACKUP_TIMESTAMP_KEY];
      allKeysToBackup.forEach(key => {
        const item = localStorage.getItem(key);
        if (item !== null) {
          try {
            allDataForJsonBackup[key] = JSON.parse(item);
          } catch (e) {
            allDataForJsonBackup[key] = item; // Store as string if not JSON
          }
        }
      });

      // 2. Trigger JSON backup download
      if (Object.keys(allDataForJsonBackup).length > 0) {
        const jsonString = JSON.stringify(allDataForJsonBackup, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = `KisanKhataSahayak_FormatBackup_AllData_${formattedDateForFile}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
        console.info(`FormatButton: JSON backup (AllData) download initiated.`);
      } else {
        console.info("FormatButton: No data found for JSON backup.");
      }

      // 3. Trigger CSV backup downloads for specified data types
      console.info("FormatButton: Initiating CSV backups for primary data types...");
      Object.entries(CSV_EXPORTABLE_KEYS_MAP).forEach(([storageKey, fileNamePrefix]) => {
        const item = localStorage.getItem(storageKey);
        if (item !== null) {
          try {
            const dataArray = JSON.parse(item);
            if (Array.isArray(dataArray) && dataArray.length > 0) {
              convertToCSVAndDownload(dataArray, fileNamePrefix);
            } else {
              console.info(`FormatButton: Data for ${fileNamePrefix} (${storageKey}) is not an array or is empty, skipping CSV.`);
            }
          } catch (e) {
            console.error(`FormatButton: Error parsing data for CSV export of ${fileNamePrefix} (${storageKey}):`, e);
          }
        }
      });
      
      // 4. Wipe the original application data keys
      console.info("FormatButton: Removing application data keys from localStorage...");
      const allKeysToRemove = [...Object.values(LOCAL_STORAGE_KEYS), LAST_BACKUP_TIMESTAMP_KEY];
      allKeysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.info(`FormatButton: Removed ${key}`);
      });
      
      console.info("FormatButton: Data formatting complete. Toasting and preparing to reload...");
      toast({
        title: 'Application Data Formatted',
        description: "JSON and CSV backup downloads initiated. All application data and settings have been wiped. The application will reload automatically.",
        variant: 'destructive',
        duration: 9000, 
      });
      
      // 5. Reload the application to reflect the cleared state
      setTimeout(() => {
        console.info("FormatButton: Reloading application...");
        window.location.reload();
      }, 3000); // Slightly longer delay to allow downloads to initiate

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
          {/* AlertDialogDescription removed */}
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
