# FUTURE.md - Addis Eats Capstone Scope & Roadmap

## 1. Feature Triage: Must, Should, Could

### Must (Shipped in Frontend Capstone)
These capabilities were non-negotiable for delivering a secure, production-grade food ordering experience in Addis Ababa:
- Multi-Role Authentication and Authorization: Customer, Kitchen Staff, Delivery Courier, and Administrator accounts with multi-layer defense (Edge middleware, Server Component guards, and Server Action checks).
- Responsive Catalog and Search: Server-rendered dish catalog with instant debounced search-as-you-type, category filtering, and zero-layout-shift image optimization.
- Mobile Touch and Keyboard Accessibility: 44px minimum touch targets, full keyboard operability (Tab, Enter, Space, Escape), high-contrast dark theme, and non-stuck mobile navigation.
- Resilient Cart and Checkout: Synchronized local cart storage, immediate post-order clearance via ClearCartOnMount, delivery fee computation by Addis Ababa sub-city, and double-submit form protection.
- Live Order Tracking and Lifecycle: Real-time order progress via SWR live polling (5-second intervals), 5-minute customer cancellation threshold, delivery receipt confirmation, and interactive 5-star customer review submission.
- Serverless State Hydration: Cookie-based order transport and disk cache fallback to eliminate cold-start 404 errors across serverless container boundaries.

### Should (Deferred to Module 4 Backend Transition)
These features provide operational value and are scheduled for the dedicated backend module:
- Dedicated Database Layer: Migrate from disk/cookie-hydrated memory state to PostgreSQL managed with Prisma ORM or TypeORM.
- Live Payment Gateway Integration: Direct TeleBirr and Chapa mobile wallet integration with server-to-server webhook verification.
- Push Notification Pipeline: Replace HTTP SWR polling with Server-Sent Events (SSE) or WebSockets for live status updates from kitchen to customer.
- Kitchen Audio Alerts: Real-time sound chime when new orders enter the kitchen queue.

### Could (Future Explorations)
- Real-Time Courier GPS Tracking: Interactive Mapbox route visualization showing courier bicycle/motorbike movement.
- Multi-Restaurant Merchant Marketplace: Vendor portal allowing independent Addis Ababa restaurants to manage distinct menus and operating hours.
- Automated SMS Receipts: Integration with local SMS gateways to send order receipts directly to Ethiopian phone numbers.

---

## 2. Cut Log and Engineering Decisions

During the capstone sprint, the following items were evaluated and intentionally cut or simplified to protect user experience and stability:

| Feature Evaluated | Decision | Rationale |
|---|---|---|
| Native WebSockets Server | Cut in favor of SWR HTTP Polling | Vercel serverless containers do not sustain persistent WebSocket connections without external paid infrastructure. SWR with dynamic interval provides reliable live updates with zero extra infrastructure cost. |
| Automatic Geolocation GPS Tracking | Cut in favor of Neighborhood Selector | Client browser geolocation in Addis Ababa frequently lacks building-level precision. Selecting Bole, Kazanchis, or Sarbet gives reliable delivery estimates without privacy prompts. |
| In-App Wallet and Stored Cards | Deferred to Module 4 Backend | Storing payment credentials requires strict PCI-DSS compliance and secure vault infrastructure, which belongs in a dedicated backend environment. |
| Complex Multi-Step Animations | Removed in favor of clean CSS Transitions | Heavy framer-motion animations increased client bundle size and degraded mobile LCP on slower 4G mobile devices. |

---

## 3. Transition Roadmap to Module 4 Backend

The next phase of Addis Eats shifts the application from a Next.js server actions architecture into a decoupled microservice or modular backend:

```
[ Next.js Client Frontend ]
            |
            v  (HTTPS / REST / JWT)
[ Backend API (Nest.js / Go / Node.js) ]
            |
    +-------+-------+
    |               |
    v               v
[ PostgreSQL ]  [ Redis Pub/Sub ]
```

1. **Step 1: Domain-Driven API Contracts:** Extract order processing, menu management, and authentication into OpenAPI / Swagger specifications.
2. **Step 2: Relational Schema Migration:** Model users, dishes, orders, order items, and audit logs into PostgreSQL tables with foreign key constraints.
3. **Step 3: Webhook Architecture:** Implement asynchronous webhook handlers for TeleBirr payment completion with replay attack protection.
4. **Step 4: Real-Time Event Bus:** Deploy Redis Pub/Sub to broadcast kitchen order progression directly to connected clients.
