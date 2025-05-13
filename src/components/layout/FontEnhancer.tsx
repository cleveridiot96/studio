
"use client";

import { useSettings } from '@/contexts/SettingsContext';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export function FontEnhancer() {
  const { fontSize, setFontSize } = useSettings();

  const minFontSize = 12; // Min font size in px
  const maxFontSize = 24; // Max font size in px
  const step = 1;

  return (
    <div className="space-y-3">
      <Label htmlFor="font-size-slider" className="text-sm font-medium text-foreground">Font Size</Label>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">Tiny</span>
        <Slider
          id="font-size-slider"
          min={minFontSize}
          max={maxFontSize}
          step={step}
          value={[fontSize]}
          onValueChange={(value) => setFontSize(value[0])}
          className="w-[150px]"
        />
        <span className="text-xs text-muted-foreground">Huge</span>
      </div>
       <p className="text-xs text-center text-muted-foreground">Current: {fontSize}px</p>
    </div>
  );
}
