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
