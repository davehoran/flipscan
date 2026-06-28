# FlipScan

A mobile-first web app for eBay resellers. Point your phone camera at any item, and FlipScan identifies it with AI vision, pulls live eBay pricing intelligence, and tells you whether it's worth the flip — in seconds.

![FlipScan results screen showing Polaroid OneStep 2 with active/sold pricing and 87% sell-through rate](.github/preview.png)

---

## Features

- **AI item identification** — submits a photo to GPT-4o Vision, returns item name, category, and confidence score
- **Live eBay pricing** — active listing stats (avg, low, high, count) and 90-day sold comps via eBay Browse API
- **Sell-through rate** — calculated percentage with Hot / Moderate / Slow label
- **Flip analysis** — buy-below price, suggested list range, and estimated profit
- **Saved items** — per-user scan history with full pricing data persisted to PostgreSQL
- **Portfolio stats** — total scans, total estimated profit, hot-item count, average sell-through
- **Demo mode** — try the full results flow without a camera or eBay API call
- **Clerk authentication** — email/password sign-up, sign-in, and forgot-password flows

---

## Architecture

```
┌─────────────────────────────────────┐
│        Shared Reverse Proxy         │
│  routes / → flipscan (React+Vite)   │
│  routes /api → api-server (Express) │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
  ┌────▼─────┐   ┌──────▼──────┐
  │ flipscan │   │  api-server │
  │ :PORT    │   │  :PORT      │
  └──────────┘   └──────┬──────┘
                        │
              ┌─────────┼──────────┐
              │         │          │
         ┌────▼───┐ ┌───▼───┐ ┌───▼────┐
         │  Clerk │ │  GPT  │ │  eBay  │
         │  Auth  │ │  4o   │ │  API   │
         └────────┘ └───────┘ └────────┘
                        │
                  ┌─────▼──────┐
                  │ PostgreSQL │
                  └────────────┘
```

This is a **pnpm monorepo** with three artifacts and four shared libraries. A global reverse proxy routes traffic by path — no Vite proxy configuration is needed.

---

## Monorepo Structure

```
/
├── artifacts/
│   ├── flipscan/          # React + Vite frontend (path: /)
│   └── api-server/        # Express 5 REST API (path: /api)
├── lib/
│   ├── api-spec/          # OpenAPI 3.1 source of truth
│   ├── api-client-react/  # Generated TanStack Query hooks + fetch client
│   ├── api-zod/           # Generated Zod validation schemas
│   └── db/                # Drizzle ORM schema + PostgreSQL client
└── pnpm-workspace.yaml
```

---

## Tech Stack

### Frontend (`artifacts/flipscan`)

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Routing | Wouter 3 |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI (full suite) |
| Component library | shadcn/ui |
| Data fetching | TanStack Query v5 |
| Authentication | Clerk (`@clerk/react` v6) |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Font | Inter |

### Backend (`artifacts/api-server`)

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| Framework | Express 5 |
| Authentication | `@clerk/express` middleware |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL |
| Logging | Pino + pino-http |
| Build | esbuild |

### Shared Libraries

| Package | Purpose |
|---|---|
| `@workspace/api-spec` | OpenAPI 3.1 spec (`openapi.yaml`) — single source of truth for all types |
| `@workspace/api-client-react` | Orval-generated TanStack Query hooks and typed fetch client |
| `@workspace/api-zod` | Orval-generated Zod schemas for runtime validation |
| `@workspace/db` | Drizzle schema, migrations, and PostgreSQL connection |

### External Services

| Service | Usage |
|---|---|
| OpenAI GPT-4o Vision | Item identification from photo |
| eBay Browse API | Active listings and sold comps |
| Clerk | User auth, session management |

---

## API Reference

Base path: `/api`

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Returns `{ status: "ok" }` |

