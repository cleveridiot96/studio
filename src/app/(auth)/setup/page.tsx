"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';
import { createPasswordHash, createFamilyHashSet } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertTriangle, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AUTH_KEYS = {
  PASSWORD_HASH: 'kisan_khata_password_hash',
  FAMILY_HASH_SET: 'kisan_khata_family_hash_set',
  IS_SETUP_COMPLETE: 'kisan_khata_is_setup_complete',
  RECOVERY_FLAG: 'kisan_khata_recovery_in_progress',
};

type Step = 'PIN_SETUP' | 'RECOVERY_SETUP';

export default function SetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('PIN_SETUP');
  const [error, setError] = useState('');
  
  // State for PIN setup
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // State for recovery setup
  const [familyNumbers, setFamilyNumbers] = useState(['', '', '', '']);

  const [, setPasswordHash] = useLocalStorageState(AUTH_KEYS.PASSWORD_HASH, '');
  const [, setFamilyHashSet] = useLocalStorageState<string[]>(AUTH_KEYS.FAMILY_HASH_SET, []);
  const [isSetupComplete, setIsSetupComplete] = useLocalStorageState(AUTH_KEYS.IS_SETUP_COMPLETE, false);
  const [isRecoveryMode, setIsRecoveryMode] = useLocalStorageState(AUTH_KEYS.RECOVERY_FLAG, false);
  
  useEffect(() => {
    if (isSetupComplete && !isRecoveryMode) {
      router.replace('/login');
    }
  }, [isSetupComplete, isRecoveryMode, router]);
  
  useEffect(() => {
    // Focus first input on step change
    if (step === 'PIN_SETUP') {
      pinInputRefs.current[0]?.focus();
    }
  }, [step]);

  // --- PIN Input Handlers ---
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number, type: 'pin' | 'confirm') => {
    const { value } = e.target;
    const setState = type === 'pin' ? setPin : setConfirmPin;
    const currentPin = type === 'pin' ? pin : confirmPin;
    const refs = type === 'pin' ? pinInputRefs : confirmPinInputRefs;

    if (/^[0-9]$/.test(value) || value === '') {
      const newPin = currentPin.split('');
      newPin[index] = value;
      setState(newPin.join(''));
      if (value !== '' && index < 3) {
        refs.current[index + 1]?.focus();
      }
    }
  };
  
  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number, type: 'pin' | 'confirm') => {
    const currentPin = type === 'pin' ? pin : confirmPin;
    const refs = type === 'pin' ? pinInputRefs : confirmPinInputRefs;
    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePinSubmit = () => {
    setError('');
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError('Both PINs must be 4 digits long.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      confirmPinInputRefs.current[0]?.focus();
      return;
    }
    if (isRecoveryMode) {
      // In recovery mode, we just set the password and finish.
      const hash = createPasswordHash(pin);
      setPasswordHash(hash);
      setIsSetupComplete(true);
      setIsRecoveryMode(false); // Clear the recovery flag
      toast({ title: "Password Reset Successful", description: "You can now log in with your new PIN." });
      router.replace('/login');
    } else {
      // In initial setup, proceed to next step
      setStep('RECOVERY_SETUP');
    }
  };
  
  // --- Recovery Setup Handlers ---
  const handleFamilyNumberChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newNumbers = [...familyNumbers];
    newNumbers[index] = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setFamilyNumbers(newNumbers);
  };
  
  const handleRecoverySubmit = () => {
    setError('');
    const uniqueNumbers = new Set(familyNumbers.filter(num => num.length === 10));
    if (uniqueNumbers.size !== 4) {
        setError('Please enter four unique 10-digit phone numbers.');
        return;
    }

    const pinHash = createPasswordHash(pin);
    const hashes = createFamilyHashSet(Array.from(uniqueNumbers));

    setPasswordHash(pinHash);
    setFamilyHashSet(hashes);
    setIsSetupComplete(true);

    toast({ title: "Setup Complete!", description: "Your application is now secure." });
    router.replace('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        {step === 'PIN_SETUP' && (
          <>
            <CardHeader className="text-center">
              <LockKeyhole className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="text-3xl mt-4">
                {isRecoveryMode ? 'Set New PIN' : 'Create Your PIN'}
              </CardTitle>
              <CardDescription>
                {isRecoveryMode 
                  ? 'Enter a new 4-digit numeric PIN for your account.'
                  : 'First, create a 4-digit numeric PIN to secure your application.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter 4-Digit PIN</label>
                <div className="flex justify-center gap-2 sm:gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Input key={`pin-${index}`} ref={el => pinInputRefs.current[index] = el} type="password" inputMode="numeric" maxLength={1} value={pin[index] || ''} onChange={(e) => handlePinChange(e, index, 'pin')} onKeyDown={(e) => handlePinKeyDown(e, index, 'pin')} className="h-16 w-14 text-center text-4xl font-mono" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm 4-Digit PIN</label>
                <div className="flex justify-center gap-2 sm:gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Input key={`confirm-${index}`} ref={el => confirmPinInputRefs.current[index] = el} type="password" inputMode="numeric" maxLength={1} value={confirmPin[index] || ''} onChange={(e) => handlePinChange(e, index, 'confirm')} onKeyDown={(e) => handlePinKeyDown(e, index, 'confirm')} className="h-16 w-14 text-center text-4xl font-mono" />
                  ))}
                </div>
              </div>
              {error && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /><p>{error}</p></div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handlePinSubmit} className="w-full" size="lg">
                {isRecoveryMode ? 'RESET PIN' : 'NEXT: SET UP RECOVERY'}
              </Button>
            </CardFooter>
          </>
        )}

        {step === 'RECOVERY_SETUP' && (
          <>
            <CardHeader className="text-center">
              <Users className="mx-auto h-12 w-12 text-primary" />
              <CardTitle className="text-3xl mt-4">Set Up Recovery</CardTitle>
              <CardDescription>Enter four distinct family phone numbers. These can be used to recover your account if you forget your PIN. This data is stored securely.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {familyNumbers.map((num, index) => (
                  <div key={index} className="space-y-1">
                    <label className="text-sm font-medium">Family Number {index + 1}</label>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="10-digit phone number"
                      value={num}
                      onChange={(e) => handleFamilyNumberChange(e, index)}
                      className="h-12"
                    />
                  </div>
                ))}
              </div>
              {error && (
                <div className="flex items-center justify-center gap-2 text-sm text-destructive"><AlertTriangle className="h-4 w-4" /><p>{error}</p></div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button onClick={handleRecoverySubmit} className="w-full" size="lg">
                <ShieldCheck className="mr-2 h-5 w-5" /> FINISH SETUP
              </Button>
              <Button variant="link" size="sm" onClick={() => setStep('PIN_SETUP')}>Back to PIN</Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
