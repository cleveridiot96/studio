"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default function SmartLoaderPage() {
  const router = useRouter();
  const { isDataLoaded, loadDataFromFile } = useAppData();

  useEffect(() => {
    if (isDataLoaded) {
      router.replace('/dashboard');
    }
  }, [isDataLoaded, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadDataFromFile(file);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 p-8 border rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-primary">Welcome to Kisan Khata Sahayak</h1>
        <p className="text-lg text-muted-foreground text-center">
          To begin, please load your data file.
        </p>
        <Button asChild size="lg">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="mr-2 h-5 w-5" />
            Load Data File
          </label>
        </Button>
        <input
          id="file-upload"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-gray-500 text-center">
          If you're starting for the first time, you can create a new data file after setting up your masters.
        </p>
      </div>
    </div>
  );
}
