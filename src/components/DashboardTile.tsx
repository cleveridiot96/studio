import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardTileProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  href: string;
  description?: string;
  className?: string;
  valueClassName?: string;
}

export function DashboardTile({ title, value, icon: Icon, href, description, className, valueClassName }: DashboardTileProps) {
  return (
    <Link href={href} className="block group">
      <Card className={cn(
        "shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105",
        "bg-card text-card-foreground border-border rounded-xl overflow-hidden", // Added rounded-xl
        className
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4 sm:px-6">
          <CardTitle className="text-xl font-semibold text-primary">{title}</CardTitle>
          <Icon className="h-8 w-8 text-accent opacity-80 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="pb-4 px-4 sm:px-6">
          <div className={cn("text-5xl font-bold text-foreground group-hover:text-primary transition-colors", valueClassName)}>
            {value}
          </div>
          {description && <p className="text-sm text-muted-foreground pt-1">{description}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}
