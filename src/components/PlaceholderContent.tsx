import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { HardHat } from 'lucide-react';
import React from 'react';

interface PlaceholderContentProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
}

const PlaceholderContentComponent: React.FC<PlaceholderContentProps> = ({ title, description = "This section is currently under development. Please check back soon for updates!", icon: Icon = HardHat }) => {
  return (
    <Card className="w-full shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20">
      <CardHeader className="items-center text-center">
        <Icon className="h-16 w-16 text-accent mb-4" />
        <CardTitle className="text-3xl font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-lg text-muted-foreground">{description}</p>
        <p className="mt-4 text-sm text-muted-foreground/80">We appreciate your patience!</p>
      </CardContent>
    </Card>
  );
}

export const PlaceholderContent = React.memo(PlaceholderContentComponent);