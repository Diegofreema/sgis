import { HeroSection } from "@/components/public/HeroSection";
import { AdmissionCTA } from "@/components/public/AdmissionCTA";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerChildren, StaggerItem } from "@/components/animations/StaggerChildren";
import { CountUp } from "@/components/animations/CountUp";
import Link from "@/lib/compat/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnnouncementsStream } from "@/components/home/AnnouncementsStream";
import { NewsStream } from "@/components/home/NewsStream";
import { GalleryStream } from "@/components/home/GalleryStream";
import { TestimonialsStream } from "@/components/home/TestimonialsStream";

export function HomePage() {
  return (
    <>
      {/* Announcement banner */}
      <AnnouncementsStream />

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

      {/* CTA */}
      <AdmissionCTA />

      {/* Streamed sections */}
      <NewsStream />
      <TestimonialsStream />
      <GalleryStream />
    </>
  );
}
