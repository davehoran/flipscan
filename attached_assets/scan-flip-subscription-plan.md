# Scan Flip — Subscription Service Plan

## Overview

Two tiers: a **Free** plan with a 7-day Pro trial, daily scan limits after trial, and no saving; and a **Pro** plan with unlimited scans and the bookmark/save feature. Stripe handles automatic recurring billing; subscription status is stored in the database and enforced server-side on every API request.

---

## Tier Comparison

| Feature | Free | Pro |
|---|---|---|
| Scans per day | 5 (after trial) | Unlimited |
| Save / bookmark items | ❌ | ✅ |
| Saved items history | ❌ | ✅ |
| Sell-through & flip analysis | ✅ | ✅ |
| eBay link | ✅ | ✅ |
| Free trial | 7 days Pro free | — |

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
| **Scan Flip (proposed)** | **$7.99/mo** | Camera AI + live eBay data + 7-day free trial |

### Recommended pricing

| Plan | Price | Notes |
|---|---|---|
| Pro Monthly | $7.99/month | 7-day free trial on first subscription |
| Pro Annual | $74.99/year | $6.25/mo effective (~22% discount), 7-day free trial |

Gross margin per paid user: ~$5/mo (~62%) after infra costs.

---

## Free Trial

All new sign-ups receive a **7-day Pro trial** automatically — no credit card required at sign-up.

- Trial is created via a Stripe trial period on the checkout session (`trial_period_days: 7`)
- At trial end, Stripe automatically charges the card on file and activates the subscription
- If no payment method is provided before trial ends, the subscription moves to `canceled` and the user drops to the Free tier
- Trial messaging appears on:
  - The **pricing page** (pre-login): *"Try Pro free for 7 days — no credit card required"*
  - The **sign-up page**: subtitle or badge near the CTA
  - The **welcome/intro email** sent to every new user on account creation
  - The **upgrade page** (logged-in): countdown to trial end if user is currently in trial

### Subscription status values

Stripe handles all billing automatically on the monthly or annual cadence. The only states we track are:

| Status | Meaning | Access |
|---|---|---|
| `trialing` | Within the 7-day free trial | Full Pro access |
| `active` | Paid subscription in good standing | Full Pro access |
| `canceled` | Subscription ended (trial expired without payment, or user canceled) | Free tier limits apply |
| `free` | Default — never started a trial or subscription | Free tier limits apply |

> **Note on payment failures:** Even with automatic billing, Stripe may briefly mark a subscription `past_due` if a card charge fails (e.g. expired card). Stripe automatically retries the charge over several days. During that window the user retains full access and sees a *"Payment issue — please update your card"* banner. If all retries fail, Stripe fires `customer.subscription.deleted` and we mark the user `canceled`. No special `past_due` enforcement logic is needed in our application.

---

## Referral Program

Users can invite friends via the `/refer` page. No incentive is offered at launch.

### Future incentive option — Stripe Coupons

When ready to add incentives, Stripe supports this natively:

1. Create a **Coupon** in Stripe (e.g. `1_MONTH_FREE` — 100% off for one billing cycle)
2. Create a **Promotion Code** tied to that coupon for each referral (or use a single shared code per user)
3. When the referred friend signs up, apply the promotion code to their Checkout session
4. For the referrer reward: use the Stripe API to apply a one-time credit to their customer balance (`stripe.customers.createBalanceTransaction`)

This requires a referral tracking table in the DB (referrer user ID → promo code) and a server-side lookup at checkout time. Defer to a future release.

---

## Implementation Steps & Dependencies

### Phase 1 — Email infrastructure
**No dependencies**

1. Register `scanflip.online` with Resend (DNS records: SPF, DKIM, DMARC)
2. Create a Resend account and obtain `RESEND_API_KEY`
3. Create a shared email utility module (`api-server/src/lib/email.ts`) with stubbed functions:
   - `sendWelcomeEmail(to, firstName)` — triggered on new user creation
   - `sendReferralEmail(from, to, senderName, personalMessage)` — triggered from `/api/referral/send`
   - Stubs log to console and return `{ ok: true }` until Resend is live

**Test cases (to be wired to real sends once Resend is configured):**
- Welcome email sends to correct address with correct first name
- Welcome email contains trial messaging ("7-day free trial")
- Referral email sends to friend's address with sender's name in body
- Referral email contains the correct sign-up link
- Referral endpoint is rate-limited (max 10/day per user)
- Sending to an invalid email address returns a graceful error (no 500)
- Sending a referral while logged out returns 401

---

### Phase 2 — Database schema
**Depends on: nothing (can run in parallel with Phase 1)**

Add to the Drizzle schema and run migration:

```sql
-- Subscription status per user
CREATE TABLE subscriptions (
  id                     SERIAL PRIMARY KEY,
  user_id                TEXT NOT NULL UNIQUE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'free', -- 'free' | 'trialing' | 'active' | 'canceled'
  trial_end              TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily scan counter (free tier enforcement)
CREATE TABLE scan_usage (
  user_id   TEXT NOT NULL,
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, scan_date)
);
```

---

### Phase 3 — Stripe configuration
**Depends on: nothing (can run in parallel with Phases 1 & 2)**

1. Create two products in the Stripe dashboard:
   - **Scan Flip Pro (Monthly)** — $7.99/month, `trial_period_days: 7`
   - **Scan Flip Pro (Annual)** — $74.99/year, `trial_period_days: 7`
2. Note both Price IDs
3. Enable **Stripe Customer Portal** (allow plan changes and cancellations)
4. Configure webhook endpoint: `https://scanflip.online/api/webhooks/stripe`
5. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

#### Required secrets

