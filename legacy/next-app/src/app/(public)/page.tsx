/**
 * Homepage — Partial Prerendering (PPR) via cacheComponents.
 *
 * Rendering strategy:
 * ┌─────────────────────────────────────────────────────────┐
 * │  Static shell (prerendered, served from CDN instantly)  │
 * │  ─ HeroSection                                          │
 * │  ─ School Introduction + animated stats                 │
 * │  ─ Mission & Vision                                     │
 * │  ─ AdmissionCTA                                         │
 * ├─────────────────────────────────────────────────────────┤
 * │  Streamed sections (sent as they resolve)               │
 * │  ─ <AnnouncementsStream> — SSR, fresh every request     │
 * │  ─ <NewsStream>          — ISR, cached 1 h              │
 * │  ─ <GalleryStream>       — ISR, cached 1 h              │
 * └─────────────────────────────────────────────────────────┘
 *
 * Each <Suspense> boundary is an independent streaming point: the hero
 * paints immediately, then each section streams in as its data resolves
 * without blocking the others.
 */
import { Suspense } from "react";
import { HeroSection } from "@/components/public/HeroSection";
import { AdmissionCTA } from "@/components/public/AdmissionCTA";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { CountUp } from "@/components/animations/CountUp";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnouncementsStream } from "./_sections/AnnouncementsStream";
import { NewsStream } from "./_sections/NewsStream";
import { GalleryStream } from "./_sections/GalleryStream";

/* ─── Skeleton fallbacks for each streamed section ─────────────────── */

function AnnouncementSkeleton() {
  // Thin banner height — almost invisible while loading
  return <div className="h-10 w-full bg-primary/5 animate-pulse" />;
}

function NewsSkeleton() {
  return (
    <section className="section-padding">
      <div className="container mx-auto container-padding">
        <div className="flex items-end justify-between mb-10">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdmissionCTASkeleton() {
  return (
    <div className="section-padding relative overflow-hidden bg-primary/90 animate-pulse">
      <div className="container mx-auto container-padding">
        <div className="h-52" />
      </div>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <section className="section-padding bg-muted/20">
      <div className="container mx-auto container-padding">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      {/* Announcement banner — SSR, streams first (thin, lightweight) */}
      <Suspense fallback={<AnnouncementSkeleton />}>
        <AnnouncementsStream />
      </Suspense>

      {/* ── STATIC SHELL — rendered synchronously, no data fetching ── */}

      {/* Hero */}
      <HeroSection />

      {/* School Introduction */}
      <section className="section-padding">
        <div className="container mx-auto container-padding">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeIn direction="left">
              <div className="space-y-6">
                <p className="text-sm font-medium text-primary uppercase tracking-wider">
                  About SGIS
                </p>
                <h2 className="text-h2 font-serif font-bold text-foreground leading-tight">
                  Exceptional Education.{" "}
                  <em className="text-primary not-italic">Enriching Lives.</em>
                </h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  At SGIS, we believe in providing an exceptional education that not only
                  prepares our students for the future but also enriches their lives in the
                  present. Our dedicated faculty and staff work tirelessly to create a
                  learning environment that is engaging, challenging, and supportive.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We are committed to ensuring that every student who enters our doors feels
                  valued, supported, and empowered to succeed. To us, education is not only
                  about acquiring knowledge but also about developing the skills and character
                  traits necessary to become responsible and contributing members of society.
                </p>
                <Button asChild variant="outline" className="gap-2 font-medium">
                  <Link href="/about">
                    Learn More About Us <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </FadeIn>

            {/* Quick facts */}
            <StaggerChildren className="grid grid-cols-2 gap-4">
              <StaggerItem>
                <div className="glass-card rounded-2xl p-6 space-y-2 hover:shadow-brand-md transition-shadow">
                  <p className="font-serif text-3xl font-bold text-primary">2022</p>
                  <p className="font-semibold text-foreground text-sm">Year Founded</p>
                  <p className="text-xs text-muted-foreground">Owerri, Imo State</p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="glass-card rounded-2xl p-6 space-y-2 hover:shadow-brand-md transition-shadow">
                  <p className="font-serif text-3xl font-bold text-primary">
                    <CountUp end={350} suffix="+" duration={1800} />
                  </p>
                  <p className="font-semibold text-foreground text-sm">Students Enrolled</p>
                  <p className="text-xs text-muted-foreground">And growing every year</p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="glass-card rounded-2xl p-6 space-y-2 hover:shadow-brand-md transition-shadow">
                  <p className="font-serif text-3xl font-bold text-primary">Intl.</p>
                  <p className="font-semibold text-foreground text-sm">Curriculum</p>
                  <p className="text-xs text-muted-foreground">International languages & standards</p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="glass-card rounded-2xl p-6 space-y-2 hover:shadow-brand-md transition-shadow">
                  <p className="font-serif text-3xl font-bold text-primary">Safe</p>
                  <p className="font-semibold text-foreground text-sm">Modern Campus</p>
                  <p className="text-xs text-muted-foreground">Purpose-built, secure environment</p>
                </div>
              </StaggerItem>
            </StaggerChildren>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding bg-muted/20">
        <div className="container mx-auto container-padding">
          <FadeIn className="text-center mb-12 space-y-3 max-w-2xl mx-auto">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              Our Foundation
            </p>
            <h2 className="text-h2 font-serif font-bold text-foreground">
              Mission &amp; Vision
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                label: "Our Mission",
                text: "To provide a transformative international education that equips students with the knowledge, skills, and values needed to contribute meaningfully to a diverse and rapidly changing world.",
              },
              {
                label: "Our Vision",
                text: "To be Africa's leading international school, recognised globally for academic excellence, holistic development, and the character of our graduates.",
              },
            ].map((item, i) => (
              <FadeIn key={item.label} delay={i * 0.1}>
                <div className="glass-card rounded-2xl p-8 space-y-4 h-full">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {item.label}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — data cached via 'use cache' on the query, streamed via Suspense */}
      <Suspense fallback={<AdmissionCTASkeleton />}>
        <AdmissionCTA />
      </Suspense>

      {/* ── STREAMED SECTIONS — each resolves independently ── */}

      {/* Latest news — ISR cached, streams in after static shell */}
      <Suspense fallback={<NewsSkeleton />}>
        <NewsStream />
      </Suspense>

      {/* Gallery preview — ISR cached, streams last */}
      <Suspense fallback={<GallerySkeleton />}>
        <GalleryStream />
      </Suspense>
    </>
  );
}
