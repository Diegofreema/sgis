import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Drop-in replacement for `next/image` used during the Vite migration.
 * Renders a plain <img>. `fill` reproduces Next's absolute-fill behavior
 * (parent must be positioned). Next-only props are accepted and dropped so
 * copied call sites keep working; `priority` maps to eager loading.
 */
type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "height" | "width"> & {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  sizes?: string;
  width?: number | string;
  height?: number | string;
};

export default function Image({
  src,
  alt,
  fill,
  priority,
  unoptimized: _unoptimized,
  sizes: _sizes,
  className,
  style,
  width,
  height,
  ...rest
}: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      className={cn(fill && "absolute inset-0 h-full w-full object-cover", className)}
      style={style}
      {...rest}
    />
  );
}
