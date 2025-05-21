
import React from 'react';
import { cn } from '@/lib/utils';

interface PrintHeaderSymbolProps {
  className?: string;
}

export const PrintHeaderSymbol: React.FC<PrintHeaderSymbolProps> = ({ className }) => {
  return (
    <div className={cn("text-center font-semibold text-foreground", className)}>
      || 卐 SHREE 卐 ||
    </div>
  );
};
