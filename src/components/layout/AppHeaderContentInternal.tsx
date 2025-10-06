"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Settings as SettingsIcon, Landmark, CalculatorIcon, AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontEnhancer } from "@/components/layout/FontEnhancer";
import { FormatButton } from "@/components/layout/FormatButton";
import { FinancialYearToggle } from "@/components/layout/FinancialYearToggle";
import SearchBar from '@/components/shared/SearchBar';
import { Calculator } from '@/components/shared/Calculator';
import { LowStockThresholdSetting } from "./LowStockThresholdSetting";
import { useRouter } from 'next/navigation';

export function AppHeaderContentInternal() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    // In this offline app, "logging out" just means returning to the login screen.
    router.push('/login');
  }

  return (
    <>
      <Link href="/dashboard">
        <Button variant="ghost" size="icon" aria-label="Home">
          <Home className="h-5 w-5 text-foreground" />
        </Button>
      </Link>
      <SearchBar />
      <FinancialYearToggle />
      <Link href="/balance-sheet">
        <Button variant="outline">
            <Landmark className="mr-2 h-4 w-4"/>
            FINANCIAL SUMMARY
        </Button>
      </Link>
      <Button variant="ghost" size="icon" aria-label="Open Calculator" onClick={() => setIsCalculatorOpen(true)}>
        <CalculatorIcon className="h-5 w-5 text-foreground" />
      </Button>
      <Calculator isVisible={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <SettingsIcon className="h-5 w-5 text-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4 space-y-4" align="end">
          <FontEnhancer />
          <LowStockThresholdSetting />
          <FormatButton />
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon" aria-label="Logout" onClick={handleLogout}>
        <LogOut className="h-5 w-5 text-destructive" />
      </Button>
    </>
  );
}
