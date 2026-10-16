# Addis Eats - Full Stack Next.js Food Ordering Platform

> **IBT College - CodeOps Full Stack Software Development**  
> **Module 3: Frontend (React & Next.js) - Capstone Production Release**

---

## 1. Live Deployment and Access

- **Production URL:** `https://addis-eats-capstone.vercel.app`
- **Platform:** Vercel (Next.js 16 with Turbopack)
- **Deployment Status:** Demo deployment; configure shared persistent storage and provisioned staff accounts before production use.

### Role Access Reference
Customers register through Supabase Auth. Trusted Supabase project administrators assign `admin`, `staff`, and `delivery` roles in the protected profile table. See [SUPABASE.md](./SUPABASE.md) for project setup.

---

## 2. Eight-Minute Presentation Walkthrough

When presenting Addis Eats from the live production URL, follow this timed walkthrough:

### Minute 0 to 1: Problem and Local Addis Ababa Context
- Introduce Addis Eats: A localized food ordering platform tailored for Addis Ababa, bridging authentic Ethiopian cuisine (Doro Wat, Tibs, Shiro) and Western classics (Burgers, Pizza).
- Highlight local challenges solved: Neighborhood-specific delivery fees and estimated travel-time ranges across Addis Ababa. The current ranges are static, not routing- or traffic-based.

### Minute 1 to 3: Customer Discovery and Order Placement
- Demonstrate the homepage hero banner with optimized WebP media and zero layout shift.
- Navigate to `/menu`: Showcase instant search-as-you-type with debouncing and category filtering.
- Inspect dish detail on `/menu/[id]` and demonstrate breadcrumb navigation.
- Add dishes to the cart and open `/cart`: Highlight the mobile-friendly item layout, portion controls, and subtotal calculation.
- Proceed to `/checkout`: Show address selection with live delivery fee calculation, double-submit button guard, and form placement.

### Minute 3 to 5: Live Order Tracking and Post-Delivery Workflow
- Arrive at `/checkout/confirmation`: Point out the persistent cart clearing via ClearCartOnMount and the kitchen status banner.
- Open `/orders/[id]`: Demonstrate real-time status tracking driven by SWR live polling (every 5 seconds).
- Courier GPS is opt-in from the courier delivery page and appears only when the assigned courier shares browser location. Customers can optionally add a delivery map pin at checkout.
- Showcase the Cancel Request action, strictly available within the first 5 minutes of order placement.
- Show the receipt confirmation prompt ("Did you receive your delivery?") and the post-delivery review card featuring 5 purple stars and feedback submission.

### Minute 5 to 6: Staff and Administrative Operations
- Switch to `/kitchen`: Show kitchen staff advancing order tickets from Cooking to Ready for Courier.
- Switch to `/delivery`: Show delivery couriers claiming orders and completing deliveries.
- Switch to `/admin`: Inspect aggregated revenue metrics, neighborhood sales distribution, and order history management.

### Minute 6 to 7: Security Architecture and Performance Verification
- Explain the 3-layer security defense: Edge middleware, Server Component guards, and Server Action role verification.
- Highlight the 3 failed attack scenarios documented in `AUTH.md`: console write refusal, foreign user ID tampering refusal, and open-redirect neutralization.
- Present performance metrics from `PERF.md`: LCP of 1.8s, CLS of 0.00, and 100 Accessibility score.
- Explain the local opaque-session store and role-scoped order queries. The included JSON files are for single-process development, not serverless production persistence.

### Minute 7 to 8: Engineering Retrospective and Module 4 Roadmap
- Summarize feature triage from `FUTURE.md`: Must/Should/Could decisions.
- Outline the transition to the Module 4 Backend: decoupled Nest.js/Go API, PostgreSQL database with Prisma ORM, and TeleBirr webhook processing.
- Open for questions and peer review discussion from `REVIEW.md`.

---

## 3. Five Anchor Files for Code Review

Open these five files in editor tabs to examine the core architecture:
1. **Server Component:** `app/orders/page.js` - Server-side session verification and user-scoped data fetching.
2. **Client Component:** `app/orders/[id]/OrderStatus.jsx` - SWR live polling, dynamic interval pausing, receipt confirmation, and 5-star review.
3. **Protected Server Action:** `app/actions.js` - Multi-role authorization checks for `placeOrder`, `cancelOrder`, and `updateKitchenStatus`.
4. **Data Layer and Domain State:** `lib/orders.js` - Order state management, role-scoped data, and workflow transitions.
5. **Performance Refactor:** `app/menu/DishCard.jsx` - Refactored to pure Server Component to reduce client JavaScript and optimize LCP.

---

## 4. Running Locally from a Fresh Clone

Follow these steps to run the application locally:

```bash
# 1. Clone repository
git clone https://github.com/IBT-Qiyas-Full-Stack-Academy/sq2-iphratha-samuel.git
cd sq2-iphratha-samuel/module-04-backend/days/Day_48/addis-eats

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Run development server with Turbopack
npm run dev

# 5. Or build and run for production verification
npm run build
npm run start
```

---

## 5. Environment Variables Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes for authentication | Supabase project URL | `https://your-project-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes for authentication | Supabase public publishable key (or legacy anon key) | Configure privately |
| `ADDIS_DATA_DIR` | Optional | Directory for local JSON order data; not used for authentication | `.addis-data` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical app URL and Supabase confirmation redirect origin | `http://localhost:3001` |
| `NODE_ENV` | Yes | Deployment environment flag | `production` |

---

## 6. Project Documentation Index

- `AUTH.md` - Authentication and authorization boundaries.
- `SUPABASE.md` - Supabase project setup, migration, and trusted role assignment.
- `PERF.md` - Performance budget, Core Web Vitals (LCP, CLS, INP), and optimization techniques.
- `DATA.md` - Client and server data fetching rationale, SWR caching rules, and revalidation models.
- `FUTURE.md` - Feature triage (Must, Should, Could), cut decisions, and Module 4 backend transition roadmap.
- `REVIEW.md` - Peer code review guide, 3 architectural strengths, 3 discussion questions, and rubric matrix.
- `SEO.md` - Metadata configuration, OpenGraph card generation, sitemap, and robots.txt.
