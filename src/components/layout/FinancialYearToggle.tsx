
"use client";

import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import React, { useEffect, useState } from 'react';

export function FinancialYearToggle() {
  const { 
    financialYear, 
    setFinancialYear, 
    getFinancialYearShort,
    getPreviousFinancialYear,
    getNextFinancialYear 
  } = useSettings();

  const [buttonText, setButtonText] = useState("FY --"); // Placeholder for SSR

  useEffect(() => {
    // This effect runs only on the client, after hydration
    setButtonText(`FY ${getFinancialYearShort()}`);
  }, [financialYear, getFinancialYearShort]);


  const handleSetPreviousYear = () => {
    setFinancialYear(getPreviousFinancialYear());
  };

  const handleSetNextYear = () => {
    setFinancialYear(getNextFinancialYear());
  };
  
  // Generate a few recent years for selection
  const generateYearOptions = () => {
    const currentFullYear = new Date().getFullYear();
    const options = [];
    for (let i = 2; i >= -2; i--) { // Show current, 2 past, 2 future
      const startYear = currentFullYear - i;
      options.push(`${startYear -1 }-${startYear}`);
    }
    return options.reverse(); // Show most recent first in dropdown
  };
  const yearOptions = generateYearOptions();


  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={handleSetPreviousYear} aria-label="Previous Financial Year">
        <ChevronsLeft className="h-5 w-5" />
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[100px] text-sm font-semibold">
            {buttonText}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuLabel>Select Financial Year</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {yearOptions.map(year => (
            <DropdownMenuItem key={year} onClick={() => setFinancialYear(year)} disabled={year === financialYear}>
              {year}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" onClick={handleSetNextYear} aria-label="Next Financial Year">
        <ChevronsRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

