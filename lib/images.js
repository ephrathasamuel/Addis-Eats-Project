// Safe to use in browser and server code.

/**
 * Uploaded photos (local /media files, inline data, Supabase Storage links)
 * are already resized when uploaded, so next/image shows them as they are.
 */
export function isUploadedImage(src) {
  return (
    typeof src === "string" &&
    (src.startsWith("/media/") || src.startsWith("data:") || src.includes("/storage/v1/object/public/"))
  );
}

/**
 * A small version of one of the site's own photos, for thumbnails shown with a
 * plain <img>. Uses Next's built-in image resizer; other images are unchanged.
 * Widths must be one of the sizes in next.config.js (16-256 or 360+).
 */
export function thumbnailSrc(src, width = 96) {
  if (typeof src !== "string" || !src.startsWith("/images/")) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
