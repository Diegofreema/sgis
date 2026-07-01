import { requireRole } from '@/lib/auth';
import { db, cmsPages } from '@/db';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/animations/FadeIn';
import Link from 'next/link';
import { FileEdit, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';

const PAGE_KEYS = [
  {
    key: 'homepage',
    label: 'Homepage',
    description: 'Hero section, school intro, mission and vision',
  },
  {
    key: 'about',
    label: 'About Us',
    description: 'School history, values, and leadership',
  },
  {
    key: 'admissions',
    label: 'Admissions',
    description: 'Requirements, process, and fees',
  },
  {
    key: 'contact',
    label: 'Contact',
    description: 'Address, phone, and office hours',
  },
  {
    key: 'mission',
    label: 'Mission Statement',
    description: 'Core mission text',
  },
  {
    key: 'vision',
    label: 'Vision Statement',
    description: 'Long-term vision text',
  },
];
const hide = true;
export default async function CMSPage() {
  if (hide) {
    return notFound();
  }
  await requireRole(['admin']);

  const pages = db ? await db.select().from(cmsPages) : [];
  const pageMap = new Map(pages.map((p) => [p.pageKey, p]));

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-h3 font-bold text-foreground">
              Content Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage all website content from here.
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <div className="grid md:grid-cols-2 gap-4">
          {PAGE_KEYS.map((page) => {
            const existing = pageMap.get(page.key);
            return (
              <Card
                key={page.key}
                className="border-border/60 hover:border-primary/30 hover:shadow-brand-sm transition-all"
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <FileEdit className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-foreground text-sm">
                        {page.label}
                      </p>
                      <Badge
                        variant={
                          existing?.status === 'published'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-[10px]"
                      >
                        {existing?.status ?? 'not created'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {page.description}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0"
                  >
                    <Link href={`/admin/cms/${page.key}`}>
                      Edit <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </FadeIn>
    </div>
  );
}
