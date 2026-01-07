"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { verifyPhoneNumber } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const AUTH_KEYS = {
  FAMILY_HASH_SET: 'kisan_khata_family_hash_set',
  RECOVERY_FLAG: 'kisan_khata_recovery_in_progress',
};

export default function RecoverPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [familyHashSet] = useLocalStorageState<string[]>(AUTH_KEYS.FAMILY_HASH_SET, []);
  const [, setRecoveryFlag] = useLocalStorageState(AUTH_KEYS.RECOVERY_FLAG, false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    if (await verifyPhoneNumber(phoneNumber, familyHashSet)) {
      toast({
        title: "Verification Successful",
        description: "Please set your new PIN.",
      });
      // Set a flag to indicate that recovery is in progress
      setRecoveryFlag(true);
      router.replace('/setup'); // Redirect to setup page for reset
    } else {
      setError('This phone number is not registered for recovery.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <Smartphone className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="text-3xl mt-4">Password Recovery</CardTitle>
            <CardDescription>Enter one of the four family phone numbers you set up for recovery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="Enter 10-digit phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                className="h-12 text-lg text-center"
              />
            </div>
            {error && (
              <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" size="lg">
              VERIFY & RECOVER
            </Button>
            <Button asChild variant="link" size="sm">
              <Link href="/login">Back to Login</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
