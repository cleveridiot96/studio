import Link from 'next/link'; // Assuming Next.js for routing
import { CloudUpload, CloudDownload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackupRestoreTileProps {
  backupLink: string;
  restoreLink: string;
  backupColor: string; // Tailwind CSS class for background color
  restoreColor: string; // Tailwind CSS class for background color
  backupLabel: string;
  restoreLabel: string;
}

const BackupRestoreTile: React.FC<BackupRestoreTileProps> = ({
  backupLink,
  restoreLink,
  backupColor,
  restoreColor,
  backupLabel,
  restoreLabel,
}) => {
  return (
    <div className="col-span-1 flex flex-col rounded-lg shadow-lg overflow-hidden aspect-square">
      {/* Backup Half */}
      <Link
        href={backupLink}
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-4 text-white transition-colors duration-200",
          backupColor,
          // Add hover effect similar to DashboardTile - adjust classes as needed
          backupColor.replace('-600', '-700').replace('-500', '-600') // Simple hover color change
        )}
      >
        <CloudUpload className="h-10 w-10 mb-2" />
        <span className="text-lg font-semibold text-center">{backupLabel}</span>
      </Link>

      {/* Restore Half */}
      <Link
        href={restoreLink}
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-4 text-white transition-colors duration-200",
          restoreColor,
           // Add hover effect similar to DashboardTile - adjust classes as needed
          restoreColor.replace('-600', '-700').replace('-500', '-600') // Simple hover color change
        )}
      >
        <CloudDownload className="h-10 w-10 mb-2" />
        <span className="text-lg font-semibold text-center">{restoreLabel}</span>
      </Link>
    </div>
  );
};

export default BackupRestoreTile;