# SEO.md - Metadata, Social Previews & Discoverability Audit

## 1. Metadata Hierarchy & Title Templates

Next.js root layout defines `metadataBase` and a title template so child routes only supply page-specific titles:
- **metadataBase:** `new URL("https://addiseats.et")` - ensures all relative openGraph images resolve to absolute URLs for social crawlers (Telegram, Twitter/X, Facebook, WhatsApp).
- **Template:** `%s | Addis Eats`
- **Default Title:** `Addis Eats | Authentic Ethiopian Food Delivery`

| Route | Title Rendered | Canonical URL | Indexable |
|---|---|---|---|
| `/` | `Home \| Authentic Ethiopian Cuisine \| Addis Eats` | `https://addiseats.et/` | Yes |
| `/menu` | `Menu \| Addis Eats` | `https://addiseats.et/menu` | Yes |
| `/menu/[id]` | `Doro Wat - 320 ETB \| Addis Eats` | `https://addiseats.et/menu/doro-wat` | Yes |
| `/cart` | `Your Cart \| Addis Eats` | N/A | **No** (Disallowed in robots.js) |
| `/checkout` | `Checkout \| Addis Eats` | N/A | **No** (Disallowed in robots.js) |
| `/orders` | `Your Orders \| Addis Eats` | N/A | **No** (Private account data) |
| `/kitchen` | `Kitchen Queue \| Addis Eats` | N/A | **No** (Staff internal only) |

---

## 2. Canonical URLs

The menu page declares `alternates: { canonical: "/menu" }`.
- When users visit `/menu?category=Meat` or `/menu?q=tib` or `/menu?page=2`, search engine crawlers consolidate link equity and index credit into the canonical `/menu` endpoint rather than splitting domain authority across fragment variations.

---

## 3. Structured Data (JSON-LD)

Implemented directly in Server Components using `<script type="application/ld+json">`:
- **Landing Page (`/`):** Generates Schema.org `Restaurant` with address, cuisine type (`Ethiopian`), and price range.
- **Dish Detail Pages (`/menu/[id]`):** Generates Schema.org `MenuItem` with `name`, `description`, `image`, and `offers: { price, priceCurrency: "ETB", availability: "InStock" }`.
- **Integrity Guarantee:** Uses the exact same `dish` record that server-renders the HTML view, guaranteeing zero mismatch between rich search results and page content.

---

## 4. Social OpenGraph Previews

- **Site-Wide Preview (`app/opengraph-image.jsx`):** Generated using Next.js `ImageResponse` at 1200 x 630 dimensions with the brand gradient.
- **Dynamic Dish Previews (`app/menu/[id]/opengraph-image.jsx`):** Generates custom dish preview cards with dish name, category pill, price in ETB, and description on demand.

---

## 5. Robots & Sitemap

- **`app/sitemap.js`:** Dynamically queries `getDishes()` at build/request time to output all valid dishes, assigning priorities (1.0 for home, 0.8 for menu, 0.7 for dishes).
- **`app/robots.js`:** Explicitly disallows private dynamic routes (`/cart`, `/checkout`, `/orders`, `/kitchen`, `/signin`) so search engine crawl budgets are focused strictly on public customer-facing menus.
