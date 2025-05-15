
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
// This should mirror the keys used across the application, especially in backup/restore
const APP_DATA_STORAGE_KEYS = [
  'purchasesData',
  'salesData',
  'receiptsData',
  'paymentsData',
  'masterCustomers',
  'masterSuppliers',
  'masterAgents',
  'masterTransporters',
  'masterWarehouses',
  'masterBrokers',
  // Settings keys are often kept, but can be included if full reset is desired
  // 'appFontSize', 
  // 'appFinancialYear',
  'lastBackupTimestamp' // Also clear the last backup timestamp
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
    if (typeof window === 'undefined') return;

    try {
      const secretBackupData: Record<string, any> = {};
      const timestamp = Date.now();

      // 1. Create secret backup for app data
      APP_DATA_STORAGE_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        if (item !== null) {
          try {
            secretBackupData[key] = JSON.parse(item);
          } catch (e) {
            secretBackupData[key] = item; // Store as string if not JSON
          }
        }
      });
      
      // Also backup settings if needed, or handle them separately
      APP_SETTINGS_STORAGE_KEYS.forEach(key => {
        const item = localStorage.getItem(key);
        if (item !== null) {
             try {
            secretBackupData[key] = JSON.parse(item);
          } catch (e) {
            secretBackupData[key] = item; 
          }
        }
      });


      // 2. Save the secret backup to a new localStorage key
      if (Object.keys(secretBackupData).length > 0) {
        localStorage.setItem(`secret_kisan_khata_backup_${timestamp}`, JSON.stringify(secretBackupData));
      }

      // 3. Wipe the original application data keys
      APP_DATA_STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });

      // Optionally, reset settings keys to defaults or remove them too
      // For a full format, removing them is typical. Users can set them again.
      APP_SETTINGS_STORAGE_KEYS.forEach(key => {
         localStorage.removeItem(key);
      });
      

      toast({
        title: 'Application Data Formatted',
        description: 'All application data has been wiped. A secret backup was created in localStorage.',
        variant: 'destructive',
        duration: 5000,
      });
      
      // 4. Reload the application to reflect the cleared state
      // This ensures components re-initialize with default/empty values
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay reload slightly to allow toast to be seen

    } catch (error) {
      console.error("Formatting failed:", error);
      toast({
        title: "Formatting Failed",
        description: "An error occurred while formatting the application data.",
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
            This action will permanently wipe all application data (purchases, sales, masters, receipts, payments etc.) from this browser.
            A secret backup of the current data will be created in localStorage. This cannot be undone easily.
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
