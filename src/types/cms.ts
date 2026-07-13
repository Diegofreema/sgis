import type { ContentStatus } from "@/constants/statuses";

export type CMSPage = {
  id: string;
  pageKey: string;
  title: string;
  slug: string | null;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: ContentStatus;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  featuredImageUrl: string | null;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  category: string | null;
  visibility: "public" | "private";
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Announcement = {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  audience: "public" | "students" | "parents" | "applicants" | "admins";
  isImportant: boolean;
  status: ContentStatus;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Testimonial = {
  id: string;
  parentName: string;
  content: string;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CarouselSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
