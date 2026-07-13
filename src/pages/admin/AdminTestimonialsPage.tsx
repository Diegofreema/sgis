import { useCallback, useEffect, useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { AdminLoading } from "@/components/admin/AdminLoading";
import { TestimonialsAdminClient } from "@/components/admin/TestimonialsAdminClient";
import { listAllTestimonials } from "@/lib/admin";
import type { Testimonial } from "@/types/cms";

export function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);

  const load = useCallback(() => {
    listAllTestimonials()
      .then(setTestimonials)
      .catch((e) => console.error("[testimonials]", e));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!testimonials) return <AdminLoading />;

  return (
    <FadeIn>
      <TestimonialsAdminClient testimonials={testimonials} onChanged={load} />
    </FadeIn>
  );
}
