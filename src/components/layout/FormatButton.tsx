
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Printer } from 'lucide-react';

export function FormatButton() {
  const { printSettings, setPrintSettings } = useSettings();

  const handleToggle = (key: keyof typeof printSettings) => {
    setPrintSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Printer className="h-4 w-4" /> Print Settings
      </Label>
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="show-profit" className="text-sm text-muted-foreground">
          Show Profit on Sale Chitti
        </Label>
        <Switch
          id="show-profit"
          checked={printSettings.showProfitOnSaleChitti}
          onCheckedChange={() => handleToggle('showProfitOnSaleChitti')}
        />
      </div>
    </div>
  );
}
