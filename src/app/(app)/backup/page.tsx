
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseBackup, UploadCloud, FileJson, History, AlertTriangle, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React, { ChangeEvent } from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";

// Define the keys for data stored in localStorage
const LOCAL_STORAGE_KEYS = {
  purchases: 'purchasesData',
  sales: 'salesData',
  receipts: 'receiptsData', 
  payments: 'paymentsData',
  locationTransfers: 'locationTransfersData', // Added location transfers
  customers: 'masterCustomers',
  suppliers: 'masterSuppliers',
  agents: 'masterAgents',
  transporters: 'masterTransporters',
  warehouses: 'masterWarehouses', 
  brokers: 'masterBrokers',
  settingsFontSize: 'appFontSize',
  settingsFinancialYear: 'appFinancialYear',
};
const LAST_BACKUP_TIMESTAMP_KEY = 'lastBackupTimestamp';

export default function BackupPage() {
  const { toast } = useToast();
  const [lastBackupTimestamp, setLastBackupTimestamp] = useLocalStorageState<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);

  const getFormattedLastBackup = () => {
    if (lastBackupTimestamp) {
      return new Date(lastBackupTimestamp).toLocaleString();
    }
    return "Not Available Yet";
  };


  const handleExportToPortable = () => {
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
            // If not JSON, store as is (e.g. plain string for font size or FY)
             backupData[key] = item;
          }
        }
      });
      
      // Also include lastBackupTimestamp itself if it exists
      if (lastBackupTimestamp) {
        backupData[LAST_BACKUP_TIMESTAMP_KEY] = lastBackupTimestamp;
      }


      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      const currentDate = new Date().toISOString().slice(0, 10);
      link.download = `KKS_Portable_Backup_${currentDate}.json`; // Standardized filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

      const now = Date.now();
      setLastBackupTimestamp(now); // Update last backup time for this action

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

  const handleRestore = (event: ChangeEvent<HTMLInputElement>) => {
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
          // Check if the key from the backup file matches any of our defined LOCAL_STORAGE_KEYS values or the timestamp key
          const appKeyMatch = Object.values(LOCAL_STORAGE_KEYS).find(k => k === keyInBackup);
          
          if (appKeyMatch || keyInBackup === LAST_BACKUP_TIMESTAMP_KEY ) {
             const targetKey = keyInBackup; 
             if (typeof restoredData[targetKey] === 'string') {
                localStorage.setItem(targetKey, restoredData[targetKey]);
             } else {
                localStorage.setItem(targetKey, JSON.stringify(restoredData[targetKey]));
             }
            restoreSuccess = true;
            // If restoring the lastBackupTimestamp, update the state as well
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
        if(event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto print-area">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Data Backup & Restore</h1>
        <Button onClick={() => window.print()} variant="outline" size="icon" className="no-print">
            <Printer className="h-5 w-5" />
            <span className="sr-only">Print this page</span>
        </Button>
      </div>


      <Card className="shadow-xl border-2 border-primary/20">
        <CardHeader className="items-center">
          <DatabaseBackup className="w-16 h-16 text-primary mb-4" />
          <CardTitle className="text-2xl">Manage Your Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleExportToPortable}
              className="w-full text-lg py-6 bg-green-600 hover:bg-green-700 text-white"
              variant="default"
              size="lg"
            >
              <FileJson className="mr-2 h-6 w-6" />
              Export to Portable Version
            </Button>
            <Button
              asChild
              className="w-full text-lg py-6"
              variant="outline"
              size="lg"
            >
              <label htmlFor="restore-file-input" className="cursor-pointer flex items-center justify-center">
                <UploadCloud className="mr-2 h-6 w-6" />
                Restore Data from Backup
                <input
                  type="file"
                  id="restore-file-input"
                  accept=".json"
                  onChange={handleRestore}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start text-sm text-muted-foreground space-y-2">
          <div className="flex items-center">
            <History className="w-4 h-4 mr-2 text-accent"/>
            <span>Last Backup/Export: {getFormattedLastBackup()}</span>
          </div>
          <div className="flex items-start text-destructive p-3 rounded-md border border-destructive/50 bg-destructive/10">
            <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 shrink-0"/>
            <p>
              <strong>Important:</strong> Backups are downloaded to your local device (e.g., Downloads folder). Ensure your backup files are stored safely. Restoring data will overwrite current application data.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
