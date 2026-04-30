# ChatServe — WhatsApp Onboarding Engine

A production-ready multi-tenant WhatsApp Business onboarding platform for restaurant owners. Restaurant owners message your main WhatsApp bot, provide their business details, complete Meta Embedded Signup, and the system auto-configures their WhatsApp ordering chatbot.

---

## How It Works

```
Restaurant Owner → WhatsApp Bot (Main Number)
    ↓ collects business details via chat
MongoDB (OnboardingSession saved)
    ↓
Meta Embedded Signup (owner logs into Facebook + verifies phone)
    ↓
Backend callback → WABA ID + Phone Number ID saved
    ↓
Chatbot initialized on restaurant's own WhatsApp number
    ↓
Restaurant Owner Dashboard activated (orders, menu, customers, broadcast)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Frontend | React 18 + Vite |
| Auth | JWT (access 15m + refresh 7d) |
| File Storage | Cloudinary |
| WhatsApp | Meta WhatsApp Cloud API v19.0 |
| Async Jobs | BullMQ + Redis (optional) |
| Styling | Tailwind CSS |
| Charts | Recharts |

---

## Project Structure

```
ChatServe/
├── backend/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   ├── redis.js            # Redis / BullMQ init
│   │   └── cloudinary.js       # Cloudinary config
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT verify, role guards
│   │   ├── errorHandler.js     # Global error handler
│   │   └── upload.js           # Multer + Cloudinary
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Restaurant.js
│   │   ├── RestaurantOwner.js
│   │   ├── WhatsAppConfig.js
│   │   ├── Order.js
│   │   ├── Customer.js
│   │   ├── Menu.js
│   │   ├── OnboardingSession.js
│   │   └── Logs.js
│   ├── routes/
│   │   ├── auth.js             # Login, refresh, logout
│   │   ├── admin.js            # Super admin panel APIs
│   │   ├── restaurant.js       # Restaurant owner APIs
│   │   ├── menu.js             # Menu categories + items
│   │   ├── order.js            # Order management
│   │   ├── webhook.js          # Meta webhook receiver
│   │   ├── embeddedSignup.js   # Meta OAuth callback
│   │   ├── onboarding.js       # Onboarding session APIs
│   │   ├── analytics.js        # Charts + revenue data
│   │   └── upload.js           # File upload endpoint
│   ├── services/
│   │   ├── restaurantBot/      # WhatsApp ordering bot logic
│   │   ├── onboardingBotService.js
│   │   ├── embeddedSignupService.js
│   │   ├── notificationService.js
│   │   ├── whatsappService.js
│   │   └── whatsappProfileService.js
│   ├── utils/
│   │   ├── seed.js             # DB seeder (admin + demo restaurant)
│   │   ├── jwt.js
│   │   ├── helpers.js
│   │   ├── logger.js
│   │   └── phoneUtils.js
│   ├── .env                    # Environment variables
│   ├── package.json
│   └── server.js
└── frontend/
    └── src/
        ├── components/         # Reusable UI components
        ├── context/            # AuthContext (JWT + user state)
        ├── layouts/            # AdminLayout, RestaurantLayout
        ├── pages/
        │   ├── admin/          # Super admin dashboard pages
        │   ├── auth/           # Login, onboarding pages
        │   └── restaurant/     # Restaurant owner dashboard pages
        ├── services/
        │   └── api.js          # Axios instance with auth interceptors
        ├── App.jsx
        └── main.jsx
