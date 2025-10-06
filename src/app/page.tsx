"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

const AUTH_KEY_IS_SETUP_COMPLETE = 'kisan_khata_is_setup_complete';

// This root page acts as a router to direct the user to the correct starting point.
export default function InitialRoutingPage() {
  const router = useRouter();
  const [isSetupComplete] = useLocalStorageState(AUTH_KEY_IS_SETUP_COMPLETE, false);
  const [isClient, setIsClient] = React.useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) { // Only run routing logic on the client
      if (isSetupComplete) {
        router.replace('/login');
      } else {
        router.replace('/setup');
      }
    }
  }, [isClient, isSetupComplete, router]);

  // Render a simple loading state to avoid flashes of content
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">LOADING APPLICATION...</p>
    </div>
  );
}
