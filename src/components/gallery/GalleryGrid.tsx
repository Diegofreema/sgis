import Image from "@/lib/compat/image";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/animations/StaggerChildren";
import type { GalleryItem } from "@/types/cms";

type Props = {
  items: GalleryItem[];
  // ponytail: admin inline-delete used service-role server actions that can't
  // run in the browser. Public gallery is read-only; gallery management lives
  // in the admin panel. Prop kept for call-site compatibility.
  isAdmin?: boolean;
};

export function GalleryGrid({ items }: Props) {
  return (
    <StaggerChildren className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {items.map((item) => (
        <StaggerItem key={item.id}>
          <div className="break-inside-avoid rounded-xl overflow-hidden bg-muted group">
            <div className="relative">
              <Image
                src={item.imageUrl}
                alt={item.title}
                width={600}
                height={400}
                unoptimized
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-300" />
            </div>
          </div>
        </StaggerItem>
      ))}
    </StaggerChildren>
  );
}
