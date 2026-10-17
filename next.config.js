/** @type {import('next').NextConfig} */
const nextConfig = {
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
