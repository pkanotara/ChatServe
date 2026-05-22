# ChatServe — Deep Interview Guide

This guide explains ChatServe in an interview-friendly, system-design + implementation format.

---

## 1) What this project is

**ChatServe** is a **multi-tenant WhatsApp commerce automation platform** focused on restaurants (but partially generalized for service businesses too).

It solves two connected problems:

1. **Business onboarding automation**  
   A business owner messages a main WhatsApp bot, shares business details, and completes Meta Embedded Signup to connect their own WhatsApp Business number.

2. **Customer ordering automation**  
   Once configured, each business gets its own WhatsApp ordering bot + web dashboard for menu, orders, customers, broadcasts, and analytics.

---

## 2) High-level architecture

### Frontend (React + Vite)
- Role-based UI (`super_admin`, `restaurant_owner`)
- Uses Axios + token refresh interceptor
- Uses React Query for server state caching/polling
- Pages for admin operations, owner operations, onboarding, and authentication

### Backend (Node.js + Express)
- JWT auth, role middleware, centralized error handling
- REST APIs for auth, admin, owner, menu, orders, analytics, onboarding, embedded signup, webhooks
- Core business logic in services:
  - onboarding bot
  - restaurant bot
  - embedded signup orchestration
  - WhatsApp messaging/profile management

### Data layer (MongoDB + Mongoose)
- Multi-entity domain: `Restaurant`, `RestaurantOwner`, `WhatsAppConfig`, `Customer`, `Order`, `MenuCategory`, `MenuItem`, `OnboardingSession`, logs
- Explicit tenant scope through restaurant ownership and restaurant references in collections

### External systems
- **Meta WhatsApp Cloud API** (messaging, webhooks, embedded signup OAuth)
- **Cloudinary** (logo/catalog images)
- **Redis/BullMQ** (optional async infra)
- **SMTP** (password reset notifications)

---

## 3) Core product flows

## A) Owner onboarding flow (main bot)
1. Incoming webhook hits `/api/webhook`.
2. If message is to `MAIN_PHONE_NUMBER_ID`, backend routes to `handleOnboardingMessage`.
3. `OnboardingSession` tracks conversational step-by-step data collection:
   - owner name, business name, WhatsApp number, email, address, description, hours, categories, optional catalog, optional logo
4. On finalize:
   - creates/reuses `RestaurantOwner`
   - creates `Restaurant` (`status: pending_meta`)
   - creates `WhatsAppConfig` (`signupStatus: pending`)
   - optionally creates menu categories/items
   - generates onboarding link: `/onboard/:restaurantId`
5. Owner completes Meta Embedded Signup.
6. Callback `/api/embedded-signup/callback` resolves token + WABA + phone number ID and runs post-signup automation.
7. Restaurant becomes active, bot enabled, owner notified.

## B) Embedded Signup automation flow
- Exchanges OAuth code for token, optionally upgrades to long-lived token
- Resolves WABA ID using multiple fallbacks (`/me/whatsapp_business_accounts`, businesses graph, debug token scopes)
- Resolves exact phone number ID (supports selected phone number from session metadata)
- Stores resolved assets in `WhatsAppConfig`
- Runs automation:
  - webhook subscription
  - phone registration (cloud mode)
  - WhatsApp business profile sync
  - bot enablement
  - restaurant activation
  - owner notification + activity log

## C) Customer ordering flow (restaurant bot)
1. Incoming webhook to restaurant number ID (not main number).
2. Backend finds `WhatsAppConfig` with `botEnabled + configured`.
3. `buildContext` loads restaurant + customer state; creates customer if first interaction.
4. Bot command router handles global commands (`menu`, `cart`, `checkout`, `track`, `help`).
5. Step machine handles:
   - greeting
   - category/item browsing
   - cart changes
   - checkout + payment method
   - order tracking/cancellation
6. Orders persist in MongoDB; owner updates status via dashboard; customer receives WhatsApp order updates.

---

## 4) Data model design (interview points)

- **Restaurant**: tenant root; status lifecycle (`onboarding`, `pending_meta`, `active`, etc.); references owner + WhatsApp config.
- **RestaurantOwner**: auth identity for tenant admin; hashed password; refresh token storage.
- **WhatsAppConfig**: one-per-restaurant WhatsApp setup state and operational flags (`signupStatus`, `botEnabled`, `wabaId`, `phoneNumberId`, token).
- **Customer**: per-restaurant unique WhatsApp user with conversational session state (`botSession`).
- **Order**: status pipeline (`pending -> confirmed -> preparing -> ready -> delivered/cancelled`) + payment status + order history.
- **MenuCategory/MenuItem**: restaurant-scoped catalog with media support and basic product/service fields.
- **OnboardingSession**: stateful onboarding conversation persistence + completion linkage.
- **BroadcastLog/ActivityLog**: audit and communication tracking.

Key data design pattern: **restaurant-scoped references in nearly every operational collection** for tenant isolation.

---

## 5) Authentication and authorization

- JWT access + refresh model:
  - Access token checked on protected APIs
  - Refresh endpoint rotates refresh token
  - Axios interceptor auto-refreshes on `TOKEN_EXPIRED`
