import { MEDIA_CONTENT_TYPES, readMediaFile } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { file } = await params;
  const data = readMediaFile(file);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }
  const extension = file.split(".").pop();
  return new Response(data, {
    headers: {
      "Content-Type": MEDIA_CONTENT_TYPES[extension],
      // File names are random UUIDs and never reused, so they can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
