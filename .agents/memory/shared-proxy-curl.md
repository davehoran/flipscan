---
name: Shared proxy & curl
description: How cross-artifact /api routing works here and how to curl it correctly.
---

# Shared proxy routing for /api

The monorepo uses a global reverse proxy that routes by path using each artifact's
`.replit-artifact/artifact.toml` (`paths = ["/api"]`, `localPort = 8080` for the
api-server). The web app reaches the api-server via **relative URLs** like
`/api/saved-items` — same origin through the proxy.

**Why:** No Vite proxy or custom base URL is needed (and adding one is wrong). The
generated api client leaves `_baseUrl` null so relative paths pass straight
through. Clerk web auth is cookie-based and same-origin, so cookies are sent
without `credentials: "include"`.

**How to apply:**
- For ad hoc checks use the shared proxy: `curl localhost:80/api/healthz` (200),
  `curl localhost:80/api/saved-items` (401 when unauth — correct).
- Do NOT curl `$REPLIT_DEV_DOMAIN/...` — it returns HTTP 000 due to mTLS.
- Never call service ports directly (e.g. `localhost:8080`).
