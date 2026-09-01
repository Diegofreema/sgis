import { useEffect, useState } from 'react';
import Link from '@/lib/compat/link';
import { Mail, MessageCircle, Phone, MapPin } from 'lucide-react';
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

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

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
      .then(
        (s) =>
          active &&
          setContact({
            schoolEmail: s.schoolEmail,
            schoolPhone: s.schoolPhone,
          }),
      )
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
                {
                  href: siteConfig.social.facebook,
                  label: 'Facebook',
                  short: 'f',
                },
                {
                  href: siteConfig.social.instagram,
                  label: 'Instagram',
                  short: null,
                },
                {
                  href: siteConfig.social.twitter,
                  label: 'X / Twitter',
                  short: 'X',
                },
                {
                  href: siteConfig.social.linkedin,
                  label: 'LinkedIn',
                  short: 'in',
                },
              ]
                .filter(({ href }) => href)
                .map(({ href, label, short }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-accent transition-colors text-2xl font-bold"
                  >
                    {label === 'Instagram' ? <InstagramIcon /> : short}
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
                <a
                  href={`tel:${schoolPhone}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  +2349023453660
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MessageCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  WhatsApp:
                  {siteConfig.whatsapp.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </span>
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
      <a
        href={siteConfig.whatsapp[0].href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-brand-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </footer>
  );
}
