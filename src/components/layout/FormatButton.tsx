
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Eraser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LOCAL_STORAGE_KEYS, LAST_BACKUP_TIMESTAMP_KEY } from '@/lib/backupRestoreUtils';
import { format } from 'date-fns';


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

    console.info("FormatButton: Starting data format process with a single JSON backup...");
    try {
      const allDataForJsonBackup: Record<string, any> = {};
      const timestamp = Date.now();
      const formattedDateForFile = format(new Date(timestamp), 'ddMMyy_HHmm');

      console.info("FormatButton: Gathering all data for a complete JSON backup...");
      const allKeysToBackupAndClear = [
        ...Object.values(LOCAL_STORAGE_KEYS), 
        LAST_BACKUP_TIMESTAMP_KEY
      ];
      
      allKeysToBackupAndClear.forEach(key => {
        const item = localStorage.getItem(key);
        if (item !== null) {
          try {
            allDataForJsonBackup[key] = JSON.parse(item);
          } catch (e) {
            allDataForJsonBackup[key] = item; 
          }
        }
      });

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
        console.info(`FormatButton: Single JSON backup (AllData) download initiated.`);
      } else {
        console.info("FormatButton: No data found for JSON backup.");
      }
      
      console.info("FormatButton: Attempting to remove application data keys from localStorage...");
      allKeysToBackupAndClear.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.info("FormatButton: Data formatting actions complete. Toasting and preparing to reload...");
      toast({
        title: 'Application Data Formatted',
        description: "A single, complete JSON backup has been downloaded. All application data will now be wiped.",
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