### Scan

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/scan` | — | Submit a base64 photo, get pricing intelligence back |

**Request body:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response (`200`):**
```json
{
  "name": "Polaroid OneStep 2 Instant Camera",
  "category": "Cameras & Photo",
  "confidence": 94,
  "searchTerm": "Polaroid OneStep 2",
  "active": { "avg": 78, "low": 45, "high": 129, "count": 47 },
  "sold": { "avg": 68, "low": 35, "high": 115, "count": 312, "isEstimated": false },
  "sellThrough": { "rate": 87, "label": "Hot" },
  "flip": { "buyBelow": 40, "listLow": 65, "listHigh": 90, "estProfit": 32 },
  "ebayUrl": "https://www.ebay.com/sch/..."
}
```

**Error responses:**
- `422` — item could not be identified from the photo
- `502` — upstream AI or eBay outage

### Saved Items (all routes require auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/saved-items` | List the signed-in user's saved scans |
| `POST` | `/saved-items` | Save a scan result |
| `GET` | `/saved-items/:id` | Get a single saved item |
| `DELETE` | `/saved-items/:id` | Delete a saved item |
| `GET` | `/stats` | Summary stats (total saved, total est. profit, hot count, avg sell-through) |

---

## Database Schema

```sql
CREATE TABLE saved_items (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT      NOT NULL,          -- Clerk user ID
  name          TEXT      NOT NULL,
  category      TEXT      NOT NULL,
  confidence    INTEGER   NOT NULL,
  search_term   TEXT      NOT NULL,
  image_url     TEXT,                        -- optional base64 data-URL thumbnail
  active        JSONB     NOT NULL,          -- PriceStats
  sold          JSONB     NOT NULL,          -- SoldStats (includes isEstimated flag)
  sell_through  JSONB     NOT NULL,          -- { rate, label }
  flip          JSONB     NOT NULL,          -- { buyBelow, listLow, listHigh, estProfit }
  ebay_url      TEXT      NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

JSONB column types are fully typed end-to-end via Drizzle's `.$type<T>()` and the shared OpenAPI schema.

---

## Environment Variables

### API Server

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret |
| `OPENAI_API_KEY` | Yes | Used for GPT-4o Vision item identification |
| `EBAY_CLIENT_ID` | Yes | eBay application client ID |
| `EBAY_CLIENT_SECRET` | Yes | eBay application client secret |
| `EBAY_ENV` | No | `sandbox` or `production` (defaults to `production`) |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated allowed origins (defaults to `REPLIT_DEV_DOMAIN`) |
| `PORT` | No | Server port (assigned automatically in Replit) |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `VITE_CLERK_PROXY_URL` | No | Clerk proxy URL (set automatically in Replit) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database
- Clerk account (for auth)
- OpenAI API key
- eBay Developer account

### Install

```bash
pnpm install
```

### Database setup

```bash
pnpm --filter @workspace/db run push
```

### Run in development

The frontend and API server are separate processes. Start both:

```bash
# API server (port assigned via $PORT, defaults to 8080)
pnpm --filter @workspace/api-server run dev

# Frontend (port assigned via $PORT)
pnpm --filter @workspace/flipscan run dev
```

Or use the Replit workflow runner — it starts both services and the reverse proxy automatically.

### Codegen (after editing the OpenAPI spec)

The TanStack Query hooks and Zod schemas are generated from `lib/api-spec/openapi.yaml`. After any spec change, regenerate:

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Typecheck

```bash
pnpm run typecheck
```

### Build for production

```bash
pnpm run build
```

---

## eBay API Notes

FlipScan uses eBay's **Browse API** with OAuth client credentials flow (app-level token, no user OAuth required). The token is cached in memory and automatically refreshed on 401/403.

- **Active listings** — `item_summary/search` with `buying_options=FIXED_PRICE`
- **Sold comps** — `item_summary/search` with `filter=buyingOptions:{FIXED_PRICE},soldItems:true` (last 90 days)
- **Sell-through rate** — `sold.count / (active.count + sold.count)`

> **Note:** Set `EBAY_ENV=sandbox` to run against eBay's sandbox environment. Sandbox returns test data — prices will not reflect real market values. Switch to `EBAY_ENV=production` with production credentials for live data.

---

## CORS

The API server restricts cross-origin requests to an explicit allowlist. Configure via the `CORS_ALLOWED_ORIGINS` environment variable (comma-separated list of origins). In Replit deployments, `REPLIT_DEV_DOMAIN` is automatically included.

---

## License

MIT
