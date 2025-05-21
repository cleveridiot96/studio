
"use client";

import React, { useRef, type ChangeEvent } from 'react';
import { CloudUpload, CloudDownload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { exportDataToPortableFile, restoreDataFromFile, LAST_BACKUP_TIMESTAMP_KEY } from '@/lib/backupRestoreUtils';

interface BackupRestoreTileProps {
  backupLink: string; // Still used if direct navigation to full page is desired as a fallback
  restoreLink: string; // Still used if direct navigation to full page is desired as a fallback
  backupColor: string; 
  restoreColor: string; 
  backupLabel: string;
  restoreLabel: string;
}

const BackupRestoreTile: React.FC<BackupRestoreTileProps> = ({
  backupColor,
  restoreColor,
  backupLabel,
  restoreLabel,
}) => {
  const { toast } = useToast();
  const [lastBackupTimestamp, setLastBackupTimestamp] = useLocalStorageState<number | null>(LAST_BACKUP_TIMESTAMP_KEY, null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupClick = () => {
    exportDataToPortableFile({ toast, setLastBackupTimestamp, lastBackupTimestampFromState: lastBackupTimestamp });
  };

  const handleRestoreClick = () => {
    restoreFileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    restoreDataFromFile(event, { toast, setLastBackupTimestamp });
  };

  return (
    <div className="col-span-1 flex flex-col rounded-lg shadow-lg overflow-hidden aspect-square">
      {/* Backup Half */}
      <button
        onClick={handleBackupClick}
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-4 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white",
          backupColor,
          backupColor.replace('-600', '-700').replace('-500', '-600')
        )}
      >
        <CloudDownload className="h-10 w-10 mb-2" /> {/* Changed icon to CloudDownload for export */}
        <span className="text-lg font-semibold text-center">{backupLabel}</span>
      </button>

      {/* Restore Half */}
      <button
        onClick={handleRestoreClick}
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-4 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white",
          restoreColor,
          restoreColor.replace('-600', '-700').replace('-500', '-600')
        )}
      >
        <CloudUpload className="h-10 w-10 mb-2" />
        <span className="text-lg font-semibold text-center">{restoreLabel}</span>
      </button>
      <input
        type="file"
        ref={restoreFileInputRef}
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        id="tile-restore-input"
      />
    </div>
  );
};

export default BackupRestoreTile;
