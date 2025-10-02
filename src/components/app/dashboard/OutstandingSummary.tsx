
"use client";
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useSettings } from "@/contexts/SettingsContext";
import { useOutstandingBalances } from '@/hooks/useOutstandingBalances';


export const OutstandingSummary = () => {
  const [hydrated, setHydrated] = React.useState(false);
  const { financialYear: currentFinancialYearString } = useSettings();
  React.useEffect(() => { setHydrated(true) }, []);

  const { receivableParties, payableParties, isBalancesLoading } = useOutstandingBalances();

  const { totalReceivable, totalPayable } = useMemo(() => {
    if (isBalancesLoading || !hydrated) return { totalReceivable: 0, totalPayable: 0 };
    
    const totalReceivable = receivableParties.reduce((sum, p) => sum + (p.balance || 0), 0);
    const totalPayable = payableParties.reduce((sum, p) => sum + Math.abs(p.balance || 0), 0);
    
    return { totalReceivable, totalPayable };

  }, [hydrated, isBalancesLoading, receivableParties, payableParties]);
  
  if(!hydrated || isBalancesLoading) return <Card><CardHeader><CardTitle>LOADING OUTSTANDING BALANCES...</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-3/4"></div><div className="h-4 bg-muted rounded w-1/2"></div></div></CardContent></Card>

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">OUTSTANDING BALANCES (FY {currentFinancialYearString})</CardTitle>
        <CardDescription>A SUMMARY OF TOTAL MONEY TO BE PAID AND RECEIVED. CLICK A CARD TO SEE DETAILS.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/outstanding" className="block group">
              <Card className="bg-green-50 dark:bg-green-900/30 border-green-500/50 h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
                  <CardHeader>
                      <CardTitle className="text-green-700 dark:text-green-300">TOTAL RECEIVABLES</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹{totalReceivable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </CardContent>
              </Card>
            </Link>
             <Link href="/outstanding" className="block group">
               <Card className="bg-red-50 dark:bg-red-900/30 border-red-500/50 h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-1">
                  <CardHeader>
                      <CardTitle className="text-red-700 dark:text-red-300">TOTAL PAYABLES</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">₹{Math.abs(totalPayable).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  </CardContent>
              </Card>
            </Link>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
            <Link href="/outstanding">VIEW FULL OUTSTANDING REPORT</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
