import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: { question: string; linkLabel: string; href: string };
}) {
  return (
    <section className="container flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <span className="mb-2 text-4xl">🧸</span>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          {footer && (
            <p className="text-center text-sm text-muted-foreground">
              {footer.question}{' '}
              <Link href={footer.href} className="font-medium text-primary hover:underline">
                {footer.linkLabel}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
