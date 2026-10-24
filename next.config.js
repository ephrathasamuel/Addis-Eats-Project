/** @type {import('next').NextConfig} */
// Standard protective headers (OWASP). Deliberately no script/style policy:
// a strict Content-Security-Policy can silently break the map, Google sign-in
// and Next's own inline scripts, so it needs its own careful rollout.
const securityHeaders = [
  // Nobody may show this site inside a frame (stops clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Map tiles still get the site origin, as the OpenStreetMap policy asks.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Location only for this site (checkout pin, courier tracking); no camera/mic/payment APIs.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  allowedDevOrigins: ["10.2.0.2", "localhost:3000", "127.0.0.1:3000"],
  experimental: {
    serverActions: {
      // Dish and staff photos are resized in the browser, but leave room for
      // a large PNG screenshot pasted straight into the admin form.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

module.exports = nextConfig;
