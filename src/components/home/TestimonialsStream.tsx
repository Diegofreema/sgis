import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listPublishedTestimonials } from "@/lib/queries";
import type { Testimonial } from "@/types/cms";

function TestimonialsSkeleton() {
  return (
    <section className="section-padding bg-muted/20">
      <div className="container mx-auto container-padding">
        <Skeleton className="mx-auto mb-3 h-3 w-32" />
        <Skeleton className="mx-auto mb-10 h-8 w-64" />
        <Skeleton className="mx-auto h-64 max-w-4xl rounded-2xl" />
      </div>
    </section>
  );
}

export function TestimonialsStream() {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;
    listPublishedTestimonials(10)
      .then((items) => active && setTestimonials(items))
      .catch((error) => {
        console.error("[TestimonialsStream]", error);
        if (active) setTestimonials([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (testimonials === null) return <TestimonialsSkeleton />;
  if (testimonials.length === 0) return null;

  const total = testimonials.length;
  const active = testimonials[index] ?? testimonials[0];
  const canMove = total > 1;

  function move(step: number) {
    setIndex((current) => (current + step + total) % total);
  }

  return (
    <section className="section-padding bg-muted/20">
      <div className="container mx-auto container-padding">
        <FadeIn className="mx-auto mb-10 max-w-2xl text-center space-y-3">
          <p className="text-sm font-medium text-primary uppercase tracking-wider">
            Parent Voices
          </p>
          <h2 className="text-h2 font-serif font-bold text-foreground">
            What Families Say
          </h2>
        </FadeIn>

        <FadeIn>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-brand-sm">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.id}
                  className="min-w-full px-6 py-10 text-center sm:px-12 lg:px-16"
                >
                  <MessageSquareQuote className="mx-auto mb-6 h-10 w-10 text-primary/70" />
                  <p className="mx-auto max-w-3xl font-serif text-2xl leading-relaxed text-foreground">
                    "{testimonial.content}"
                  </p>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">
                    {testimonial.parentName}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => move(-1)}
              disabled={!canMove}
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              {testimonials.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-6 bg-primary" : "w-2 bg-border"
                  }`}
                  onClick={() => setIndex(i)}
                  aria-label={`Show testimonial ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => move(1)}
              disabled={!canMove}
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="sr-only">
            Showing testimonial {index + 1} of {total}: {active.parentName}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
