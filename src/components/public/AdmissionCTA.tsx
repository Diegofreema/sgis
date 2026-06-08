import { FadeIn } from '@/components/animations/FadeIn';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, FileText, Mail } from 'lucide-react';
import Link from 'next/link';
import { getAdmissionSettings } from '@/server/queries/settings.queries';

const features = [
  {
    icon: FileText,
    title: 'Online Application',
    desc: 'Complete your application entirely online',
  },
  {
    icon: BookOpen,
    title: 'Entrance Examination',
    desc: 'Assess your readiness for our rigorous curriculum',
  },
  {
    icon: ArrowRight,
    title: 'Quick Process',
    desc: 'Results communicated within 2–3 weeks',
  },
  {
    icon: ArrowRight,
    title: 'Scholarships',
    desc: 'Merit-based financial assistance available',
  },
];

export async function AdmissionCTA() {
  const settings = await getAdmissionSettings();
  const isOpen = settings?.isOpen ?? false;
  const session = settings?.academicSession?.trim() ?? "";
  const notes = settings?.notes?.trim() ?? null;

  const bodyText = notes
    ? notes
    : isOpen
      ? `Join a community of learners destined to make an impact. Applications for the${session ? ` ${session}` : ""} academic year are now open.`
      : "Join a community of learners destined to make an impact. Register your interest and we'll notify you when the next admission cycle opens.";

  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-primary via-primary to-primary/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(1_0_0/0.08),transparent_70%)]" />

      <div className="relative container mx-auto container-padding">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left */}
          <FadeIn direction="left">
            <div className="space-y-6">
              <h2 className="text-h2 font-serif font-bold text-primary-foreground leading-tight">
                Begin Your Journey at Sankt Georg
              </h2>
              <p className="text-primary-foreground/80 leading-relaxed text-lg">
                {bodyText}
              </p>
              <div className="flex flex-wrap gap-3">
                {isOpen ? (
                  <>
                    <Button
                      asChild
                      size="lg"
                      variant="secondary"
                      className="font-medium group gap-2"
                    >
                      <Link href="/entrance-exam">
                        Apply for Entrance Exam
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="font-medium border-primary-foreground/60 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20"
                    >
                      <Link href="/admissions">Learn About Admissions</Link>
                    </Button>
                  </>
                ) : (
                  <Button
                    asChild
                    size="lg"
                    variant="secondary"
                    className="font-medium gap-2"
                  >
                    <Link href="/contact">
                      <Mail className="h-4 w-4" />
                      Register Your Interest
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Right: feature cards */}
          <FadeIn direction="right" delay={0.1}>
            <div className="grid grid-cols-2 gap-4">
              {features.map((feat) => (
                <div
                  key={feat.title}
                  className="rounded-xl p-4 space-y-2 border border-white/40 bg-white/20"
                >
                  <feat.icon className="h-5 w-5 text-white" />
                  <p className="font-serif font-semibold text-white text-sm">
                    {feat.title}
                  </p>
                  <p className="text-xs text-white leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
