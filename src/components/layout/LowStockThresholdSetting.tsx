
"use client";

import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import React from 'react';

export function LowStockThresholdSetting() {
  const { lowStockThreshold, setLowStockThreshold } = useSettings();
  const [inputValue, setInputValue] = React.useState(String(lowStockThreshold));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setLowStockThreshold(numValue);
    } else {
      // If input is invalid, revert to the last valid value from context
      setInputValue(String(lowStockThreshold));
    }
  };
  
  // Update input value if context changes from elsewhere
  React.useEffect(() => {
    setInputValue(String(lowStockThreshold));
  }, [lowStockThreshold]);

  return (
    <div className="space-y-2 border-t pt-4">
      <Label htmlFor="low-stock-threshold" className="text-sm font-medium text-foreground flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive"/> Low Stock Alert Threshold
      </Label>
      <Input
        id="low-stock-threshold"
        type="number"
        min="0"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="w-full"
        placeholder="e.g., 10"
      />
      <p className="text-xs text-muted-foreground">Alert when warehouse stock (in bags) falls below this number.</p>
    </div>
  );
}
