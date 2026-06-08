export type NavItem = {
  label: string;
  href: string;
  description?: string;
  children?: NavItem[];
};

export const publicNav: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "About",
    href: "/about",
    description: "Our mission, vision, and values",
  },
  {
    label: "Admissions",
    href: "/admissions",
    description: "Join our school community",
  },
  {
    label: "Entrance Exam",
    href: "/entrance-exam",
    description: "Apply for our entrance examination",
  },
  { label: "News", href: "/news" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

export const dashboardNav: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Application", href: "/dashboard/application" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Exam", href: "/dashboard/exam" },
  { label: "Results", href: "/dashboard/results" },
];

export const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Applicants", href: "/admin/applicants" },
  { label: "Exams", href: "/admin/exams" },
  { label: "Question Bank", href: "/admin/question-bank" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "CMS", href: "/admin/cms" },
  { label: "Gallery", href: "/admin/gallery" },
  { label: "Users", href: "/admin/users" },
  { label: "Settings", href: "/admin/settings" },
];
