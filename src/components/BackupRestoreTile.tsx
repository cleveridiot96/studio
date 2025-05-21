
"use client";

import React, { useRef, type ChangeEvent } from 'react';
import { UploadCloud, FileJson as ExportIcon } from 'lucide-react'; // Changed CloudDownload to FileJson
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
          "flex-1 flex flex-col items-center justify-center p-3 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white",
          backupColor,
          backupColor.replace('-600', '-700').replace('-500', '-600') // Darken on hover
        )}
      >
        <ExportIcon className="h-8 w-8 mb-1" /> {/* Changed icon */}
        <span className="text-base font-semibold text-center">{backupLabel}</span>
      </button>

      {/* Restore Half */}
      <button
        onClick={handleRestoreClick}
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-3 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white",
          restoreColor,
          restoreColor.replace('-600', '-700').replace('-500', '-600') // Darken on hover
        )}
      >
        <UploadCloud className="h-8 w-8 mb-1" />
        <span className="text-base font-semibold text-center">{restoreLabel}</span>
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
