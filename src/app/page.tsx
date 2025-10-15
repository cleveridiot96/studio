"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

// This page now acts as a smart entry point.
export default function SmartLoaderPage() {
  const router = useRouter();
  const [isSetupComplete] = useLocalStorageState('kisan_khata_is_setup_complete', false);

  useEffect(() => {
    if (isSetupComplete) {
      router.replace('/dashboard');
    } else {
      router.replace('/setup');
    }
  }, [isSetupComplete, router]);

  // Render a simple loading state while redirecting.
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <p className="text-lg text-muted-foreground animate-pulse">LOADING APPLICATION...</p>
      </div>
    </div>
  );
}
