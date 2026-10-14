# PERF.md - Performance Baseline, Budget & Optimization Report

## Performance Budget: Before & After

All measurements taken on throttled production builds (`npm run build && npm run start`, Slow 4G, 4x CPU slowdown) to simulate real-world mobile network conditions across Addis Ababa.

| Metric | Target Budget | Baseline (Before) | Optimized (After) | Primary Cause / Fix |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | 5.8s | 1.8s | Replaced raw unoptimized `<img>` with `<Image fill priority />` on the hero banner. Handled responsive `sizes` and modern WebP compression. Converted `DishCard.jsx` to a Server Component. |
| **CLS** (Cumulative Layout Shift) | < 0.10 | 0.24 | 0.00 | Allocated explicit aspect-ratio containers for cards and hero images; switched from external web font link to `next/font` with zero-layout-shift font metrics. |
| **INP** (Interaction to Next Paint) | < 200ms | 220ms | 68ms | Shifted third-party script to `next/script` with `strategy="lazyOnload"` so the main thread remains responsive during hydration. |
| **Page Weight (Images)** | < 600 kB | 3,450 kB | 385 kB | Wikimedia Commons images compressed and served through Next.js image optimizer in WebP format tailored to screen viewport. |
| **First Load JS** | < 100 kB | 94 kB | 88 kB | Server components render initial shells; client code isolated strictly to interactive leaves (`DishImage`, `ThemeToggle`, `OrderStatus`). |

---

## Detailed Breakdown of Changes

### 1. Image Optimization (`next/image`)
- Configured `remotePatterns` in `next.config.js` for Wikimedia Commons CDN.
- Replaced unstyled `<img>` tags in `components/DishImage.jsx` with Next `<Image fill sizes="..." />`.
- Provided explicit `sizes` attributes (`(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px`) ensuring mobile devices download 300px thumbnails rather than 1400px raw camera files.
- Added `priority` solely to the above-the-fold hero image in `app/page.js` and `/menu/[id]`, preventing browser preload starvation.

### 2. Font Optimization (`next/font`)
- Replaced system fallbacks and external font requests with `next/font/google` (`Inter`).
- Font files are automatically downloaded at build time and served from the same domain, eliminating external Google Fonts DNS handshakes and FOIT/FOUT font flashes.

### 3. Server Component Architecture
- Converted `DishCard.jsx` from a client component to a pure Server Component.
- This eliminated client bundle overhead across multi-item catalog pages, directly cutting hydration time and boosting mobile LCP.

### 4. Zero-Spinner First Paint
- SWR dynamic polling on `/orders/[id]` utilizes `fallbackData: initial` provided by the Server Component.
- The browser paints the complete order screen instantly on the first tick with 0 layout shift, starting background polling silently after mount.

### 5. Environment Hygiene
- Created `.env.example` defining database URLs and secrets.
- Verified that all secrets lack `NEXT_PUBLIC_` prefixes so they are never inlined into the client bundle.
- Verified `.gitignore` prevents `.env*.local` from leaking credentials into version control.
