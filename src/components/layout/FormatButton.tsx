
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

export function FormatButton() {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { toast } = useToast();

  const handleFormatData = () => {
    // Placeholder for actual data wiping and secret backup logic
    // This would involve:
    // 1. Reading data from localStorage (purchases, sales, masters etc.)
    // 2. Generating JSON and CSV/Excel-like string for backup
    // 3. Storing these backup strings in *new* localStorage keys (e.g., secret_backup_json_<timestamp>)
    // 4. Clearing the original localStorage keys
    // 5. Updating application state to reflect wiped data (e.g., via context or forcing a reload)

    // Example: Clear all known localStorage keys used by the app
    // Be very careful with this in a real app!
    const keysToClear = [
      'appFontSize', 
      'appFinancialYear',
      // Add keys for purchases, sales, customers, suppliers, agents, warehouses etc.
      // Example: 'purchasesData', 'salesData', 'masterSuppliers'
    ];
    
    // Simulate backup
    console.log("Simulating secret backup generation...");
    // In a real app, this data would be collected from relevant localStorage items
    const backupData = {
        timestamp: new Date().toISOString(),
        message: "This is a simulated secret backup before formatting.",
        dataSources: keysToClear
    };
    localStorage.setItem(`secret_backup_${Date.now()}`, JSON.stringify(backupData));


    keysToClear.forEach(key => {
      // Keep essential settings like font size and financial year if desired,
      // or allow them to be reset to defaults after format.
      // For now, let's assume we are clearing *all* app-specific data.
      // if (key !== 'appFontSize' && key !== 'appFinancialYear') {
      //   localStorage.removeItem(key);
      // }
      // For a full format, we might clear all data, and user would need to re-init.
      // For now, let's just log it.
       console.log(`Would remove ${key} from localStorage`);
    });
    
    // For demonstration, we'll just clear a few example keys if they exist
    localStorage.removeItem('purchases'); // Assuming this is a key used in PurchasesClient
    localStorage.removeItem('sales'); // Assuming this is a key used in SalesClient
    // Add other relevant keys


    toast({
      title: 'Application Data Formatted',
      description: 'All application data has been wiped (simulation). Secret backup created (simulation).',
      variant: 'destructive',
    });
    
    // Optionally, reload the application or reset state through context
    // window.location.reload(); // This is a hard refresh

    setIsConfirmOpen(false);
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
            This action will permanently wipe all application data (purchases, sales, masters, etc.).
            A secret backup will be attempted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleFormatData}>
            Yes, Format Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
