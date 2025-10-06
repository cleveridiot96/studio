"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { createPasswordHash } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const AUTH_KEYS = {
  PASSWORD_HASH: 'kisan_khata_password_hash',
  IS_SETUP_COMPLETE: 'kisan_khata_is_setup_complete',
};
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSetupComplete] = useLocalStorageState(AUTH_KEYS.IS_SETUP_COMPLETE, false);
  const [storedPasswordHash] = useLocalStorageState(AUTH_KEYS.PASSWORD_HASH, '');
  const [attempts, setAttempts] = useLocalStorageState('login_attempts', 0);
  const [lockoutUntil, setLockoutUntil] = useLocalStorageState('login_lockout_until', 0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isSetupComplete) {
      router.replace('/setup');
    }
  }, [isSetupComplete, router]);
  
  useEffect(() => {
    // Focus the first input on mount
    inputRefs.current[0]?.focus();
  }, []);
  
  const isLockedOut = () => {
    if (lockoutUntil > Date.now()) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please try again in ${Math.ceil(remainingSeconds / 60)} minutes.`);
      return true;
    }
    return false;
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { value } = e.target;
    if (/^[0-9]$/.test(value) || value === '') {
      const newPin = pin.split('');
      newPin[index] = value;
      setPin(newPin.join(''));

      // Move focus to the next input if a digit is entered
      if (value !== '' && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut()) return;

    if (pin.length !== 4) {
      setError('Please enter the complete 4-digit PIN.');
      return;
    }

    const inputHash = createPasswordHash(pin);

    if (inputHash === storedPasswordHash) {
      toast({ title: "Login Successful", description: "Welcome back!" });
      setAttempts(0); // Reset attempts on successful login
      setLockoutUntil(0);
      router.replace('/dashboard');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError('Incorrect PIN. Please try again.');
      setPin(''); // Clear PIN input
      inputRefs.current[0]?.focus();
      
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
        setError(`Too many failed attempts. Please try again in 5 minutes.`);
        toast({
          title: "Account Locked",
          description: "For your security, login has been temporarily disabled.",
          variant: "destructive",
          duration: 10000,
        });
      }
    }
  };
  
  // Navigate to dashboard if already "logged in" conceptually (e.g., via back button)
  // This is a simple check; a robust session management would be needed in a real app.
  // For this offline app, we assume if they can get here, they should log in.

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <KeyRound className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="text-3xl mt-4">Enter Your PIN</CardTitle>
            <CardDescription>Please enter your 4-digit numeric password to access your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={pin[index] || ''}
                  onChange={(e) => handlePinChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="h-16 w-14 text-center text-4xl font-mono"
                  disabled={lockoutUntil > Date.now()}
                />
              ))}
            </div>
            {error && (
              <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" size="lg" disabled={lockoutUntil > Date.now()}>
              LOGIN
            </Button>
            <Button asChild variant="link" size="sm">
              <Link href="/recover">Forgot PIN?</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
