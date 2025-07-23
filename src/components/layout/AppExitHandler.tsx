
"use client";

import React, { useEffect } from 'react';
import { exportDataToPortableFile } from '@/lib/backupRestoreUtils'; // Use the main export function
import { useToast } from '@/hooks/use-toast';

export function AppExitHandler() {
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Logic for showing the confirmation dialog
      const confirmationMessage = "Are you sure you want to leave? Please ensure your data is backed up.";
      event.preventDefault();
      event.returnValue = confirmationMessage;
      return confirmationMessage;
    };

    const handleUnload = () => {
      // This is a best-effort attempt. Most modern browsers restrict what can be done here.
      // We are *not* calling exportData here because it relies on user interaction (download prompt) which is blocked.
      // The beforeunload prompt is the primary mechanism to remind the user.
      console.info("User is leaving the page. Remind them to backup if they haven't.");
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('unload', handleUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('unload', handleUnload);
      }
    };
  }, []);

  return null; // This component doesn't render anything visible
}
