
"use client";

import React, { useEffect } from 'react';

export function AppExitHandler() {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // This message is a suggestion; browsers typically show their own generic message.
      // The primary goal is to trigger the browser's confirmation dialog.
      const message = "Are you sure you want to leave? Please ensure your data is backed up via the Backup/Restore page if you haven't done so recently.";
      event.preventDefault(); // Standard for most browsers to show the dialog
      event.returnValue = message; // Required for some older browsers
      return message; // For modern browsers
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return null; // This component doesn't render anything visible
}