| Secret | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Server-side API calls |
| `STRIPE_WEBHOOK_SECRET` | Verify incoming webhook signatures |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Monthly checkout session |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Annual checkout session |
| `RESEND_API_KEY` | Transactional email (Resend) |

---

### Phase 4 — API server
**Depends on: Phase 2 (schema), Phase 3 (Stripe secrets)**

#### New routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/billing/checkout` | Create a Stripe Checkout session (with 7-day trial) and return the URL |
| `POST` | `/api/billing/portal` | Create a Stripe Customer Portal session |
| `GET` | `/api/billing/status` | Return current user's subscription status + trial end date |
| `POST` | `/api/webhooks/stripe` | Handle Stripe lifecycle events |
| `POST` | `/api/referral/send` | Send a referral email (stubbed until Resend is live) |

#### Enforcement middleware on `POST /api/scan`

1. Resolve Clerk `userId` from session
2. Look up `subscriptions` row
3. If `status` is `trialing` or `active` → proceed
4. Otherwise (free / canceled):
   - Check `scan_usage` for today's count
   - If `count >= 5` → return `429` `{ error: "Daily scan limit reached", upgradeUrl: "/upgrade" }`
   - Else → increment count and proceed

#### Enforcement on `POST /api/saved-items`

If `status` is not `trialing` or `active` → return `403` `{ error: "Pro feature", upgradeUrl: "/upgrade" }`

#### Webhook handler logic

```
stripe event received
├── checkout.session.completed
│   └── upsert subscriptions: status from session (trialing/active), store IDs, set trial_end
├── customer.subscription.updated
│   ├── status=trialing  → mark trialing, update trial_end
│   ├── status=active    → mark active, update current_period_end
│   └── status=canceled  → mark canceled
├── customer.subscription.deleted
│   └── mark status='canceled', clear stripe_subscription_id
└── invoice.payment_failed
    └── log event; Stripe retries automatically — no access restriction applied
        (user sees "payment issue" banner via /api/billing/status returning a payment_warning flag)
```

#### New user hook

On first sign-in (user not yet in `subscriptions` table) → insert a row with `status='free'` and call `sendWelcomeEmail()` (stubbed)

---

### Phase 5 — Frontend
**Depends on: Phase 4 (API routes)**

#### New `/pricing` page *(public — no login required)*
- Free vs Pro feature table
- Trial badge: *"Try Pro free for 7 days"*
- **"Get Started Free"** → `/sign-up`
- **"Start Free Trial"** → `/sign-up` then checkout
- Monthly / Annual toggle
- Linked from home screen with a **"Pricing"** button (visible before login)

#### New `/upgrade` page *(logged-in)*
- Free vs Pro comparison
- Trial countdown if user is currently `trialing`
- **"Start Free Trial — $7.99/month after 7 days"** → `POST /api/billing/checkout`
- Annual toggle
- Success redirect: `/upgrade?success=true` → confirmation → `/scan`

#### New `/refer` page *(logged-in)*
- Friend's email input + optional personal message
- Submit → `POST /api/referral/send`
- Success message on send
- Rate-limit messaging if 10/day cap is reached

#### Logout button
- Located in the account/settings menu (accessible from the scan screen header)
- Calls `useClerk().signOut()` → redirects to `/`

#### Sign-up page
- Add trial messaging as a subtitle or badge near the CTA: *"7 days free, then $7.99/month — cancel anytime"*

#### Scan limit UI (free users)
- Counter below scan button: *"3 of 5 free scans used today"*
- On limit: full-screen upgrade prompt with trial CTA

#### Save button gate
- Free/canceled users tapping Save → bottom sheet: *"Save items with Scan Flip Pro — try free for 7 days"* + upgrade button

#### Payment warning banner
- Shown when `billing/status` returns `payment_warning: true` (invoice failed, Stripe retrying)
- *"We couldn't process your payment — please update your card to keep Pro access"* with link to billing portal

#### Account / settings menu
- Current plan + trial end date (if trialing)
- **"Manage Subscription"** → `POST /api/billing/portal`
- **"Refer a Friend"** → `/refer`
- **"Sign Out"** → Clerk `signOut()`

---

## Rollout Sequence

| Step | Task | Depends on |
|---|---|---|
| 1 | Set up Resend domain (DNS) + obtain API key | — |
| 2 | Create Stripe products, prices, portal, webhook | — |
| 3 | Run DB schema migration (subscriptions + scan_usage) | — |
| 4 | Build email utility module (stubbed) | Step 1 secrets available |
| 5 | Build `/api/billing/*` routes + webhook handler | Steps 2, 3 |
| 6 | Build `/api/referral/send` (stubbed email) | Step 4 |
| 7 | Add enforcement middleware to scan + saved-items routes | Step 5 |
| 8 | Build `/pricing` page (public) | — |
| 9 | Build `/upgrade` page + trial messaging | Step 5 |
| 10 | Build `/refer` page | Step 6 |
| 11 | Add logout button, scan limit UI, save gate, payment banner, account menu | Steps 7, 9 |
| 12 | Wire welcome email stub to new-user hook | Step 4 |
| 13 | End-to-end test (Stripe test mode): trial start, conversion, cancel, failed payment, referral | Steps 1–12 |
| 14 | Configure real Resend sends (replace stubs) | Step 1 DNS verified |
| 15 | Deploy to production + announce | Step 13 passes |

---

## Open Questions

- Once Resend DNS is verified, confirm the **from address** to use (e.g. `hello@scanflip.online`, `noreply@scanflip.online`)
- Should the referral incentive (Stripe Coupon approach described above) be scoped as a fast-follow after launch?
