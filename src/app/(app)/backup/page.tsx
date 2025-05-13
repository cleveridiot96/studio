import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseBackup, UploadCloud, DownloadCloud, History } from "lucide-react";

export default function BackupPage() {
  // These functions would interact with a backend or Electron APIs for local file system access
  const handleBackup = () => {
    alert("Backup functionality to be implemented. This would typically save data locally.");
  };

  const handleRestore = () => {
    alert("Restore functionality to be implemented. This would typically load data from a local file.");
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Data Backup & Restore</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Secure your data by creating local backups and restore when needed.
        </p>
      </div>

      <Card className="shadow-xl border-2 border-primary/20">
        <CardHeader className="items-center">
          <DatabaseBackup className="w-16 h-16 text-primary mb-4" />
          <CardTitle className="text-2xl">Manage Your Data</CardTitle>
          <CardDescription>
            It's crucial to regularly back up your application data to prevent loss. 
            You can restore from a previously saved backup file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleBackup} 
              className="w-full text-lg py-6 bg-green-600 hover:bg-green-700 text-white"
              variant="default"
              size="lg"
            >
              <DownloadCloud className="mr-2 h-6 w-6" />
              Backup Data Locally
            </Button>
            <Button 
              onClick={handleRestore} 
              className="w-full text-lg py-6"
              variant="outline"
              size="lg"
            >
              <UploadCloud className="mr-2 h-6 w-6" />
              Restore Data from Backup
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start text-sm text-muted-foreground space-y-2">
          <div className="flex items-center">
            <History className="w-4 h-4 mr-2 text-accent"/>
            <span>Last Backup: Not Available Yet</span>
          </div>
          <p>
            <strong>Important:</strong> Backups are stored on your local device (e.g., computer or pen drive). Ensure your backup medium is safe.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
