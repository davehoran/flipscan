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
- At trial end, Stripe automatically charges the card on file and activates the **Pro Monthly subscription ($7.99/month)**. Users who want the annual plan must select it explicitly on the upgrade page; the trial always converts to monthly by default
- If no payment method is on file when the trial ends, Stripe fires `customer.subscription.deleted` and the user's status is set to `expired` — meaning their trial ran out without converting
- Trial messaging appears on:
  - The **pricing page** (pre-login): *"Try Pro free for 7 days — no credit card required"*
  - The **sign-up page**: subtitle or badge near the CTA
  - The **welcome/intro email** sent to every new user on account creation
  - The **upgrade page** (logged-in): countdown to trial end if user is currently in trial

### Subscription status values

All five statuses are stored in the `subscriptions` table and kept distinct for reporting purposes:

| Status | Meaning | How it's set | Access |
|---|---|---|---|
| `free` | Default — never started a trial or subscription | Row inserted on first sign-in | Free tier limits |
| `trialing` | Within the 7-day free trial | `checkout.session.completed` with trial | Full Pro access |
| `active` | Paid subscription in good standing, auto-billed by Stripe | `customer.subscription.updated` → active | Full Pro access |
| `expired` | Free trial ended with no payment method on file | `customer.subscription.deleted` where prior status was `trialing` | Free tier limits |
| `canceled` | Active subscription explicitly canceled by the user, **or** Stripe exhausted all payment retries on a paid subscription | `customer.subscription.deleted` where prior status was `active` | Free tier limits |

> **Why keep `expired` and `canceled` separate?** They represent different user behaviours and different points of churn. `expired` = a free user who never converted. `canceled` = a paying user who churned. Keeping them separate allows accurate reporting on trial conversion rate vs paid retention rate.

> **Note on payment failures:** Stripe automatically retries a failed charge over several days before giving up. During retries the subscription remains `active` and the user sees a *"Payment issue — please update your card"* banner (driven by a `payment_warning` flag on `/api/billing/status`). If all retries fail, Stripe fires `customer.subscription.deleted` and — because the prior status was `active` — we record `canceled`.

---

## Referral Program

Users can invite friends via the `/refer` page. A one-sided incentive is included at launch: the **referred friend** receives one free month of Pro when they subscribe.

### Referral incentive — Stripe Coupon setup instructions

Follow these steps once in the Stripe dashboard before building the referral feature:

**Step 1 — Create the Coupon**
1. Go to **Stripe Dashboard → Product catalog → Coupons → + New**
2. Set the following:
   - **Name:** `Referral — 1 Month Free`
   - **Type:** `Percentage discount`
   - **Percent off:** `100`
   - **Duration:** `Once` (applies to the first billing cycle only)
   - **Redemption limits:** Leave unchecked (promotion codes will control per-code limits)
   - **Applies to:** Leave blank (applies to any subscription)
3. Save and note the **Coupon ID** (e.g. `REFERRAL1MOFREE`)

**Step 2 — Do NOT create promotion codes manually**

Promotion codes are generated programmatically by the server when a user submits a referral, so each referrer gets a unique, trackable code. No manual creation needed.

**Step 3 — Add the Coupon ID as a secret**

| Secret | Value |
|---|---|
| `STRIPE_REFERRAL_COUPON_ID` | The Coupon ID from Step 1 |

### How the referral flow works (implementation)

