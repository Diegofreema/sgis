import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/animations/FadeIn";
import { siteConfig } from "@/config/site";
import { getPublicSchoolSettings } from "@/lib/queries";

export function ContactPage() {
  const [{ schoolEmail, schoolPhones }, setContact] = useState<{
    schoolEmail: string;
    schoolPhones: readonly string[];
  }>({
    schoolEmail: siteConfig.email,
    schoolPhones: siteConfig.phones,
  });

  useEffect(() => {
    let active = true;
    getPublicSchoolSettings()
      .then((s) => active && setContact({ schoolEmail: s.schoolEmail, schoolPhones: s.schoolPhones }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const contactInfo = [
    ...schoolPhones.map((phone, i) => ({
      icon: Phone,
      label: i === 0 ? "Phone" : "Phone (2)",
      value: phone,
      href: `tel:${phone}`,
    })),
    { icon: Mail, label: "Email", value: schoolEmail, href: `mailto:${schoolEmail}` },
    {
      icon: MapPin,
      label: "Address",
      value: `${siteConfig.address.street}, ${siteConfig.address.city}, ${siteConfig.address.country}`,
      href: "#",
    },
  ];

  return (
    <>
      <section className="pt-28 pb-16 bg-linear-to-b from-secondary/40 to-background">
        <div className="container mx-auto container-padding">
          <FadeIn className="max-w-2xl">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Get in Touch</p>
            <h1 className="text-h1 font-serif font-bold text-foreground mb-4">Contact Us</h1>
            <p className="text-xl text-muted-foreground">
              We&rsquo;d love to hear from you. Our team is ready to answer your questions.
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto container-padding">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact info */}
            <FadeIn direction="left">
              <div className="space-y-4">
                <h2 className="text-h3 font-serif font-semibold text-foreground mb-6">
                  Reach Us Directly
                </h2>
                {contactInfo.map((item) => (
                  <Card key={item.label} className="border-border/60 hover:border-primary/30 transition-colors">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">{item.label}</p>
                        {item.href && item.href !== "#" ? (
                          <a href={item.href} className="text-sm text-foreground hover:text-primary transition-colors">
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-sm text-foreground">{item.value}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Office hours */}
                <Card className="border-border/60">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Office Hours</p>
                      <div className="space-y-1">
                        {siteConfig.officeHours.map((row) => (
                          <div key={row.days} className="flex justify-between gap-4 text-sm">
                            <span className="text-muted-foreground">{row.days}</span>
                            <span className="text-foreground font-medium">{row.hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </FadeIn>

            {/* Map placeholder */}
            <FadeIn direction="right" delay={0.1}>
              <div className="rounded-2xl overflow-hidden bg-muted h-80 lg:h-full min-h-64 flex items-center justify-center border border-border">
                <div className="text-center space-y-2 p-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground text-sm">
                    Interactive map will appear here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {siteConfig.address.street}, {siteConfig.address.city}
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
