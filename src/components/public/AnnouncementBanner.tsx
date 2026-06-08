"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Announcement } from "@/types/cms";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type AnnouncementBannerProps = {
  announcements: Announcement[];
};

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const prefersReduced = useReducedMotion();

  if (!announcements.length) return null;

  const important = announcements.filter((a) => a.isImportant);
  if (!important.length) return null;

  return (
    <div className="bg-primary text-primary-foreground py-2 overflow-hidden">
      <div className="container mx-auto container-padding flex items-center gap-3">
        <Bell className="h-3.5 w-3.5 shrink-0" />
        <div className="flex-1 overflow-hidden relative">
          <motion.div
            className="flex gap-16 whitespace-nowrap"
            animate={
              prefersReduced
                ? {}
                : { x: ["0%", "-50%"] }
            }
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {[...important, ...important].map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={`/news/${item.slug}`}
                className="text-xs font-medium opacity-90 hover:opacity-100 transition-opacity"
              >
                {item.title}
              </Link>
            ))}
          </motion.div>
        </div>
        <Link
          href="/news"
          className="text-xs underline underline-offset-2 shrink-0 opacity-80 hover:opacity-100"
        >
          View all
        </Link>
      </div>
    </div>
  );
}