- Role guards in backend middleware:
  - `requireAdmin`
  - `requireOwner`
- Route-level enforcement for admin-only and owner-only capabilities

Interview note: refresh token is persisted per user in DB and cleared on logout/password reset workflows, helping invalidate sessions.

---

## 6) Security and reliability controls

- `helmet`, `cors`, API `rateLimit`
- Webhook signature verification in production (`x-hub-signature-256`)
- Input validation on key auth endpoints (`express-validator`)
- Password hashing (`bcryptjs`)
- Timed one-time state handling for embedded signup callback session tracking
- Graceful fallback behavior for optional infra failures (e.g., Redis optional, non-fatal profile sync failures)
- Cascade cleanup utilities to prevent orphan data and media leaks

---

## 7) Multi-tenancy implementation

Tenant model is **logical multi-tenancy**:
- Each operational record references a `restaurant`
- Backend queries are tenant-scoped using authenticated owner context
- Super admin can access cross-tenant views
- WhatsApp routing maps inbound `phoneNumberId` to tenant `WhatsAppConfig`

Interview framing: this is a practical shared-database, shared-schema multi-tenant architecture with app-level tenant guards.

---

## 8) Operational behavior and observability

- Health endpoint: `/health`
- Structured logging via Winston + Morgan stream
- Activity logs for major actions (logins, status changes, signup completion, etc.)
- Broadcast logs track outbound campaign progress
- Change stream watcher can cascade-delete related data when restaurant documents are externally deleted (requires replica set)

---

## 9) Revenue and analytics logic

Owner dashboard and analytics APIs aggregate live order data:
- Counts: total/today/pending orders, total customers
- Revenue rule in owner stats: includes orders with either:
  - `paymentStatus = paid`, or
  - `status = delivered` (COD-style realization)
- Top items from `Order.items` unwind/group pipelines
- Daily chart endpoint for trend visualization

---

## 10) Frontend architecture notes

- Single-page app with role-protected route trees:
  - `/admin/*`
  - `/dashboard/*`
- Auth context centralizes user/session lifecycle
- API layer centralizes Authorization header attachment + token refresh queueing
- React Query handles cache + polling for near-real-time dashboards and setup status

---

## 11) Trade-offs and improvement opportunities (great for interview discussion)

1. **State storage for embedded signup** currently in-memory map (route-level comment already suggests Redis for production).
2. **Single backend service** is simple to deploy, but bot execution, webhook ingestion, and dashboard APIs could be split as scale grows.
3. **Conversation state in Mongo document** is easy to reason about; event-sourced conversational history could improve traceability.
4. **Token handling and secrets** should be hardened further for enterprise production (vaulting, rotation policies, per-tenant secret strategy).
5. **Testing depth** appears limited in repo; adding integration tests around webhook + signup + order flows would improve reliability.

---

## 12) How to explain this project in an interview (2-minute script)

“ChatServe is a multi-tenant WhatsApp commerce platform. I built an onboarding bot that registers business owners over chat, collects their business details, and then drives them through Meta Embedded Signup to connect their own WhatsApp Business number.  
After signup, the platform auto-configures webhook subscriptions, profile settings, and bot activation.  
Each business gets an owner dashboard for menu management, order tracking, customer management, broadcasts, and analytics.  
Incoming WhatsApp messages are routed by phone number ID to either the onboarding bot or the correct tenant’s ordering bot.  
The backend is Node/Express with MongoDB, role-based JWT auth, and service-layer orchestration for WhatsApp integrations.  
The frontend is React with React Query and token-refresh interceptors for role-specific admin and owner experiences.”

---

## 13) Likely interview questions you can prepare from this codebase

- How did you implement tenant isolation?
- How do you handle webhook security and idempotency concerns?
- How do you recover from partial failures during Meta onboarding?
- Why did you choose state-machine style conversational flows?
- How do you model revenue for COD vs prepaid orders?
- How do you prevent session hijack with refresh tokens?
- What would you change first to scale this to 10k businesses?

---

## 14) Quick file map for interview walkthrough

- Backend entry: `backend/server.js`
- Webhook routing: `backend/routes/webhook.js`
- Onboarding bot: `backend/services/onboardingBotService.js`
- Restaurant bot orchestrator: `backend/services/restaurantBot/index.js`
- Embedded signup orchestration: `backend/services/embeddedSignupService.js`
- Admin APIs: `backend/routes/admin.js`
- Owner APIs: `backend/routes/restaurant.js`
- Menu APIs: `backend/routes/menu.js`
- Orders + analytics: `backend/routes/order.js`, `backend/routes/analytics.js`
- Auth: `backend/controllers/authController.js`, `backend/middleware/auth.js`
- Frontend routes root: `frontend/src/App.jsx`
- API client/interceptors: `frontend/src/services/api.js`
- Auth/session context: `frontend/src/context/AuthContext.jsx`

---

If you want, I can also add a **short “HR-friendly” one-page summary** and a **“deep technical architecture” version** as separate markdown files.
