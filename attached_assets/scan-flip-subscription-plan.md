# Scan Flip — Subscription Service Plan

## Overview

Two tiers: a **Free** plan with daily scan limits and no saving, and a **Pro** plan with unlimited scans and the bookmark/save feature. Stripe handles payments; subscription status is stored in the database and enforced server-side on every API request.

---

## Tier Comparison

| Feature | Free | Pro |
|---|---|---|
| Scans per day | 5 | Unlimited |
| Save / bookmark items | ❌ | ✅ |
| Saved items history | ❌ | ✅ |
| Sell-through & flip analysis | ✅ | ✅ |
| eBay link | ✅ | ✅ |

---

## Pricing Rationale

### Cost per paid user (monthly estimate)

| Cost component | Estimate | Basis |
|---|---|---|
| AI vision per scan (GPT-4o-mini) | ~$0.002 / scan | ~700 input tokens (image + prompt) + 200 output tokens at current rates |
| Paid user scan volume | ~300 scans/mo | ~10 scans/day, 30 days — typical part-time reseller |
| AI cost per user/month | ~$0.60 | 300 × $0.002 |
| Replit autoscale (2 vCPU / 4 GiB, shared across users) | ~$1.00–$2.00 / user at low scale | Amortised over active user base |
| Replit PostgreSQL | ~$0.05 / user | Minimal storage per user |
| Stripe fees | 2.9% + $0.30 / transaction | On each monthly charge |
| Clerk auth | Free up to 10k MAU | — |
| **Total infra cost per paid user** | **~$2.00–$3.00 / mo** | Conservative estimate |

### Comparable tools

| Tool | Price | Notes |
|---|---|---|
| Profit Bandit | $9.99/mo | Barcode scanner only, no vision |
| ScoutIQ | $14.95/mo | Books/media focused |
| eBay Terapeak | Free with eBay store ($21.95+/mo) | Historical data only, no camera |
| **Scan Flip (proposed)** | **$7.99/mo** | Camera AI + live eBay data |

### Recommended price: **$7.99/month**

- Leaves a ~$5 gross margin per user (~62%) after infra costs
- Undercuts every comparable tool while offering a better UX
- Accessible to part-time resellers (one good flip covers months of subscription)
- Annual plan at **$74.99/year** ($6.25/mo effective, ~22% discount) to improve retention

---

## Implementation Plan

### 1 — Database schema changes

Add a `subscriptions` table linked to the Clerk user ID, plus a `scan_usage` table for daily free-tier enforcement:

```sql
-- Subscription status per user
CREATE TABLE subscriptions (
  id                    SERIAL PRIMARY KEY,
  user_id               TEXT NOT NULL UNIQUE,        -- Clerk user ID
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  status                TEXT NOT NULL DEFAULT 'free', -- 'free' | 'active' | 'canceled' | 'past_due'
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily scan counter (for free tier enforcement)
CREATE TABLE scan_usage (
  user_id   TEXT NOT NULL,
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, scan_date)
);
```

---

### 2 — API server changes

#### New routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/billing/checkout` | Create a Stripe Checkout session and return the URL |
| `POST` | `/api/billing/portal` | Create a Stripe Customer Portal session for managing/canceling |
| `GET` | `/api/billing/status` | Return the current user's subscription status |
| `POST` | `/api/webhooks/stripe` | Receive Stripe events (subscription created/updated/deleted) |

#### Enforcement middleware on `POST /api/scan`

1. Check Clerk session → get `userId`
2. Look up subscription status in DB
3. If `status !== 'active'`:
   - Check `scan_usage` for today's count
   - If `count >= 5` → return `429` with `{ error: "Daily scan limit reached", upgradeUrl: "/upgrade" }`
   - Otherwise → increment counter and proceed
4. If `status === 'active'` → proceed directly

#### Enforcement on `POST /api/saved-items`

Check subscription status; if not active → return `403` with `{ error: "Pro feature", upgradeUrl: "/upgrade" }`

---

### 3 — Stripe configuration

1. Create two Stripe products in the dashboard:
   - **Scan Flip Pro (Monthly)** — $7.99/month recurring
   - **Scan Flip Pro (Annual)** — $74.99/year recurring
2. Enable **Stripe Customer Portal** (for self-serve cancellation/plan changes)
3. Configure webhook endpoint: `https://scanflip.online/api/webhooks/stripe`
4. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

#### Required secrets

| Secret | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | API calls from the server |
| `STRIPE_WEBHOOK_SECRET` | Verify incoming webhook signatures |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Monthly checkout session |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Annual checkout session |

---

### 4 — Frontend changes

#### New `/upgrade` page
- Side-by-side Free vs Pro comparison card
- **"Start Pro — $7.99/month"** button → calls `/api/billing/checkout` → redirects to Stripe Checkout
- Annual toggle showing $74.99/year savings
- After payment, Stripe redirects to `/upgrade?success=true` → shows confirmation → redirects to `/scan`

#### Scan limit banner (free users on scan screen)
- Subtle counter below the scan button: *"3 of 5 free scans used today"*
- When limit is hit: full-screen upgrade prompt replaces the scan result

#### Save button gate (on scan results)
- Free users tapping **Save Item** → bottom sheet: *"Save items with Scan Flip Pro — $7.99/month"* with upgrade button

#### Account / settings menu
- Show current plan status
- **"Manage Subscription"** button → calls `/api/billing/portal` → redirects to Stripe Portal

---

### 5 — Webhook handler logic

```
stripe event received
├── checkout.session.completed
│   └── upsert subscriptions row: status='active', store stripe_customer_id + stripe_subscription_id
├── customer.subscription.updated
│   ├── status='active'   → mark active, update current_period_end
│   ├── status='past_due' → mark past_due (keep access, show banner)
│   └── status='canceled' → mark canceled, access ends at current_period_end
└── customer.subscription.deleted
    └── mark status='free', clear stripe_subscription_id
```

---

## Rollout Sequence

1. **Schema migration** — add `subscriptions` and `scan_usage` tables to production DB
2. **Stripe setup** — create products, prices, portal config, webhook
3. **Backend** — webhook handler + `/api/billing/*` routes + enforcement middleware
4. **Frontend** — upgrade page, scan limit UI, save gate, account menu
5. **Test** — end-to-end with Stripe test mode: free limit, upgrade flow, portal cancel, webhook events
6. **Deploy & announce**

---

## Open Questions Before Building

- Should `past_due` subscriptions retain full access during the grace period, or immediately restrict to free limits?
- Should the annual plan be offered at launch or held for a v2?
- Do you want a free trial (e.g., 7 days Pro free) to reduce signup friction?