1. User submits a referral on `/refer` (friend's email + optional message)
2. Server calls `stripe.promotionCodes.create({ coupon: STRIPE_REFERRAL_COUPON_ID, max_redemptions: 1 })` to generate a unique single-use promotion code
3. The promo code and referrer's `user_id` are stored in the `referrals` table (see schema below)
4. A referral email is sent to the friend containing: the sender's name, a personal message (if provided), a sign-up link, and the promo code displayed as a callout: *"Use code XXXX at checkout for your first month free"*
5. When the friend signs up and reaches the upgrade/checkout page, they enter the promo code. Stripe validates and applies the 100%-off discount to their first billing cycle
6. On `checkout.session.completed`, the webhook checks if a promotion code was used and marks the corresponding `referrals` row as `redeemed`

> **No referrer reward at launch.** The referrer gets no direct benefit yet. When ready to add it, use `stripe.customers.createBalanceTransaction({ customer: referrerStripeCustomerId, amount: -799, currency: 'usd', description: 'Referral reward' })` to credit $7.99 against their next invoice. This requires the referrer to already be a Stripe customer (i.e. have an active or canceled subscription).

---

## Implementation Steps & Dependencies

### Phase 1 — Email infrastructure
**No dependencies**

1. Register `scanflip.online` with Resend (add SPF, DKIM, DMARC DNS records)
2. Obtain `RESEND_API_KEY` from the Resend dashboard
3. Create a shared email utility module (`api-server/src/lib/email.ts`) with stubbed functions:
   - `sendWelcomeEmail(to, firstName)` — triggered on new user creation
   - `sendReferralEmail(to, senderName, personalMessage, promoCode, signUpUrl)` — triggered from `/api/referral/send`
   - Stubs log to console and return `{ ok: true }` until Resend is live

**Test cases (written now, wired to real sends once Resend DNS is verified):**
- Welcome email is called with the correct address and first name on first sign-in
- Welcome email body contains trial messaging ("7 days free")
- Referral email is called with the friend's address, sender's name, and a valid promo code
- Referral email body contains the correct sign-up URL and promo code callout
- Referral endpoint returns 429 when the 10/day rate limit is reached
- Referral endpoint returns 401 when called without a valid session
- Sending to a malformed email address returns a 400 (validated server-side, not a 500)

---

### Phase 2 — Database schema
**Depends on: nothing (can run in parallel with Phase 1)**

Add to the Drizzle schema and run a migration:

```sql
-- Subscription status per user
CREATE TABLE subscriptions (
  id                     SERIAL PRIMARY KEY,
  user_id                TEXT NOT NULL UNIQUE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'free',
                         -- 'free' | 'trialing' | 'active' | 'expired' | 'canceled'
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

-- Referral tracking
CREATE TABLE referrals (
  id                    SERIAL PRIMARY KEY,
  referrer_user_id      TEXT NOT NULL,              -- Clerk user ID of the sender
  friend_email          TEXT NOT NULL,
  stripe_promo_code_id  TEXT NOT NULL,              -- Stripe PromotionCode ID
  stripe_promo_code     TEXT NOT NULL,              -- Human-readable code sent to the friend
  redeemed              BOOLEAN NOT NULL DEFAULT FALSE,
  redeemed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Phase 3 — Stripe configuration
**Depends on: nothing (can run in parallel with Phases 1 & 2)**

1. Create two products and prices in the Stripe dashboard:
   - **Scan Flip Pro (Monthly)** — $7.99/month, `trial_period_days: 7`
   - **Scan Flip Pro (Annual)** — $74.99/year, `trial_period_days: 7`
2. Create the referral coupon (see **Referral Program → Stripe Coupon setup instructions** above)
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
| `STRIPE_REFERRAL_COUPON_ID` | Coupon ID used to generate per-referral promo codes |
| `RESEND_API_KEY` | Transactional email (Resend) |

---

### Phase 4 — API server
**Depends on: Phase 2 (schema), Phase 3 (Stripe secrets), Phase 1 (email stub)**

#### New routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/billing/checkout` | Create a Stripe Checkout session (7-day trial, monthly price by default) and return the URL |
| `POST` | `/api/billing/portal` | Create a Stripe Customer Portal session |
| `GET` | `/api/billing/status` | Return current user's status, trial end date, and `payment_warning` flag |
| `POST` | `/api/webhooks/stripe` | Handle Stripe lifecycle events |
| `POST` | `/api/referral/send` | Generate promo code, store referral row, send email (stubbed) |

#### Enforcement middleware on `POST /api/scan`

1. Resolve Clerk `userId` from session
2. Look up `subscriptions` row
3. If `status` is `trialing` or `active` → proceed
4. Otherwise (`free`, `expired`, `canceled`):
   - Check `scan_usage` for today's count
   - If `count >= 5` → return `429` `{ error: "Daily scan limit reached", upgradeUrl: "/upgrade" }`
   - Else → increment count and proceed

#### Enforcement on `POST /api/saved-items`

If `status` is not `trialing` or `active` → return `403` `{ error: "Pro feature", upgradeUrl: "/upgrade" }`

#### Webhook handler logic

```
stripe event received
├── checkout.session.completed
│   └── upsert subscriptions: status='trialing' (or 'active' if no trial),
│       store stripe_customer_id + stripe_subscription_id, set trial_end
│       if promotion_code used → mark matching referrals row as redeemed
│
├── customer.subscription.updated
│   ├── status=trialing → mark 'trialing', update trial_end
│   ├── status=active   → mark 'active', update current_period_end
│   └── (other statuses handled by subscription.deleted below)
│
├── customer.subscription.deleted
│   ├── prior DB status was 'trialing' → mark 'expired'
│   │   (trial ended with no payment method — never converted)
│   └── prior DB status was 'active'  → mark 'canceled'
│       (user canceled, or Stripe exhausted all payment retries)
│
└── invoice.payment_failed
    └── set payment_warning=true on subscriptions row
        Stripe retries automatically; no access restriction applied
        payment_warning cleared when next invoice.payment_succeeded fires
```

#### New user hook

On first sign-in (no existing `subscriptions` row) → insert row with `status='free'`, call `sendWelcomeEmail()` (stubbed)

---

### Phase 5 — Frontend
**Depends on: Phase 4 (API routes)**

#### New `/pricing` page *(public — no login required)*
- Free vs Pro feature table
- Trial badge: *"Try Pro free for 7 days — no credit card required"*
- **"Get Started Free"** → `/sign-up`
- **"Start Free Trial"** → `/sign-up` then checkout (monthly by default)
- Monthly / Annual toggle showing $74.99/year option
- Linked from the home screen with a **"Pricing"** button (visible before login)

#### New `/upgrade` page *(logged-in)*
- Free vs Pro comparison
- Trial countdown if user is currently `trialing`
- **"Start Free Trial — $7.99/month after 7 days"** → `POST /api/billing/checkout`
- Annual toggle → passes annual Price ID to checkout
- `expired` users see: *"Your free trial has ended — subscribe to continue"*
- Success redirect: `/upgrade?success=true` → confirmation → `/scan`

#### New `/refer` page *(logged-in)*
- Friend's email input + optional personal message
- Submit → `POST /api/referral/send`
- Success state shows: *"Invite sent! Your friend will receive a code for one free month of Pro"*
- Rate-limit message shown if 10/day cap is reached

#### Logout button
- Located in the account/settings menu (accessible from the scan screen header)
- Calls `useClerk().signOut()` → redirects to `/`

#### Sign-up page messaging
- Subtitle or badge near the CTA: *"7 days free, then $7.99/month — cancel anytime"*

#### Scan limit UI (free / expired / canceled users)
- Counter below scan button: *"3 of 5 free scans used today"*
- On limit: full-screen upgrade prompt with trial CTA (or subscribe CTA if `expired`/`canceled`)

#### Save button gate
- Restricted users tapping Save → bottom sheet:
  - If `free`: *"Save items with Scan Flip Pro — try free for 7 days"*
  - If `expired` or `canceled`: *"Resubscribe to save items — $7.99/month"*

#### Payment warning banner
- Shown when `billing/status` returns `payment_warning: true`
- *"We couldn't process your payment — please update your card to keep Pro access"* with link to billing portal

#### Account / settings menu
- Current plan + trial end date (if `trialing`)
- **"Manage Subscription"** → `POST /api/billing/portal`
- **"Refer a Friend"** → `/refer`
- **"Sign Out"** → Clerk `signOut()`

---

## Rollout Sequence

| Step | Task | Depends on |
|---|---|---|
| 1 | Set up Resend domain (DNS) + obtain API key | — |
| 2 | Create Stripe products, prices, referral coupon, portal, webhook | — |
| 3 | Run DB schema migration (subscriptions, scan_usage, referrals) | — |
| 4 | Build email utility module (stubbed) | Step 1 secrets available |
| 5 | Build `/api/billing/*` routes + webhook handler | Steps 2, 3 |
| 6 | Build `/api/referral/send` (promo code generation + stubbed email) | Steps 2, 3, 4 |
| 7 | Add enforcement middleware to scan + saved-items routes | Step 5 |
| 8 | Build `/pricing` page (public) | — |
| 9 | Build `/upgrade` page + trial messaging + `expired` state | Step 5 |
| 10 | Build `/refer` page | Step 6 |
| 11 | Add logout button, scan limit UI, save gate, payment banner, account menu | Steps 7, 9 |
| 12 | Wire welcome email stub to new-user hook | Step 4 |
| 13 | End-to-end test (Stripe test mode): trial start → monthly conversion, annual selection, trial expiry (`expired`), user cancel (`canceled`), failed payment retries, referral code generation & redemption | Steps 1–12 |
| 14 | Configure real Resend sends (replace stubs) | Step 1 DNS verified |
| 15 | Deploy to production + announce | Step 13 passes |

---

## Open Questions

- Confirm the **from address** for outbound email once Resend DNS is verified (e.g. `hello@scanflip.online` vs `noreply@scanflip.online`)
- Should `expired` users be shown a re-trial CTA ("Try again free") or go straight to a paid subscribe flow? (Stripe supports a second trial only if manually overridden per customer)
