export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://addiseats.et";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/menu", "/privacy", "/terms"],
      disallow: ["/cart", "/checkout", "/orders", "/kitchen", "/delivery", "/admin", "/dashboard", "/track", "/profile", "/signin", "/api/", "/media/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
