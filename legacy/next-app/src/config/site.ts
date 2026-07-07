export const siteConfig = {
  name: "Sankt Georg International School",
  shortName: "SGIS",
  description:
    "A world-class international school providing exceptional education, nurturing curious minds, and inspiring the next generation of global leaders.",
  tagline: "Excellence. Character. Global Perspective.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ogImage: "/og-image.jpg",
  email: "sanktgeorginternationalschool@gmail.com",
  phone: "+2349165573514",
  phones: ["+2349165573514", "+2349023453660"],
  address: {
    street: "Umuijem Avu",
    city: "Owerri, Imo State",
    country: "Nigeria",
  },
  officeHours: [
    { days: "Monday – Friday", hours: "8:00 AM – 4:00 PM" },
    { days: "Saturday", hours: "10:00 AM – 1:00 PM" },
    { days: "Sunday", hours: "Closed" },
  ],
  social: {
    twitter: "https://twitter.com/sanktgeorgis",
    facebook: "https://facebook.com/sanktgeorgis",
    instagram: "https://instagram.com/sanktgeorgis",
    linkedin: "https://linkedin.com/school/sanktgeorgis",
  },
  admissionsEmail: "sanktgeorginternationalschool@gmail.com",
  supportEmail: "sanktgeorginternationalschool@gmail.com",
} as const;

export type SiteConfig = typeof siteConfig;
