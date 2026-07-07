import { useEffect, useState } from 'react';
import Link from '@/lib/compat/link';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { publicNav } from '@/config/navigation';
import { getPublicSchoolSettings } from '@/lib/queries';
import { BrandLogo } from '../shared/brand-logo';

const footerLinks = {
  school: publicNav,
  quickLinks: [
    { label: 'Admin Portal', href: '/login' },
    { label: 'Apply Now', href: '/entrance-exam' },
    { label: 'News', href: '/news' },
  ],
};

export function PublicFooter() {
  const [{ schoolEmail, schoolPhone }, setContact] = useState<{
    schoolEmail: string;
    schoolPhone: string;
  }>({
    schoolEmail: siteConfig.email,
    schoolPhone: siteConfig.phone,
  });

  useEffect(() => {
    let active = true;
    getPublicSchoolSettings()
      .then((s) => active && setContact({ schoolEmail: s.schoolEmail, schoolPhone: s.schoolPhone }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto container-padding py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BrandLogo />
              </div>
              <div>
                <p className="font-serif font-semibold text-sm text-foreground">
                  Sankt Georg
                </p>
                <p className="text-[10px] text-muted-foreground tracking-wide uppercase">
                  International School
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {siteConfig.tagline}. Nurturing curious minds and inspiring the
              next generation of global leaders.
            </p>
            {/* Socials */}
            <div className="flex items-center gap-2">
              {[
                { href: siteConfig.social.facebook, label: 'Facebook' },
                { href: siteConfig.social.instagram, label: 'Instagram' },
                { href: siteConfig.social.twitter, label: 'X / Twitter' },
                { href: siteConfig.social.linkedin, label: 'LinkedIn' },
              ]
                .filter(({ href }) => href)
                .map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors text-xs font-bold"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-serif font-semibold text-sm text-foreground mb-4">
              Explore
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.school.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-serif font-semibold text-sm text-foreground mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-serif font-semibold text-sm text-foreground mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  {siteConfig.address.street}, {siteConfig.address.city},{' '}
                  {siteConfig.address.country}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                <a
                  href={`tel:${schoolPhone}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {schoolPhone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a
                  href={`mailto:${schoolEmail}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {schoolEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
