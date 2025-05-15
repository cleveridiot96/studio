
"use client";

import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState, useCallback } from 'react';
import { CalendarPlus, Check } from 'lucide-react';

export function FinancialYearToggle() {
  const { 
    financialYear, 
    setFinancialYear, 
    getPreviousFinancialYear, // Kept for potential future use or if direct year options are limited
    getNextFinancialYear 
  } = useSettings();
  const { toast } = useToast();

  const [buttonText, setButtonText] = useState(`FY ${financialYear}`);

  useEffect(() => {
    setButtonText(`FY ${financialYear}`);
  }, [financialYear]);
  
  const generateYearOptions = useCallback(() => {
    const options = [];
    const currentFyParts = financialYear.split('-').map(Number);
    if (currentFyParts.length !== 2 || isNaN(currentFyParts[0])) {
        // Fallback to a default range if current financialYear is malformed
        const currentActualYear = new Date().getFullYear();
         for (let i = 2; i >= -2; i--) {
            const startYear = currentActualYear - i;
            options.push(`${startYear}-${startYear + 1}`);
        }
        return options.sort((a,b) => b.localeCompare(a));
    }

    const [currentFyStart] = currentFyParts;
    
    for (let i = 2; i >= -2; i--) { // Show current, 2 past, 2 future relative to current FY
      const startYear = currentFyStart - i;
      options.push(`${startYear}-${startYear + 1}`);
    }
    return options.sort((a,b) => b.localeCompare(a)); // Show most recent first in dropdown
  }, [financialYear]);

  const yearOptions = generateYearOptions();

  const handleAddNextFinancialYear = () => {
    const nextFy = getNextFinancialYear();
    setFinancialYear(nextFy);
    toast({
      title: "New Financial Year Added",
      description: `Switched to FY ${nextFy}. Accounts for FY ${financialYear} would be finalized.`,
    });
    toast({
      title: "Conceptual Action",
      description: `Closing balances for FY ${financialYear} would be carried forward to FY ${nextFy}.`,
      duration: 4000,
    });
    toast({
      title: "Info",
      description: "PDF report generation for closing balances is a planned feature.",
      duration: 4000,
    });
  };

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[140px] text-sm font-semibold">
            {buttonText}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-[200px]">
          <DropdownMenuLabel>Select Financial Year</DropdownMenuLabel>
          <DropdownMenuSeparator />
 {yearOptions.map(year => (
 <DropdownMenuRadioItem 
              key={year} 
 value={year}
 onSelect={() => setFinancialYear(year)}
            >
              {year}
 </DropdownMenuRadioItem>
 ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAddNextFinancialYear} className="text-primary hover:!text-primary-foreground hover:!bg-primary">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Add Next FY ({getNextFinancialYear()})
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
