"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

const AUTH_KEYS = {
    PASSWORD_HASH: 'kisan_khata_password_hash',
    FAMILY_HASH_SET: 'kisan_khata_family_hash_set',
    IS_SETUP_COMPLETE: 'kisan_khata_is_setup_complete',
};

// This layout component acts as a gatekeeper for the entire application.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isSetupComplete] = useLocalStorageState(AUTH_KEYS.IS_SETUP_COMPLETE, false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // We only check for setup completion on the client side.
        if (isSetupComplete) {
            // If setup is complete, all routes are accessible (login will handle its own logic)
            setIsChecking(false);
        } else {
            // If setup is not complete, redirect to the setup page.
            router.replace('/setup');
        }
    }, [isSetupComplete, router]);

    // Show a loading state while we determine the setup status.
    if (isChecking && isSetupComplete) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <p className="text-muted-foreground">Loading application...</p>
            </div>
        );
    }
    
    // Once checks are done, render the requested page.
    return <>{children}</>;
}
