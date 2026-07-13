export type NavItem = {
  label: string;
  href: string;
  description?: string;
  children?: NavItem[];
};

export const publicNav: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'About',
    href: '/about',
    description: 'Our mission, vision, and values',
  },
  {
    label: 'Admissions',
    href: '/admissions',
    description: 'Join our school community',
  },
  {
    label: 'Entrance Exam',
    href: '/entrance-exam',
    description: 'Apply for our entrance examination',
  },
  { label: "News", href: "/news" },
  { label: 'Gallery', href: '/gallery' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export const adminNav: NavItem[] = [
  { label: 'Overview', href: '/admin' },
  { label: 'Applicants', href: '/admin/applicants' },
  { label: 'Exams', href: '/admin/exams' },
  { label: 'Question Bank', href: '/admin/question-bank' },
  // { label: 'Payments', href: '/admin/payments' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'News', href: '/admin/news' },
  { label: 'CMS', href: '/admin/cms' },
  { label: 'Gallery', href: '/admin/gallery' },
  { label: 'Testimonials', href: '/admin/testimonials' },
  { label: 'Staff', href: '/admin/staff' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Settings', href: '/admin/settings' },
];
