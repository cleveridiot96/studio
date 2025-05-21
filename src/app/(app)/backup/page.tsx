
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseBackup, UploadCloud, FileJson, History, AlertTriangle, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React, { ChangeEvent } from "react";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { exportDataToPortableFile, restoreDataFromFile, LAST_BACKUP_TIMESTAMP_KEY } from "@/lib/backupRestoreUtils";

export default function BackupPage() {
  const { toast } = useToast();
  const [lastBackupTimestamp, setLastBackupTimestamp] = useLocalStorageState<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);

  const getFormattedLastBackup = () => {
    if (lastBackupTimestamp) {
      return new Date(lastBackupTimestamp).toLocaleString();
    }
    return "Not Available Yet";
  };

  const handleExportClick = () => {
    exportDataToPortableFile({ toast, setLastBackupTimestamp, lastBackupTimestampFromState: lastBackupTimestamp });
  };

  const handleRestoreChange = (event: ChangeEvent<HTMLInputElement>) => {
    restoreDataFromFile(event, { toast, setLastBackupTimestamp });
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
              onClick={handleExportClick}
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
                  onChange={handleRestoreChange}
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