```

---

## Roles & Access

| Role | Access |
|---|---|
| `super_admin` | Full platform — all restaurants, orders, configs, broadcast |
| `restaurant_owner` | Own restaurant only — menu, orders, customers, WhatsApp setup |

---

## Prerequisites

Before you start, make sure you have:

- **Node.js** >= 18
- **MongoDB** — local (`mongodb://localhost:27017`) or MongoDB Atlas
- **Redis** — local (`redis://localhost:6379`) — optional, BullMQ jobs disabled if not available
- **Meta Developer Account** — [developers.facebook.com](https://developers.facebook.com)
- **Cloudinary Account** — [cloudinary.com](https://cloudinary.com)
- **ngrok** (for local development webhook exposure)

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/pkanotara/ChatServe.git
cd ChatServe

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2 — Environment Setup

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in all values:

```env
# ─── Server ───────────────────────────────────────────────
PORT=5000
NODE_ENV=development

# ─── MongoDB ──────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/chatserve

# ─── JWT ──────────────────────────────────────────────────
JWT_ACCESS_SECRET=<generate-a-random-32-char-string>
JWT_REFRESH_SECRET=<generate-a-different-random-32-char-string>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ─── Redis (BullMQ) — optional ────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Cloudinary ───────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# ─── Meta / WhatsApp Cloud API ────────────────────────────

META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>
META_WEBHOOK_VERIFY_TOKEN=<any-secret-string-you-choose>
META_GRAPH_API_VERSION=v19.0

# ─── Main Platform Bot (restaurant owners message this number to register) ───
MAIN_PHONE_NUMBER_ID=<phone-number-id-from-meta>
MAIN_WABA_ID=<waba-id-from-meta>
MAIN_ACCESS_TOKEN=<permanent-access-token-from-meta>

# ─── Meta Embedded Signup ─────────────────────────────────
META_CONFIG_ID=<your-meta-config-id>
EMBEDDED_SIGNUP_REDIRECT_URI=https://<your-ngrok-or-domain>/api/embedded-signup/callback

# ─── Frontend URL ─────────────────────────────────────────
FRONTEND_URL=http://localhost:3000

# ─── Webhook Base URL ─────────────────────────────────────
WEBHOOK_BASE_URL=https://<your-ngrok-or-domain>

# ─── Super Admin Seed ─────────────────────────────────────
SEED_ADMIN_EMAIL=admin@chatserve.com
SEED_ADMIN_PASSWORD=Admin@1234!
SEED_ADMIN_NAME=Your Name

# ─── SMTP (for password reset emails) ────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-gmail>
SMTP_PASS=<your-gmail-app-password>
SMTP_FROM=ChatServe <your-gmail>
DASHBOARD_URL=http://localhost:3000
```

> **Tip — Generate JWT secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## Step 3 — Meta Developer App Setup

### 3.1 Create the App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Select **Business** type
3. Add the **WhatsApp** product to your app

### 3.2 Get Your Credentials

From **WhatsApp → API Setup**:
- Copy **Phone Number ID** → `MAIN_PHONE_NUMBER_ID`
- Copy **WhatsApp Business Account ID** → `MAIN_WABA_ID`
- Generate a **Permanent Access Token** → `MAIN_ACCESS_TOKEN`
- Copy **App ID** → `META_APP_ID`
- Copy **App Secret** → `META_APP_SECRET`

### 3.3 Configure Webhook

1. Go to **WhatsApp → Configuration → Webhook**
2. Set **Callback URL**: `https://<your-ngrok-url>/api/webhook`
3. Set **Verify Token**: same value as `META_WEBHOOK_VERIFY_TOKEN` in your `.env`
4. Click **Verify and Save**
5. Subscribe to the **`messages`** webhook field

### 3.4 Enable Embedded Signup (Business Login)

1. Go to **App Settings → Advanced** → enable **Business Login**
2. Go to **Facebook Login → Settings**
3. Add OAuth Redirect URI: `https://<your-ngrok-url>/api/embedded-signup/callback`
4. Copy the **Config ID** → `META_CONFIG_ID`

---

## Step 4 — Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. From your dashboard copy:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

---

## Step 5 — Seed the Database

Creates the super admin account and a demo restaurant:

```bash
cd backend
npm run seed
```

Output:
```
✅ MongoDB connected
✅ Super admin created: admin@chatserve.com
✅ Demo restaurant "Spice Garden" created
   Owner email: demo@spicegarden.com
   Owner password: Demo@1234!

🚀 Seed complete!
Admin login: admin@chatserve.com / Admin@1234!
```

---

## Step 6 — Expose Webhook (Development)

Meta requires a public HTTPS URL for webhooks. Use ngrok:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 5000
```

Copy the `https://` URL (e.g. `https://abc123.ngrok-free.app`) and update your `.env`:

```env
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app
EMBEDDED_SIGNUP_REDIRECT_URI=https://abc123.ngrok-free.app/api/embedded-signup/callback
```

Also update the webhook URL and OAuth redirect URI in your Meta Developer App (Step 3.3 and 3.4).

> **Note:** ngrok URL changes every restart on the free plan. Update `.env` and Meta app settings each time.

---

## Step 7 — Start Development

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Visit:
- **Frontend**: http://localhost:3000
- **Admin Login**: http://localhost:3000/login
- **Health Check**: http://localhost:5000/health

---

## Step 8 — Login & First Steps

### Admin Dashboard
1. Go to http://localhost:3000/login
2. Login with `admin@chatserve.com` / `Admin@1234!`
3. You'll see the super admin dashboard with platform stats

### Restaurant Owner Dashboard
1. Login with `demo@spicegarden.com` / `Demo@1234!`
2. You'll see the restaurant dashboard — orders, menu, customers, WhatsApp setup

---

## Step 9 — Activate a Restaurant's WhatsApp

### Option A — Via Admin Dashboard (recommended for testing)
1. Login as admin → **Restaurants** → click a restaurant
2. Click **Configure WhatsApp Manually**
3. Enter:
   - **WABA ID** — from Meta Developer Console
   - **Phone Number ID** — from Meta Developer Console
   - **Access Token** — leave empty to use `MAIN_ACCESS_TOKEN`
4. Click **Activate**

### Option B — Via Restaurant Owner Dashboard
1. Login as restaurant owner → **WhatsApp Setup**
2. Click **Configure WhatsApp Manually**
3. Enter WABA ID, Phone Number ID, Access Token
4. Click **Activate WhatsApp**

### Option C — Via Meta Embedded Signup (production flow)
1. Restaurant owner goes to **WhatsApp Setup** → **Complete WhatsApp Business Setup**
2. They log into Facebook, select their Business Account, verify their phone number
3. System auto-configures everything via the OAuth callback

---

## API Endpoints Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login (admin or owner) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |

### Admin (requires `super_admin`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform-wide stats |
| GET | `/api/admin/restaurants` | List all restaurants |
| GET | `/api/admin/restaurants/:id` | Get single restaurant |
| PATCH | `/api/admin/restaurants/:id/status` | Activate / deactivate |
| DELETE | `/api/admin/restaurants/:id` | Delete restaurant + all data |
| POST | `/api/admin/restaurants/:id/activate-whatsapp` | Manual WhatsApp activation |
| POST | `/api/admin/restaurants/:id/refresh-profile` | Sync WhatsApp business profile |
| GET | `/api/admin/restaurants/:id/whatsapp-profile` | Get live Meta profile |
| POST | `/api/admin/restaurants/:id/test-send` | Send test WhatsApp message |
| POST | `/api/admin/restaurants/:ownerId/reset-password` | Reset owner password |
| GET | `/api/admin/orders` | All orders platform-wide |
| POST | `/api/admin/broadcast` | Broadcast to restaurant owners |
| GET | `/api/admin/activity-logs` | Activity audit log |

### Restaurant Owner (requires `restaurant_owner`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/restaurant/profile` | Get restaurant profile |
| PATCH | `/api/restaurant/profile` | Update profile |
| POST | `/api/restaurant/logo` | Upload logo |
| GET | `/api/restaurant/stats` | Dashboard stats |
| GET | `/api/restaurant/orders` | List orders |
| PATCH | `/api/restaurant/orders/:id/status` | Update order status |
| GET | `/api/restaurant/customers` | List customers |
| GET | `/api/restaurant/whatsapp` | WhatsApp config |
| PATCH | `/api/restaurant/whatsapp/bot` | Toggle bot on/off |
| POST | `/api/restaurant/whatsapp/manual-activate` | Manual WhatsApp activation |
| POST | `/api/restaurant/sync-whatsapp-profile` | Sync profile to WhatsApp |
| POST | `/api/restaurant/broadcast` | Broadcast to customers |

### Menu
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/menu/categories` | List categories |
| POST | `/api/menu/categories` | Create category |
| PATCH | `/api/menu/categories/:id` | Update category |
| DELETE | `/api/menu/categories/:id` | Delete category |
| GET | `/api/menu/items` | List menu items |
| POST | `/api/menu/items` | Create menu item |
| PATCH | `/api/menu/items/:id` | Update menu item |
| DELETE | `/api/menu/items/:id` | Delete menu item |

### Webhook
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/webhook` | Meta webhook verification |
| POST | `/api/webhook` | Receive incoming WhatsApp messages |

### Embedded Signup
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/embedded-signup/link/:restaurantId` | Get signup URL |
| GET | `/api/embedded-signup/callback` | OAuth callback from Meta |

---

## Revenue Logic

Both **This Month Revenue** and **All-Time Revenue** are live MongoDB aggregations. An order is counted in revenue when:

- `paymentStatus === 'paid'` (online payments), **OR**
- `status === 'delivered'` (Cash on Delivery orders)

This means COD orders are counted as revenue as soon as you mark them **Delivered** from the dashboard.

---

## Order Status Notifications

When you update an order status from the dashboard, the customer automatically receives a WhatsApp message with:

- Status header (Confirmed / Preparing / Ready / Delivered / Cancelled)
- Full items list with quantities and prices
- Order total
- Payment method and status
- Delivery address or pickup info
- Any special notes

---

## WhatsApp Bot Flow (Customer Ordering)

```
Customer messages restaurant's WhatsApp number
    ↓
Bot greets and shows menu categories
    ↓
Customer selects category → items shown
    ↓
Customer adds items to cart
    ↓
Customer confirms order → delivery/pickup selection
    ↓
Order saved to MongoDB
    ↓
Restaurant owner notified on dashboard
    ↓
Owner updates status → customer gets WhatsApp notification
```

---

## Onboarding Bot Flow (Restaurant Registration)

```
Restaurant owner messages MAIN_PHONE_NUMBER_ID
    ↓
Bot collects: business name, address, phone, food categories
    ↓
OnboardingSession saved to MongoDB
    ↓
Bot sends Embedded Signup link
    ↓
Owner completes Meta login + phone verification
    ↓
/api/embedded-signup/callback fires
    ↓
WhatsAppConfig created, bot initialized, dashboard credentials sent
```

---

## Common Issues & Fixes

### Webhook not receiving messages
- Make sure ngrok is running and `WEBHOOK_BASE_URL` is updated in `.env`
- Verify the webhook URL and verify token match in Meta Developer Console
- Check that the `messages` webhook field is subscribed

### "WhatsApp not configured" error
- The restaurant needs a `WhatsAppConfig` with `signupStatus: 'configured'` and a real `phoneNumberId`
- Use **Configure WhatsApp Manually** in admin or restaurant dashboard

### Revenue showing ₹0
- Check that orders have `status: 'delivered'` or `paymentStatus: 'paid'`
- COD orders only count after being marked as delivered

### JWT token expired errors
- Access tokens expire in 15 minutes — the frontend auto-refreshes using the refresh token
- If refresh token also expires (7 days), user must log in again

### Duplicate index warning on startup
- Already fixed — `tenantId` index was declared twice in `Restaurant.js`

### Redis not connected
- Redis is optional — BullMQ jobs are disabled if Redis is unavailable
- The app runs fully without Redis

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas with a strong password
- [ ] Use a managed Redis (Upstash, Redis Cloud)
- [ ] Set strong random values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Replace ngrok with a real domain + SSL certificate
- [ ] Update `FRONTEND_URL`, `WEBHOOK_BASE_URL`, `EMBEDDED_SIGNUP_REDIRECT_URI` to production URLs
- [ ] Update Meta App webhook URL and OAuth redirect URI to production URLs
- [ ] Switch Meta App from Development to Live mode
- [ ] Set up a permanent Meta access token (System User token)
- [ ] Configure SMTP for password reset emails
- [ ] Build frontend: `cd frontend && npm run build`

---

## License

MIT
