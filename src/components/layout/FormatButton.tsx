
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Eraser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define the keys for data stored in localStorage that need to be formatted
const APP_DATA_STORAGE_KEYS = [
  'purchasesData',
  'salesData',
  'receiptsData',
  'paymentsData',
  'locationTransfersData',
  'purchaseReturnsData',
  'saleReturnsData',
  'masterCustomers',
  'masterSuppliers',
  'masterAgents',
  'masterTransporters',
  'masterWarehouses',
  'masterBrokers',
  'lastBackupTimestamp'
];

// Keys for settings that might be preserved or reset differently
const APP_SETTINGS_STORAGE_KEYS = [
  'appFontSize',
  'appFinancialYear',
];


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

    console.log("FormatButton: Starting data format process...");
    try {
      const secretBackupData: Record<string, any> = {};
      const timestamp = Date.now();

      // 1. Create secret backup for app data
      console.log("FormatButton: Backing up APP_DATA_STORAGE_KEYS...");
      APP_DATA_STORAGE_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        if (item !== null) {
          try {
            secretBackupData[key] = JSON.parse(item);
            // console.log(`FormatButton: Backed up (parsed JSON) ${key}`);
          } catch (e) {
            secretBackupData[key] = item; // Store as string if not JSON
            // console.log(`FormatButton: Backed up (as string) ${key}`);
          }
        } else {
            // console.log(`FormatButton: No data found for key ${key} to backup.`);
        }
      });
      
      // Also backup settings
      console.log("FormatButton: Backing up APP_SETTINGS_STORAGE_KEYS...");
      APP_SETTINGS_STORAGE_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        if (item !== null) {
             try {
            secretBackupData[key] = JSON.parse(item);
            // console.log(`FormatButton: Backed up setting (parsed JSON) ${key}`);
          } catch (e) {
            secretBackupData[key] = item; 
            // console.log(`FormatButton: Backed up setting (as string) ${key}`);
          }
        } else {
            // console.log(`FormatButton: No setting found for key ${key} to backup.`);
        }
      });


      // 2. Save the secret backup to a new localStorage key
      if (Object.keys(secretBackupData).length > 0) {
        const backupKey = `secret_kisan_khata_backup_${timestamp}`;
        localStorage.setItem(backupKey, JSON.stringify(secretBackupData));
        console.log(`FormatButton: Secret backup created at ${backupKey} with ${Object.keys(secretBackupData).length} items.`);
      } else {
        console.log("FormatButton: No data found to create a secret backup.");
      }

      // 3. Wipe the original application data keys
      console.log("FormatButton: Removing APP_DATA_STORAGE_KEYS...");
      APP_DATA_STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
        // console.log(`FormatButton: Removed ${key}`);
      });

      // Wipe settings keys as well for a full format
      console.log("FormatButton: Removing APP_SETTINGS_STORAGE_KEYS...");
      APP_SETTINGS_STORAGE_KEYS.forEach(key => {
         localStorage.removeItem(key);
        //  console.log(`FormatButton: Removed setting ${key}`);
      });
      
      console.log("FormatButton: Data formatting complete. Toasting and reloading...");
      toast({
        title: 'Application Data Formatted',
        description: "All application data and settings have been wiped. A local backup was attempted. Please reload the application now.",
        variant: 'destructive',
        duration: 9000, 
      });
      
      // 4. Reload the application to reflect the cleared state
      setTimeout(() => {
        window.location.reload();
      }, 2500); 

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
          <AlertDialogDescription>
            This action will permanently wipe all application data (purchases, sales, masters, financial settings, etc.) from this browser.
            A secret backup of the current data will be attempted in localStorage. This action is intended for development or troubleshooting and is irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleFormatData} className="bg-destructive hover:bg-destructive/80">
            Yes, Format Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
