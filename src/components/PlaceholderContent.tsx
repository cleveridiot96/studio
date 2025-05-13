import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Construction, HardHat } from 'lucide-react';

interface PlaceholderContentProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
}

export function PlaceholderContent({ title, description = "This section is currently under development. Please check back soon for updates!", icon: Icon = HardHat }: PlaceholderContentProps) {
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
