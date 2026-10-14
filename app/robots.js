export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://addiseats.et";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/menu", "/privacy", "/terms"],
      disallow: ["/cart", "/checkout", "/orders", "/kitchen", "/signin"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
